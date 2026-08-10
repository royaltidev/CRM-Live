// Serviço de sincronização somente-leitura com o ERP Uniplus (Fase 4).
//
// Orquestra a importação de clientes, vendedores, produtos, estoque e vendas
// do Uniplus para as tabelas-espelho do CRM Live, registrando cada execução em
// `sync_runs` (migration 027).
//
// Fonte de verdade do mapeamento: docs/uniplus-schema/05-mapeamento-sincronizacao.md
// (com apoio de 02-regras-negocio-uniplus.md e 04-colunas-confirmadas.md).
// Fluxo funcional esperado: docs/FSD.md, seções 6.9 e 13.10.
//
// Princípios de implementação:
// - NUNCA escreve no Uniplus. Todo acesso à origem passa por
//   `uniplus.repository.js`, que só faz SELECT.
// - Cada etapa roda em seu próprio try/catch: uma etapa que falha não aborta
//   as demais (é isso que permite o status `partial_error`).
// - Uma execução por vez: `runSync` devolve a Promise da execução em
//   andamento em vez de iniciar uma segunda.
// - Nunca lança para o chamador em condições previsíveis (falha de conexão com
//   o Uniplus, erro de uma etapa): o resultado vem no registro de `sync_runs`.
//
// Formato de `sync_runs.errors` (JSONB) adotado aqui — array de objetos:
//   [{ "step": "customers", "severity": "error"|"warning", "message": "..." }]
// Só entradas com `severity: "error"` influenciam o status final; `warning` é
// usado para condições não fatais (ex.: sessão do WhatsApp fora do ar).
//
// Formato de `sync_runs.records_imported` (JSONB): objeto de contadores
// simples por entidade, ex.:
//   { "customers": 12, "sellers": 3, "products": 45, "stock_snapshots": 45,
//     "sales": 30, "sale_items": 88, "sales_new": 4, "whatsapp_validated": 2 }

const { crmPool } = require('../database/connection');
const settings = require('../config/settings');
const uniplusRepository = require('../integrations/uniplus/uniplus.repository');
const rfmService = require('./rfm.service');
const automationTriggerService = require('./automation-trigger.service');

// Número de linhas por statement nos INSERTs em lote. Mantém a contagem de
// parâmetros bem abaixo do limite de 65535 do protocolo do Postgres.
const CHUNK_SIZE = 500;

// Teto de validações de WhatsApp por execução do job. Cada validação é uma
// chamada de rede ao WhatsApp Web; sem teto, a primeira sincronização de uma
// base com milhares de clientes deixaria o job rodando por horas. Os clientes
// que sobrarem são validados nas execuções seguintes (a validação só é tentada
// para quem ainda não está validado).
const MAX_WHATSAPP_VALIDATIONS_PER_RUN = 200;

// Valor de `entidade.tipopessoa` que representa PESSOA JURÍDICA.
// NÃO CONFIRMADO no ambiente real (ver 05-mapeamento-sincronizacao.md,
// § "customers ← entidade"). Enquanto for `null`, o nome do cliente usa sempre
// `entidade.nome` — o fallback explicitamente indicado como seguro no
// documento. Assim que o valor real for confirmado em produção, basta trocar
// esta constante para ativar o uso de `razaosocial` para pessoa jurídica.
const TIPOPESSOA_PESSOA_JURIDICA = null;

// Promise da execução em andamento (null quando não há nenhuma).
let currentRunPromise = null;

// ---------------------------------------------------------------------------
// Helpers puros
// ---------------------------------------------------------------------------

// Convenção de flags do Uniplus (05-mapeamento-sincronizacao.md, § "Convenção
// de flags no Uniplus"): flags são `smallint`; `0` = falso, `<> 0` = verdadeiro.
// SUPOSIÇÃO ainda não validada contra dados reais.
function isFlagTrue(value) {
  if (value === null || value === undefined) {
    return false;
  }
  return Number(value) !== 0;
}

function trimOrNull(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const text = String(value).trim();
  return text === '' ? null : text;
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

// `sale_items.quantity` e `stock_snapshots.quantity` são INTEGER no CRM Live,
// mas `numeric` no Uniplus (produtos fracionados existem). Arredondamos, já
// que o modelo de dados do CRM Live (FSD §11.2) não prevê quantidade fracionada.
function toIntegerOrNull(value) {
  const num = toNumberOrNull(value);
  return num === null ? null : Math.round(num);
}

// Normaliza um telefone brasileiro para E.164 (+55DDNNNNNNNNN).
// Regras: remove tudo que não for dígito; assume DDI 55 quando ausente.
// Devolve null quando não dá para inferir um número completo com DDD — é
// melhor não validar do que gravar um número errado em `phone_e164`.
function normalizeBrazilianPhoneToE164(raw) {
  const digits = String(raw === null || raw === undefined ? '' : raw).replace(/\D/g, '');

  if (digits === '') {
    return null;
  }

  // Já vem com DDI 55: 55 + DDD(2) + número(8 ou 9).
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return `+${digits}`;
  }

  // Sem DDI: DDD(2) + número(8 ou 9).
  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }

  // Qualquer outro comprimento (ramal, número sem DDD, lixo de digitação)
  // não é confiável o bastante para virar um contato de WhatsApp.
  return null;
}

// Nome do cliente/vendedor a partir de `entidade`.
// 05-mapeamento-sincronizacao.md: `razaosocial` quando `tipopessoa` indicar
// pessoa jurídica E `razaosocial` estiver preenchido; senão `nome`.
// `customers.name` / `sellers.name` são NOT NULL, daí o fallback final.
function resolveEntidadeName(row) {
  const nome = trimOrNull(row.nome);
  const razaoSocial = trimOrNull(row.razaosocial);

  if (
    TIPOPESSOA_PESSOA_JURIDICA !== null &&
    Number(row.tipopessoa) === Number(TIPOPESSOA_PESSOA_JURIDICA) &&
    razaoSocial
  ) {
    return razaoSocial;
  }

  return nome || razaoSocial || `Entidade Uniplus ${row.id}`;
}

// Remove duplicatas por chave, mantendo a última ocorrência. Necessário antes
// de um INSERT ... ON CONFLICT DO UPDATE em lote: o Postgres recusa afetar a
// mesma linha duas vezes no mesmo comando.
function dedupeBy(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    map.set(keyFn(row), row);
  }
  return Array.from(map.values());
}

function chunk(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

// ---------------------------------------------------------------------------
// Helpers de escrita no CRM Live
// ---------------------------------------------------------------------------

// INSERT ... ON CONFLICT (<conflictColumn>) DO UPDATE em lote.
// Devolve as linhas com `id`, a coluna de conflito e `inserted` (true quando a
// linha foi criada agora — truque padrão do Postgres com `xmax = 0`).
async function bulkUpsert({ table, columns, conflictColumn, updateAssignments, rows }) {
  const results = [];

  for (const rowsChunk of chunk(rows, CHUNK_SIZE)) {
    const params = [];
    const valuesSql = rowsChunk
      .map((row) => {
        const placeholders = columns.map((col) => {
          params.push(row[col]);
          return `$${params.length}`;
        });
        return `(${placeholders.join(', ')})`;
      })
      .join(', ');

    const sql = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES ${valuesSql}
      ON CONFLICT (${conflictColumn}) DO UPDATE SET ${updateAssignments}
      RETURNING id, ${conflictColumn}, (xmax = 0) AS inserted
    `;

    const result = await crmPool.query(sql, params);
    results.push(...result.rows);
  }

  return results;
}

// INSERT em lote sem tratamento de conflito (usado por stock_snapshots e
// sale_items, que são sempre inserções novas).
async function bulkInsert({ table, columns, rows }) {
  let inserted = 0;

  for (const rowsChunk of chunk(rows, CHUNK_SIZE)) {
    const params = [];
    const valuesSql = rowsChunk
      .map((row) => {
        const placeholders = columns.map((col) => {
          params.push(row[col]);
          return `$${params.length}`;
        });
        return `(${placeholders.join(', ')})`;
      })
      .join(', ');

    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${valuesSql}`;
    const result = await crmPool.query(sql, params);
    inserted += result.rowCount;
  }

  return inserted;
}

// ---------------------------------------------------------------------------
// Etapa 2 — customers ← entidade (cliente <> 0)
// ---------------------------------------------------------------------------

async function syncCustomers(context) {
  const clientes = await uniplusRepository.fetchClientes();

  // Guarda os candidatos a telefone para a etapa de validação de WhatsApp,
  // evitando reler `entidade` só por causa disso.
  for (const row of clientes) {
    context.phoneCandidatesByCustomerUniplusId.set(String(row.id), {
      whatsapp: row.whatsapp,
      celular: row.celular,
      telefone: row.telefone,
    });
  }

  const rows = dedupeBy(
    clientes.map((row) => ({
      uniplus_id: String(row.id),
      name: resolveEntidadeName(row),
      document: trimOrNull(row.cnpjcpf),
      email: trimOrNull(row.email),
      birth_date: row.nascimento || null,
    })),
    (row) => row.uniplus_id
  );

  // Não tocamos em phone_e164, whatsapp_validated, rfm_segment, preferences,
  // preferred_channel nem nos agregados de compra: são do CRM Live (ou de
  // etapas posteriores desta própria sincronização), não do Uniplus.
  const upserted = await bulkUpsert({
    table: 'customers',
    columns: ['uniplus_id', 'name', 'document', 'email', 'birth_date'],
    conflictColumn: 'uniplus_id',
    updateAssignments: `
      name = EXCLUDED.name,
      document = EXCLUDED.document,
      email = EXCLUDED.email,
      birth_date = EXCLUDED.birth_date,
      synced_at = NOW(),
      updated_at = NOW()
    `,
    rows,
  });

  for (const row of upserted) {
    context.customerIdByUniplusId.set(String(row.uniplus_id), row.id);
    context.touchedCustomerIds.add(row.id);
  }

  return upserted.length;
}

// ---------------------------------------------------------------------------
// Etapa 3 — sellers ← entidade (representante <> 0)
// ---------------------------------------------------------------------------

async function syncSellers(context) {
  const representantes = await uniplusRepository.fetchRepresentantes();

  for (const row of representantes) {
    context.phoneCandidatesBySellerUniplusId.set(String(row.id), {
      whatsapp: row.whatsapp,
      celular: row.celular,
      telefone: row.telefone,
    });
  }

  // `sellers.uniplus_seller_id` NÃO tem constraint UNIQUE (migration 006 cria
  // apenas um índice comum), e `ON CONFLICT` exige constraint única — por isso
  // aqui é SELECT + INSERT/UPDATE condicional, não upsert.
  const existing = await crmPool.query(
    'SELECT id, uniplus_seller_id FROM sellers WHERE uniplus_seller_id IS NOT NULL'
  );

  const existingIdByUniplusId = new Map(
    existing.rows.map((row) => [String(row.uniplus_seller_id), row.id])
  );

  const seen = new Set();
  let processed = 0;

  for (const row of representantes) {
    const uniplusSellerId = String(row.id);
    if (seen.has(uniplusSellerId)) {
      continue;
    }
    seen.add(uniplusSellerId);

    const name = resolveEntidadeName(row);
    const existingId = existingIdByUniplusId.get(uniplusSellerId);

    if (existingId) {
      // `active` NÃO é sobrescrito: no CRM Live ele é editável na tela de
      // Vendedores (Fase 5) e controla a fila de rodízio — sobrescrever a cada
      // sincronização apagaria a decisão do usuário. `entidade.inativo` só é
      // usado para definir o valor inicial, no INSERT abaixo.
      await crmPool.query('UPDATE sellers SET name = $1, updated_at = NOW() WHERE id = $2', [
        name,
        existingId,
      ]);
      context.sellerIdByUniplusId.set(uniplusSellerId, existingId);
      context.touchedSellerIds.add(existingId);
    } else {
      const inserted = await crmPool.query(
        `INSERT INTO sellers (uniplus_seller_id, name, active, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING id`,
        [uniplusSellerId, name, !isFlagTrue(row.inativo)]
      );
      const newId = inserted.rows[0].id;
      existingIdByUniplusId.set(uniplusSellerId, newId);
      context.sellerIdByUniplusId.set(uniplusSellerId, newId);
      context.touchedSellerIds.add(newId);
    }

    processed += 1;
  }

  return processed;
}

// ---------------------------------------------------------------------------
// Etapa 4 — products ← produto + hierarquia
// ---------------------------------------------------------------------------

async function syncProducts(context) {
  const produtos = await uniplusRepository.fetchProdutos();

  const rows = dedupeBy(
    produtos.map((row) => ({
      uniplus_id: String(row.id),
      name: trimOrNull(row.nome) || `Produto Uniplus ${row.id}`,
      category: trimOrNull(row.categoria_nome),
      price: toNumberOrNull(row.preco),
      // 05-mapeamento-sincronizacao.md: `active` = `produto.inativo = 0`.
      active: !isFlagTrue(row.inativo),
    })),
    (row) => row.uniplus_id
  );

  const upserted = await bulkUpsert({
    table: 'products',
    columns: ['uniplus_id', 'name', 'category', 'price', 'active'],
    conflictColumn: 'uniplus_id',
    updateAssignments: `
      name = EXCLUDED.name,
      category = EXCLUDED.category,
      price = EXCLUDED.price,
      active = EXCLUDED.active,
      synced_at = NOW(),
      updated_at = NOW()
    `,
    rows,
  });

  for (const row of upserted) {
    context.productIdByUniplusId.set(String(row.uniplus_id), row.id);
  }

  return upserted.length;
}

// ---------------------------------------------------------------------------
// Etapa 5 — stock_snapshots ← saldoestoque
// ---------------------------------------------------------------------------

async function syncStockSnapshots(context) {
  const filialId = settings.uniplus && settings.uniplus.filialId;
  const saldos = await uniplusRepository.fetchSaldoEstoque(filialId);

  // `products` pode não ter sido carregado (etapa 4 falhou) — nesse caso,
  // buscamos o mapa direto do banco do CRM Live.
  if (context.productIdByUniplusId.size === 0) {
    const products = await crmPool.query('SELECT id, uniplus_id FROM products');
    for (const row of products.rows) {
      context.productIdByUniplusId.set(String(row.uniplus_id), row.id);
    }
  }

  // Último snapshot conhecido de cada produto, para detectar a transição
  // "estoque zerado -> disponível" (é para isso que existe o índice
  // idx_stock_snapshots_product_synced, migration 010).
  const previous = await crmPool.query(`
    SELECT DISTINCT ON (product_id) product_id, quantity
    FROM stock_snapshots
    ORDER BY product_id, synced_at DESC, id DESC
  `);
  const previousQuantityByProductId = new Map(
    previous.rows.map((row) => [row.product_id, Number(row.quantity)])
  );

  const rows = [];
  const replenishedProductIds = [];

  for (const saldo of saldos) {
    const productId = context.productIdByUniplusId.get(String(saldo.idproduto));
    if (!productId) {
      // Produto de estoque que não existe (ainda) em `products`: ignorado —
      // `stock_snapshots.product_id` é NOT NULL com FK para products.
      continue;
    }

    const quantity = toIntegerOrNull(saldo.quantidade);
    if (quantity === null) {
      continue;
    }

    rows.push({ product_id: productId, quantity });

    const previousQuantity = previousQuantityByProductId.get(productId);
    if (previousQuantity !== undefined && previousQuantity <= 0 && quantity > 0) {
      replenishedProductIds.push(productId);
    }
  }

  // Sempre INSERT: `stock_snapshots` é histórico, nunca upsert.
  const inserted = await bulkInsert({
    table: 'stock_snapshots',
    columns: ['product_id', 'quantity'],
    rows,
  });

  // Hook de automações (FSD §13.10, passo 5) — stub da Fase 7.
  await automationTriggerService.notifyStockReplenished(replenishedProductIds);

  return { inserted, replenished: replenishedProductIds.length };
}

// ---------------------------------------------------------------------------
// Etapa 6 — sales + sale_items (três origens)
// ---------------------------------------------------------------------------

// Garante que os mapas de resolução estejam preenchidos mesmo que as etapas
// 2/3/4 tenham falhado — as vendas ainda podem ser sincronizadas contra o que
// já existe no CRM Live.
async function ensureResolutionMaps(context) {
  if (context.customerIdByUniplusId.size === 0) {
    const result = await crmPool.query('SELECT id, uniplus_id FROM customers');
    for (const row of result.rows) {
      context.customerIdByUniplusId.set(String(row.uniplus_id), row.id);
    }
  }

  if (context.sellerIdByUniplusId.size === 0) {
    const result = await crmPool.query(
      'SELECT id, uniplus_seller_id FROM sellers WHERE uniplus_seller_id IS NOT NULL'
    );
    for (const row of result.rows) {
      context.sellerIdByUniplusId.set(String(row.uniplus_seller_id), row.id);
    }
  }

  if (context.productIdByUniplusId.size === 0) {
    const result = await crmPool.query('SELECT id, uniplus_id FROM products');
    for (const row of result.rows) {
      context.productIdByUniplusId.set(String(row.uniplus_id), row.id);
    }
  }
}

function resolveCustomerId(context, entidadeId) {
  if (entidadeId === null || entidadeId === undefined) {
    return null;
  }
  return context.customerIdByUniplusId.get(String(entidadeId)) || null;
}

function resolveSellerId(context, entidadeId) {
  if (entidadeId === null || entidadeId === undefined) {
    return null;
  }
  return context.sellerIdByUniplusId.get(String(entidadeId)) || null;
}

// Grava as vendas de uma origem e reescreve seus itens.
// Estratégia dos itens: `sale_items` não tem `uniplus_id` próprio (migration
// 008), então ao (re)sincronizar uma venda apagamos todos os itens daquela
// `sale_id` e reinserimos. É idempotente e não duplica.
async function persistSalesBatch({ context, saleRows, itemsBySaleUniplusId }) {
  if (saleRows.length === 0) {
    return { sales: 0, saleItems: 0, newSaleIds: [] };
  }

  const upserted = await bulkUpsert({
    table: 'sales',
    columns: [
      'uniplus_id',
      'customer_id',
      'seller_id',
      'sale_date',
      'total_amount',
      'source_type',
    ],
    conflictColumn: 'uniplus_id',
    updateAssignments: `
      customer_id = EXCLUDED.customer_id,
      seller_id = EXCLUDED.seller_id,
      sale_date = EXCLUDED.sale_date,
      total_amount = EXCLUDED.total_amount,
      source_type = EXCLUDED.source_type,
      synced_at = NOW()
    `,
    rows: dedupeBy(saleRows, (row) => row.uniplus_id),
  });

  const saleIds = [];
  const newSaleIds = [];
  const saleIdByUniplusId = new Map();

  for (const row of upserted) {
    saleIds.push(row.id);
    saleIdByUniplusId.set(String(row.uniplus_id), row.id);
    if (row.inserted) {
      newSaleIds.push(row.id);
    }
  }

  // Marca os clientes atingidos por vendas, para o recálculo de agregados.
  for (const saleRow of saleRows) {
    if (saleRow.customer_id) {
      context.customersTouchedBySales.add(saleRow.customer_id);
    }
  }

  // Reescreve os itens: apaga os existentes das vendas tocadas e reinsere.
  for (const idsChunk of chunk(saleIds, CHUNK_SIZE)) {
    await crmPool.query('DELETE FROM sale_items WHERE sale_id = ANY($1::int[])', [idsChunk]);
  }

  const itemRows = [];
  for (const [saleUniplusId, items] of itemsBySaleUniplusId.entries()) {
    const saleId = saleIdByUniplusId.get(String(saleUniplusId));
    if (!saleId) {
      continue;
    }
    for (const item of items) {
      itemRows.push({
        sale_id: saleId,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      });
    }
  }

  const insertedItems = await bulkInsert({
    table: 'sale_items',
    columns: ['sale_id', 'product_id', 'quantity', 'unit_price'],
    rows: itemRows,
  });

  return { sales: upserted.length, saleItems: insertedItems, newSaleIds };
}

// Agrupa itens por venda, já traduzidos para o formato do CRM Live.
function groupItems(items, { saleKey, productKey, quantityKey, priceKey, skipWhenCancelled }, context) {
  const grouped = new Map();

  for (const item of items) {
    if (skipWhenCancelled && isFlagTrue(item.cancelado)) {
      continue;
    }

    const key = String(item[saleKey]);
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }

    grouped.get(key).push({
      // `sale_items.product_id` é nullable e sem FK (migration 008): um item de
      // produto ainda não sincronizado entra com product_id nulo em vez de
      // derrubar a venda inteira.
      productId: context.productIdByUniplusId.get(String(item[productKey])) || null,
      quantity: toIntegerOrNull(item[quantityKey]),
      unitPrice: toNumberOrNull(item[priceKey]),
    });
  }

  return grouped;
}

async function syncSales(context) {
  await ensureResolutionMaps(context);

  const counts = { sales: 0, saleItems: 0, newSaleIds: [] };

  const accumulate = (result) => {
    counts.sales += result.sales;
    counts.saleItems += result.saleItems;
    counts.newSaleIds.push(...result.newSaleIds);
  };

  // --- Origem 1: notafiscal (âncora) -------------------------------------
  //
  // Notas canceladas já são excluídas em fetchNotasFiscais (WHERE
  // cancelamento IS NULL — decisão de 10/08/2026, ver
  // docs/uniplus-schema/05-mapeamento-sincronizacao.md). A coluna `status`
  // continua sem filtro: seus valores possíveis não foram confirmados contra
  // dados reais.
  const notas = await uniplusRepository.fetchNotasFiscais();
  const notaSaleRows = [];
  const notaIds = [];

  for (const nota of notas) {
    const saleDate = nota.datahoraemissao;
    if (!saleDate) {
      // `sales.sale_date` é NOT NULL — sem data não há venda utilizável.
      context.skippedSales += 1;
      continue;
    }

    notaIds.push(nota.id);
    notaSaleRows.push({
      uniplus_id: `nf-${nota.id}`,
      customer_id: resolveCustomerId(context, nota.identidade),
      seller_id: resolveSellerId(context, nota.idrepresentante),
      sale_date: saleDate,
      total_amount: toNumberOrNull(nota.valortotalnota),
      source_type: 'nota_fiscal',
    });
  }

  const notaItens = await uniplusRepository.fetchItensNotaFiscal(notaIds);
  const notaItensBySale = groupItems(
    notaItens,
    {
      saleKey: 'idnotafiscal',
      productKey: 'idproduto',
      quantityKey: 'quantidade',
      priceKey: 'precounitario',
      // `notafiscalitem` não tem coluna `cancelado` na lista confirmada.
      skipWhenCancelled: false,
    },
    context
  );

  accumulate(
    await persistSalesBatch({
      context,
      saleRows: notaSaleRows,
      itemsBySaleUniplusId: new Map(
        Array.from(notaItensBySale.entries()).map(([id, items]) => [`nf-${id}`, items])
      ),
    })
  );

  // --- Origem 2: dav não faturado ----------------------------------------
  const davs = await uniplusRepository.fetchDavsNaoFaturados();
  const davSaleRows = [];
  const davIds = [];

  for (const dav of davs) {
    // 05-mapeamento-sincronizacao.md: `dav.data`, ou `dav.datainclusao` se
    // `data` vier nula.
    const saleDate = dav.data || dav.datainclusao;
    if (!saleDate) {
      context.skippedSales += 1;
      continue;
    }

    davIds.push(dav.id);
    davSaleRows.push({
      uniplus_id: `dav-${dav.id}`,
      customer_id: resolveCustomerId(context, dav.idcliente),
      seller_id: resolveSellerId(context, dav.idrepresentante),
      sale_date: saleDate,
      total_amount: toNumberOrNull(dav.valor),
      source_type: 'dav',
    });
  }

  const davItens = await uniplusRepository.fetchItensDav(davIds);
  const davItensBySale = groupItems(
    davItens,
    {
      saleKey: 'iddav',
      productKey: 'idproduto',
      quantityKey: 'quantidade',
      priceKey: 'preco',
      // `davitem.cancelado` é flag smallint (05-mapeamento, § "Convenção de
      // flags"): itens cancelados não compõem a venda.
      skipWhenCancelled: true,
    },
    context
  );

  accumulate(
    await persistSalesBatch({
      context,
      saleRows: davSaleRows,
      itemsBySaleUniplusId: new Map(
        Array.from(davItensBySale.entries()).map(([id, items]) => [`dav-${id}`, items])
      ),
    })
  );

  // --- Origem 3: operacao_nfce_view (PDV / balcão) ------------------------
  //
  // Aqui o vínculo com `entidade` é por CÓDIGO (varchar(14)), não por id —
  // ver 05-mapeamento-sincronizacao.md, origem 3.
  const codigoIndex = await uniplusRepository.fetchEntidadeCodigoIndex();
  const entidadeIdByCodigo = new Map(
    codigoIndex
      .filter((row) => trimOrNull(row.codigo) !== null)
      .map((row) => [String(row.codigo).trim(), row.id])
  );

  const operacoes = await uniplusRepository.fetchOperacoesNfce();
  const nfceSaleRows = [];
  const nfceIds = [];

  for (const operacao of operacoes) {
    const saleDate = operacao.data;
    if (!saleDate) {
      context.skippedSales += 1;
      continue;
    }

    const clienteCodigo = trimOrNull(operacao.cliente);
    const vendedorCodigo = trimOrNull(operacao.vendedor);

    // Código vazio = consumidor não identificado: a venda entra sem
    // customer_id (relatório "vendas sem cliente identificado", FSD §12.16).
    const clienteEntidadeId = clienteCodigo ? entidadeIdByCodigo.get(clienteCodigo) : null;
    const vendedorEntidadeId = vendedorCodigo ? entidadeIdByCodigo.get(vendedorCodigo) : null;

    nfceIds.push(operacao.id);
    nfceSaleRows.push({
      uniplus_id: `nfce-${operacao.id}`,
      customer_id: resolveCustomerId(context, clienteEntidadeId),
      seller_id: resolveSellerId(context, vendedorEntidadeId),
      sale_date: saleDate,
      total_amount: toNumberOrNull(operacao.valorliquido),
      source_type: 'pdv_nfce',
    });
  }

  const nfceItens = await uniplusRepository.fetchItensOperacaoNfce(nfceIds);
  const nfceItensBySale = groupItems(
    nfceItens,
    {
      saleKey: 'idoperacao',
      // `idproduto` já vem resolvido de `produto.codigo` pelo repositório.
      productKey: 'idproduto',
      quantityKey: 'quantidade',
      priceKey: 'precounitario',
      // `item.cancelado` é flag smallint (05-mapeamento, § "Convenção de flags").
      skipWhenCancelled: true,
    },
    context
  );

  accumulate(
    await persistSalesBatch({
      context,
      saleRows: nfceSaleRows,
      itemsBySaleUniplusId: new Map(
        Array.from(nfceItensBySale.entries()).map(([id, items]) => [`nfce-${id}`, items])
      ),
    })
  );

  // Hook de automações (FSD §13.10, passo 5) — stub da Fase 7.
  // Só vendas NOVAS: reprocessar uma venda já conhecida não pode disparar
  // régua de agradecimento de novo.
  await automationTriggerService.notifyNewSales(counts.newSaleIds);

  return counts;
}

// ---------------------------------------------------------------------------
// Etapa 7 — validação ativa de WhatsApp
// ---------------------------------------------------------------------------

// Erro sentinela: sessão do WhatsApp fora do ar. Contrato definido em
// 05-mapeamento-sincronizacao.md, § "Validação de WhatsApp".
const WHATSAPP_NOT_CONNECTED = 'whatsapp_not_connected';

function loadWhatsappIntegration() {
  // `require` tardio e tolerante: o módulo de mensageria (Fase 6) carrega o
  // provider na importação e pode lançar se o provedor não estiver
  // configurado. Isso não pode derrubar a sincronização inteira.
  try {
    const whatsapp = require('../integrations/whatsapp');
    if (!whatsapp || typeof whatsapp.checkNumberStatus !== 'function') {
      return null;
    }
    return whatsapp;
  } catch (err) {
    return null;
  }
}

async function syncWhatsappValidation(context) {
  const result = {
    validated: 0,
    attempted: 0,
    candidateErrors: 0,
    sessionUnavailable: false,
    skipped: false,
  };

  const whatsapp = loadWhatsappIntegration();
  if (!whatsapp) {
    result.skipped = true;
    return result;
  }

  // Só tentamos validar quem AINDA não está validado. A validação não é um
  // estado permanente: quem falhar hoje é tentado de novo na próxima execução.
  const customerIds = Array.from(context.touchedCustomerIds);
  const sellerIds = Array.from(context.touchedSellerIds);

  const pendingCustomers =
    customerIds.length === 0
      ? { rows: [] }
      : await crmPool.query(
          `SELECT id, uniplus_id
             FROM customers
            WHERE id = ANY($1::int[])
              AND whatsapp_validated = false
            ORDER BY id`,
          [customerIds]
        );

  const pendingSellers =
    sellerIds.length === 0
      ? { rows: [] }
      : await crmPool.query(
          `SELECT id, uniplus_seller_id
             FROM sellers
            WHERE id = ANY($1::int[])
              AND whatsapp_phone IS NULL
            ORDER BY id`,
          [sellerIds]
        );

  // Ordem de tentativa definida em 02-regras-negocio-uniplus.md, seção 2.
  const CANDIDATE_FIELDS = ['whatsapp', 'celular', 'telefone'];

  // Devolve o primeiro número com conta WhatsApp, ou null.
  // Propaga Error('whatsapp_not_connected') para o chamador interromper tudo
  // (sessão inteira fora do ar — não adianta tentar mais nada). Qualquer
  // OUTRO erro (ex.: número malformado, falha pontual do Puppeteer para
  // aquele número específico) é tratado como "este candidato não pôde ser
  // verificado agora" — conta em `result.candidateErrors` e segue para o
  // próximo candidato/cliente, em vez de abortar a execução inteira.
  //
  // Isso evita um efeito "cabeça de fila travada": como a consulta de
  // pendentes é sempre ORDER BY id, um único registro com número
  // problemático pararia de vez a validação de todos os que vêm depois dele,
  // em toda execução futura, se um erro qualquer abortasse o laço inteiro.
  async function findValidNumber(candidates) {
    if (!candidates) {
      return null;
    }

    for (const field of CANDIDATE_FIELDS) {
      const phone = normalizeBrazilianPhoneToE164(candidates[field]);
      if (!phone) {
        continue;
      }

      result.attempted += 1;

      let status;
      try {
        status = await whatsapp.checkNumberStatus(phone);
      } catch (err) {
        if (err && err.message === WHATSAPP_NOT_CONNECTED) {
          throw err;
        }
        result.candidateErrors += 1;
        continue;
      }

      if (status && status.hasWhatsapp) {
        return phone;
      }
    }

    return null;
  }

  try {
    let budget = MAX_WHATSAPP_VALIDATIONS_PER_RUN;

    for (const customer of pendingCustomers.rows) {
      if (budget <= 0) {
        break;
      }
      budget -= 1;

      const candidates = context.phoneCandidatesByCustomerUniplusId.get(String(customer.uniplus_id));
      const phone = await findValidNumber(candidates);

      if (phone) {
        await crmPool.query(
          `UPDATE customers
              SET phone_e164 = $1, whatsapp_validated = true, updated_at = NOW()
            WHERE id = $2`,
          [phone, customer.id]
        );
        result.validated += 1;
      }
    }

    for (const seller of pendingSellers.rows) {
      if (budget <= 0) {
        break;
      }
      budget -= 1;

      const candidates = context.phoneCandidatesBySellerUniplusId.get(
        String(seller.uniplus_seller_id)
      );
      const phone = await findValidNumber(candidates);

      if (phone) {
        // `sellers.whatsapp_phone` só é gravado quando validado (05-mapeamento,
        // § "sellers ← entidade").
        await crmPool.query(
          'UPDATE sellers SET whatsapp_phone = $1, updated_at = NOW() WHERE id = $2',
          [phone, seller.id]
        );
        result.validated += 1;
      }
    }
  } catch (err) {
    if (err && err.message === WHATSAPP_NOT_CONNECTED) {
      // A sessão inteira está fora do ar: não adianta tentar os outros números
      // desta execução. Aviso NÃO fatal — os registros ficam com
      // whatsapp_validated = false e são tentados de novo no próximo job.
      result.sessionUnavailable = true;
      return result;
    }
    throw err;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Etapa 8 — agregados de compra dos clientes
// ---------------------------------------------------------------------------

// Recalcula first_purchase_at / last_purchase_at / average_ticket /
// purchase_frequency_days a partir de `sales` (05-mapeamento, § "customers ←
// entidade": esses campos NÃO vêm de `entidade`). Feito por query agregada,
// nunca em memória.
async function syncCustomerAggregates(context) {
  const customerIds = Array.from(context.customersTouchedBySales);

  if (customerIds.length === 0) {
    return 0;
  }

  let updated = 0;

  for (const idsChunk of chunk(customerIds, CHUNK_SIZE)) {
    const result = await crmPool.query(
      `
      WITH agg AS (
        SELECT
          customer_id,
          MIN(sale_date) AS first_purchase_at,
          MAX(sale_date) AS last_purchase_at,
          AVG(total_amount) AS average_ticket,
          COUNT(*) AS purchase_count
        FROM sales
        WHERE customer_id = ANY($1::int[])
        GROUP BY customer_id
      )
      UPDATE customers c
         SET first_purchase_at = agg.first_purchase_at,
             last_purchase_at = agg.last_purchase_at,
             average_ticket = ROUND(agg.average_ticket, 2),
             purchase_frequency_days = CASE
               WHEN agg.purchase_count > 1 THEN
                 ROUND(
                   EXTRACT(EPOCH FROM (agg.last_purchase_at - agg.first_purchase_at))
                   / 86400.0
                   / (agg.purchase_count - 1)
                 )::INTEGER
               ELSE NULL
             END,
             updated_at = NOW()
        FROM agg
       WHERE c.id = agg.customer_id
      `,
      [idsChunk]
    );
    updated += result.rowCount;
  }

  return updated;
}

// ---------------------------------------------------------------------------
// Orquestração
// ---------------------------------------------------------------------------

function createContext() {
  return {
    customerIdByUniplusId: new Map(),
    sellerIdByUniplusId: new Map(),
    productIdByUniplusId: new Map(),
    phoneCandidatesByCustomerUniplusId: new Map(),
    phoneCandidatesBySellerUniplusId: new Map(),
    touchedCustomerIds: new Set(),
    touchedSellerIds: new Set(),
    customersTouchedBySales: new Set(),
    skippedSales: 0,
  };
}

async function finishRun(runId, { status, recordsImported, issues }) {
  const result = await crmPool.query(
    `UPDATE sync_runs
        SET finished_at = NOW(),
            status = $1,
            records_imported = $2::jsonb,
            errors = $3::jsonb
      WHERE id = $4
      RETURNING *`,
    [
      status,
      JSON.stringify(recordsImported || {}),
      issues && issues.length > 0 ? JSON.stringify(issues) : null,
      runId,
    ]
  );

  return result.rows[0];
}

async function executeSync({ triggeredBy }) {
  const trigger = triggeredBy === 'manual' ? 'manual' : 'scheduler';

  // Etapa 1 — abre o registro da execução.
  const runInsert = await crmPool.query(
    `INSERT INTO sync_runs (started_at, status, triggered_by)
     VALUES (NOW(), 'running', $1)
     RETURNING *`,
    [trigger]
  );
  const runId = runInsert.rows[0].id;

  const context = createContext();
  const issues = [];
  const recordsImported = {};

  const addError = (step, err) => {
    const message = err && err.message ? err.message : String(err);
    console.error(`[sync.service] Falha na etapa "${step}": ${message}`);
    issues.push({ step, severity: 'error', message });
  };

  const addWarning = (step, message) => {
    console.warn(`[sync.service] Aviso na etapa "${step}": ${message}`);
    issues.push({ step, severity: 'warning', message });
  };

  // Conexão com o Uniplus: se falhar aqui, nada foi sincronizado -> 'failed'.
  try {
    await uniplusRepository.pingUniplus();
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    console.error(`[sync.service] Falha ao conectar no banco do Uniplus: ${message}`);
    return finishRun(runId, {
      status: 'failed',
      recordsImported: {},
      issues: [{ step: 'connection', severity: 'error', message }],
    });
  }

  // Etapa 2 — customers.
  try {
    recordsImported.customers = await syncCustomers(context);
  } catch (err) {
    addError('customers', err);
  }

  // Etapa 3 — sellers.
  try {
    recordsImported.sellers = await syncSellers(context);
  } catch (err) {
    addError('sellers', err);
  }

  // Etapa 4 — products.
  try {
    recordsImported.products = await syncProducts(context);
  } catch (err) {
    addError('products', err);
  }

  // Etapa 5 — stock_snapshots.
  try {
    const stock = await syncStockSnapshots(context);
    recordsImported.stock_snapshots = stock.inserted;
    recordsImported.stock_replenished = stock.replenished;
  } catch (err) {
    addError('stock_snapshots', err);
  }

  // Etapa 6 — sales + sale_items.
  try {
    const sales = await syncSales(context);
    recordsImported.sales = sales.sales;
    recordsImported.sales_new = sales.newSaleIds.length;
    recordsImported.sale_items = sales.saleItems;
    if (context.skippedSales > 0) {
      recordsImported.sales_skipped = context.skippedSales;
      addWarning(
        'sales',
        `${context.skippedSales} venda(s) ignorada(s) por não ter data de venda utilizável.`
      );
    }
  } catch (err) {
    addError('sales', err);
  }

  // Etapa 7 — validação de WhatsApp.
  try {
    const whatsappResult = await syncWhatsappValidation(context);
    recordsImported.whatsapp_validated = whatsappResult.validated;

    if (whatsappResult.skipped) {
      addWarning(
        'whatsapp_validation',
        'Camada de mensageria indisponível (checkNumberStatus não pôde ser carregada). ' +
          'Validação adiada para a próxima execução.'
      );
    } else if (whatsappResult.sessionUnavailable) {
      addWarning(
        'whatsapp_validation',
        'Sessão do WhatsApp não conectada (whatsapp_not_connected). Validação de números ' +
          'interrompida nesta execução e adiada para a próxima.'
      );
    }

    if (whatsappResult.candidateErrors > 0) {
      recordsImported.whatsapp_candidate_errors = whatsappResult.candidateErrors;
      addWarning(
        'whatsapp_validation',
        `${whatsappResult.candidateErrors} candidato(s) a telefone não puderam ser verificados ` +
          '(erro pontual, não a sessão inteira) — o cliente/vendedor segue para o próximo ' +
          'candidato ou para a próxima execução, sem travar a validação dos demais.'
      );
    }
  } catch (err) {
    addError('whatsapp_validation', err);
  }

  // Etapa 8 — agregados de compra dos clientes.
  try {
    recordsImported.customer_aggregates = await syncCustomerAggregates(context);
  } catch (err) {
    addError('customer_aggregates', err);
  }

  // Etapa 9 — recálculo RFM (reaproveita o serviço existente).
  try {
    const rfmResult = await rfmService.recalculateRfmForAllCustomers();
    // `pending_configuration` é estado NORMAL: o Administrador ainda não
    // definiu os critérios de RFM (rfm.service.js). Não é erro.
    recordsImported.rfm_updated = (rfmResult && rfmResult.updated) || 0;
    if (rfmResult && rfmResult.status === 'pending_configuration') {
      recordsImported.rfm_status = 'pending_configuration';
    }
  } catch (err) {
    addError('rfm', err);
  }

  const hasErrors = issues.some((issue) => issue.severity === 'error');
  const status = hasErrors ? 'partial_error' : 'success';

  return finishRun(runId, { status, recordsImported, issues });
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

// Inicia uma sincronização completa. Se já houver uma em andamento, NÃO inicia
// outra — devolve a Promise da run já em andamento.
// triggeredBy: 'scheduler' | 'manual'.
// Resolve com o registro final de `sync_runs`.
function runSync({ triggeredBy } = {}) {
  if (currentRunPromise) {
    return currentRunPromise;
  }

  const promise = executeSync({ triggeredBy })
    .catch((err) => {
      // Rede de segurança: nada previsível chega aqui (falhas de etapa já são
      // capturadas individualmente), mas se o próprio banco do CRM Live cair no
      // meio da orquestração o job não pode derrubar o processo.
      console.error(
        '[sync.service] Erro inesperado na sincronização:',
        err && err.message ? err.message : err
      );
      throw err;
    })
    .finally(() => {
      currentRunPromise = null;
    });

  currentRunPromise = promise;
  return promise;
}

// true se uma sincronização está em andamento neste momento.
function isSyncRunning() {
  return currentRunPromise !== null;
}

module.exports = {
  runSync,
  isSyncRunning,

  // Exportados apenas para teste/uso interno — não fazem parte do contrato
  // consumido pelo controller do painel de status.
  normalizeBrazilianPhoneToE164,
  isFlagTrue,
  resolveEntidadeName,
};
