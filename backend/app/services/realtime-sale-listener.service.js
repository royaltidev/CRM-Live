// Piloto Automático da Loja — orquestração do disparo em tempo real.
//
// Chamada tanto pelo listener de LISTEN/NOTIFY quanto pelo poller de
// segurança (backend/app/jobs/realtime-sale-listener.job.js) — os dois
// caminhos convergem em handleSaleEvent, que é idempotente (ver
// autonomous-offers.service.js § hasAnyOfferForSale e a restrição UNIQUE
// da migration 041).
//
// Reaproveita módulos já existentes em vez de duplicar lógica:
// - complementary-products.service.js para a Etapa 1 (mesmo catálogo do
//   Venda Inteligente, só muda o gatilho)
// - consent.service.js para elegibilidade do cliente (mesma regra usada
//   por message-queue.service.js)
// - integrations/whatsapp para o envio em si
//
// LIMITAÇÃO CONHECIDA: o pacing de envio deste módulo (enqueueWhatsappSend)
// é independente do pacing de message-queue.service.js (campanhas/réguas) —
// os dois competem pela mesma sessão de WhatsApp sem coordenação entre si.
// Para volume baixo (um disparo por venda) o risco é pequeno, mas unificar
// os dois em uma fila só é um refinamento futuro, não resolvido aqui.

const { crmPool } = require('../database/connection');
const uniplusRepository = require('../integrations/uniplus/uniplus.repository');
const complementaryProductsService = require('./complementary-products.service');
const { isCustomerEligibleForMessage } = require('./consent.service');
const whatsapp = require('../integrations/whatsapp');
const autonomousOffersService = require('./autonomous-offers.service');

// ---------------------------------------------------------------------------
// Resolução de venda a partir do evento cru (origin + id)
// ---------------------------------------------------------------------------

async function resolveLocalCustomerIdFromUniplusId(uniplusId) {
  const result = await crmPool.query('SELECT id FROM customers WHERE uniplus_id = $1', [uniplusId]);
  return result.rows.length > 0 ? result.rows[0].id : null;
}

async function resolveLocalSellerFromUniplusId(uniplusId) {
  const result = await crmPool.query(
    'SELECT id, whatsapp_phone, active FROM sellers WHERE uniplus_seller_id = $1',
    [uniplusId]
  );
  if (result.rows.length === 0 || !result.rows[0].active || !result.rows[0].whatsapp_phone) {
    return null;
  }
  return { id: result.rows[0].id, whatsappPhone: result.rows[0].whatsapp_phone };
}

async function resolveLocalProductIds(uniplusProductIds) {
  const ids = uniplusProductIds.filter((id) => id !== null && id !== undefined).map((id) => String(id));
  if (ids.length === 0) {
    return [];
  }
  const result = await crmPool.query('SELECT id FROM products WHERE uniplus_id = ANY($1::text[])', [ids]);
  return result.rows.map((row) => row.id);
}

// `operacao.cliente`/`item.vendedor` vêm como CÓDIGO de entidade (varchar),
// diferente de `dav.idcliente`/`dav.idrepresentante`, que já são id direto —
// ver docs/uniplus-schema/05-mapeamento-sincronizacao.md.
async function resolveCustomerIdFromCodigo(codigo) {
  if (!codigo) {
    return null;
  }
  const entidade = await uniplusRepository.fetchEntidadeByCodigo(codigo);
  return entidade ? resolveLocalCustomerIdFromUniplusId(String(entidade.id)) : null;
}

async function resolveSellerFromCodigo(codigo) {
  if (!codigo) {
    return null;
  }
  const entidade = await uniplusRepository.fetchEntidadeByCodigo(codigo);
  return entidade ? resolveLocalSellerFromUniplusId(String(entidade.id)) : null;
}

// Revalida as mesmas condições da trigger (ver 04-colunas-confirmadas.md §
// operacao) — o estado pode ter mudado entre o disparo do evento e este
// processamento (ex.: venda cancelada logo em seguida).
function isConfirmedOperacaoSale(operacao) {
  return (
    Number(operacao.tipo) > 0 &&
    String(operacao.modelonfce) === '65' &&
    Number(operacao.cancelado || 0) === 0 &&
    Number(operacao.vendaabortada || 0) === 0 &&
    Number(operacao.erroprocessamento || 0) === 0 &&
    Boolean(operacao.chaveacessonfce)
  );
}

function isStructurallyValidDav(dav) {
  return dav.idcliente !== null && dav.datacancelamento === null && dav.idnotafiscal === null;
}

async function resolveOperacaoSale(originId) {
  const operacao = await uniplusRepository.fetchOperacaoNfceById(originId);
  if (!operacao || !isConfirmedOperacaoSale(operacao)) {
    return null;
  }

  const customerId = await resolveCustomerIdFromCodigo(operacao.cliente);
  const seller = await resolveSellerFromCodigo(operacao.vendedor);

  const itens = await uniplusRepository.fetchItensOperacaoNfce([originId]);
  const productIds = await resolveLocalProductIds(
    itens.filter((item) => Number(item.cancelado || 0) === 0).map((item) => item.idproduto)
  );

  return {
    saleUniplusId: `nfce-${originId}`,
    customerId,
    sellerId: seller ? seller.id : null,
    sellerPhone: seller ? seller.whatsappPhone : null,
    itemProductIds: productIds,
  };
}

async function resolveDavSale(originId) {
  const dav = await uniplusRepository.fetchDavById(originId);
  if (!dav || !isStructurallyValidDav(dav)) {
    return null;
  }

  const customerId = await resolveLocalCustomerIdFromUniplusId(String(dav.idcliente));
  const seller = dav.idrepresentante ? await resolveLocalSellerFromUniplusId(String(dav.idrepresentante)) : null;

  const itens = await uniplusRepository.fetchItensDav([originId]);
  const productIds = await resolveLocalProductIds(
    itens.filter((item) => Number(item.cancelado || 0) === 0).map((item) => item.idproduto)
  );

  return {
    saleUniplusId: `dav-${originId}`,
    customerId,
    sellerId: seller ? seller.id : null,
    sellerPhone: seller ? seller.whatsappPhone : null,
    itemProductIds: productIds,
  };
}

// ---------------------------------------------------------------------------
// Candidatos da cascata
// ---------------------------------------------------------------------------

// Etapa 1 — mesmo catálogo do Venda Inteligente (complementary_products),
// só muda o gatilho (tempo real em vez de sync de 15 min).
async function pickEtapa1Candidate(itemProductIds) {
  for (const productId of itemProductIds) {
    const complements = await complementaryProductsService.getActiveComplementsForProduct(productId);
    if (complements.length > 0) {
      const chosen = complements[0];
      return {
        productId: chosen.complementaryProductId,
        productName: chosen.complementaryProductName,
        reason: `complemento cadastrado de "${chosen.productName}"`,
      };
    }
  }
  return null;
}

// Etapa 2 — categoria que o cliente já comprou antes (histórico local),
// cruzada com produtos dessa(s) categoria(s) cujo estoque cresceu nas
// últimas 48h (stock_snapshots é histórico — nunca upsert, ver
// sync.service.js § syncStockSnapshots), que o cliente nunca comprou.
async function pickEtapa2Candidate(customerId) {
  if (!customerId) {
    return null;
  }

  const result = await crmPool.query(
    `
    WITH categorias_do_cliente AS (
      SELECT DISTINCT p.category
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      JOIN products p ON p.id = si.product_id
      WHERE s.customer_id = $1 AND p.category IS NOT NULL
    ),
    produtos_ja_comprados AS (
      SELECT DISTINCT si.product_id
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      WHERE s.customer_id = $1
    ),
    snapshot_recente AS (
      SELECT DISTINCT ON (product_id) product_id, quantity
      FROM stock_snapshots
      ORDER BY product_id, synced_at DESC
    ),
    snapshot_passado AS (
      SELECT DISTINCT ON (product_id) product_id, quantity
      FROM stock_snapshots
      WHERE synced_at <= NOW() - INTERVAL '48 hours'
      ORDER BY product_id, synced_at DESC
    )
    SELECT p.id, p.name,
           sr.quantity AS estoque_atual,
           COALESCE(sp.quantity, 0) AS estoque_48h_atras
      FROM products p
      JOIN categorias_do_cliente cc ON cc.category = p.category
      JOIN snapshot_recente sr ON sr.product_id = p.id
      LEFT JOIN snapshot_passado sp ON sp.product_id = p.id
     WHERE p.id NOT IN (SELECT product_id FROM produtos_ja_comprados)
       AND sr.quantity > COALESCE(sp.quantity, 0)
     ORDER BY (sr.quantity - COALESCE(sp.quantity, 0)) DESC
     LIMIT 1
    `,
    [customerId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    productId: row.id,
    productName: row.name,
    reason: `reposição recente (${row.estoque_48h_atras} → ${row.estoque_atual}) em categoria já comprada pelo cliente`,
  };
}

// ---------------------------------------------------------------------------
// Envio — fila com pacing simples, em memória (perdida em restart; ver
// limitação no cabeçalho do arquivo)
// ---------------------------------------------------------------------------

let sendQueueTail = Promise.resolve();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function enqueueWhatsappSend(intervalSeconds, fn) {
  const run = async () => {
    const result = await fn();
    await sleep(intervalSeconds * 1000);
    return result;
  };
  const next = sendQueueTail.then(run, run);
  sendQueueTail = next.catch(() => {});
  return next;
}

// Conteúdo simples por enquanto — evolução natural é passar a usar
// message_templates, como o resto do sistema de mensageria, em vez de
// texto fixo aqui.
function buildEtapa1Message(candidate) {
  return `Aproveite! Temos "${candidate.productName}" combinando com a sua compra de hoje. Responda esta mensagem para saber mais.`;
}

function buildEtapa2Message(candidate) {
  return `Chegou novidade que pode te interessar: "${candidate.productName}" acabou de voltar ao estoque. Dá uma olhada!`;
}

function buildAvisoVendedorMessage(candidates) {
  const lista = candidates.map((c) => `• ${c.productName} (${c.reason})`).join('\n');
  return `Sugestões de cross-sell para a venda que você acabou de registrar:\n${lista}`;
}

async function getCustomerPhone(customerId) {
  const result = await crmPool.query('SELECT phone_e164 FROM customers WHERE id = $1', [customerId]);
  return result.rows.length > 0 ? result.rows[0].phone_e164 : null;
}

async function sendAndLog(offerId, phone, body) {
  if (!phone) {
    await autonomousOffersService.markOfferSkipped(offerId, 'sem telefone cadastrado');
    return;
  }

  const intervalSeconds = await autonomousOffersService.getWhatsappMinIntervalSeconds();
  if (intervalSeconds === null) {
    await autonomousOffersService.markOfferSkipped(
      offerId,
      'pending_configuration: piloto_automatico.whatsapp_min_interval_seconds não definido'
    );
    return;
  }

  try {
    await enqueueWhatsappSend(intervalSeconds, async () => {
      const result = await whatsapp.sendText({ to: phone, body });
      await autonomousOffersService.markOfferSent(offerId, result && result.externalMessageId);
    });
  } catch (err) {
    await autonomousOffersService.markOfferFailed(offerId, err.message);
  }
}

// ---------------------------------------------------------------------------
// Cascata
// ---------------------------------------------------------------------------

async function dispatchEtapa1(origin, originId, sale) {
  const candidate = await pickEtapa1Candidate(sale.itemProductIds);
  if (!candidate) {
    return;
  }

  const customerPhone = await getCustomerPhone(sale.customerId);

  const offerId = await autonomousOffersService.createOffer({
    origin,
    originId,
    saleUniplusId: sale.saleUniplusId,
    customerId: sale.customerId,
    sellerId: sale.sellerId,
    productId: candidate.productId,
    recipientType: 'cliente',
    recipientPhone: customerPhone,
    cascadeStep: 'etapa_1',
    ruleReason: candidate.reason,
  });
  if (!offerId) {
    return; // já processado (UNIQUE da migration 041)
  }

  const eligible = await isCustomerEligibleForMessage(sale.customerId);
  if (!eligible) {
    await autonomousOffersService.markOfferSkipped(offerId, 'no_consent');
    return;
  }

  await sendAndLog(offerId, customerPhone, buildEtapa1Message(candidate));
}

async function dispatchEtapa2(origin, originId, sale) {
  const candidate = await pickEtapa2Candidate(sale.customerId);
  if (!candidate) {
    return;
  }

  const customerPhone = await getCustomerPhone(sale.customerId);

  const offerId = await autonomousOffersService.createOffer({
    origin,
    originId,
    saleUniplusId: sale.saleUniplusId,
    customerId: sale.customerId,
    sellerId: sale.sellerId,
    productId: candidate.productId,
    recipientType: 'cliente',
    recipientPhone: customerPhone,
    cascadeStep: 'etapa_2',
    ruleReason: candidate.reason,
  });
  if (!offerId) {
    return;
  }

  const eligible = await isCustomerEligibleForMessage(sale.customerId);
  if (!eligible) {
    await autonomousOffersService.markOfferSkipped(offerId, 'no_consent');
    return;
  }

  await sendAndLog(offerId, customerPhone, buildEtapa2Message(candidate));
}

async function scheduleEtapa2(origin, originId, sale) {
  const delayMinutes = await autonomousOffersService.getEtapa2DelayMinutes();
  if (delayMinutes === null) {
    return; // pending_configuration — etapa 2 fica pausada
  }

  setTimeout(() => {
    dispatchEtapa2(origin, originId, sale).catch((err) => {
      console.error('[realtime-sale-listener] Falha na Etapa 2:', err.message);
    });
  }, delayMinutes * 60 * 1000);
}

// Aviso ao vendedor — dispara junto com a Etapa 1 (não espera a Etapa 2),
// com a lista combinada dos dois candidatos, quando existirem. Sem checagem
// de consentimento (comunicação interna, não marketing a cliente).
async function dispatchAvisoVendedor(origin, originId, sale) {
  const [etapa1, etapa2] = await Promise.all([
    pickEtapa1Candidate(sale.itemProductIds),
    pickEtapa2Candidate(sale.customerId),
  ]);
  const candidates = [etapa1, etapa2].filter(Boolean);
  if (candidates.length === 0) {
    return;
  }

  const offerId = await autonomousOffersService.createOffer({
    origin,
    originId,
    saleUniplusId: sale.saleUniplusId,
    customerId: sale.customerId,
    sellerId: sale.sellerId,
    productId: candidates[0].productId,
    recipientType: 'vendedor',
    recipientPhone: sale.sellerPhone,
    cascadeStep: 'aviso_vendedor',
    ruleReason: candidates.map((c) => c.reason).join(' | '),
  });
  if (!offerId) {
    return;
  }

  await sendAndLog(offerId, sale.sellerPhone, buildAvisoVendedorMessage(candidates));
}

// ---------------------------------------------------------------------------
// Ponto de entrada — chamado pelo listener (LISTEN) e pelo poller de
// segurança, com o mesmo formato de payload das triggers do Uniplus.
// ---------------------------------------------------------------------------

async function handleSaleEvent({ origin, id, tipodocumento }) {
  if (origin !== 'operacao' && origin !== 'dav') {
    return;
  }

  const originId = Number(id);
  if (!Number.isFinite(originId)) {
    return;
  }

  const alreadyProcessed = await autonomousOffersService.hasAnyOfferForSale(origin, originId);
  if (alreadyProcessed) {
    return;
  }

  if (origin === 'dav') {
    const allowedTypes = await autonomousOffersService.getDavSaleTypeCodes();
    if (!allowedTypes || !allowedTypes.includes(Number(tipodocumento))) {
      // Lista não configurada, ou este tipodocumento não está nela: não é
      // tratado como venda por este motor. Sem log — nada foi decidido.
      return;
    }
  }

  const sale = origin === 'operacao' ? await resolveOperacaoSale(originId) : await resolveDavSale(originId);
  if (!sale) {
    return;
  }

  if (sale.customerId && sale.itemProductIds.length > 0) {
    await dispatchEtapa1(origin, originId, sale);
    await scheduleEtapa2(origin, originId, sale);
  }

  if (sale.sellerId && sale.sellerPhone) {
    await dispatchAvisoVendedor(origin, originId, sale);
  }
}

module.exports = {
  handleSaleEvent,
};
