// Serviço de gestão de satisfação (NPS) — FSD seção 6.8, fluxo 13.9.
//
// A régua `nps_survey` (Fase 7, rules-engine.service.js) já grava a linha
// `pending` em `nps_responses` ao enviar a pesquisa. Este serviço cuida da
// outra ponta: capturar a NOTA respondida pelo cliente.
//
// Decisão de escopo (ambiguidade real do FSD, resolvida por leitura do texto
// + do código já existente, sem inventar regra de negócio nova):
// - Formato aceito para a resposta: o FSD não define. Só é reconhecida como
//   nota de NPS uma mensagem cujo conteúdo INTEIRO seja um número de 0 a 10
//   (com "nota" opcional na frente ou "/10" no final) — nunca um número
//   embutido em frase livre (ex.: "entreguei em 9 dias" não deve ser
//   interpretado como nota 9). Mensagem que não bate nesse formato não é
//   tratada como resposta de NPS e segue o fluxo normal da caixa de entrada
//   (Fase 9) — o cliente pode estar respondendo outra coisa.
// - "Alerta imediato ao Administrador" (FSD 6.8/12.12): a Parte 1 tinha
//   resolvido isso só como o "alerta destacado" da tela de gestão (Parte 2)
//   — sem canal proativo, porque não existia telefone cadastrado pra
//   nenhum usuário. Revisitado com o responsável do projeto: agora existe
//   `users.whatsapp_phone` (migration 037, escopo novo fora do FSD
//   original) — quando um Administrador ativo tem esse campo preenchido,
//   `notifyAdminsOfLowScore` manda um WhatsApp imediato a cada nota que
//   vira `low_score_open`, mesmo padrão (envio direto, fora da fila) já
//   usado pra notificar vendedor de lead novo (Fase 9,
//   inbox.service.js#forwardLeadToSeller). Sem número cadastrado, nenhum
//   alerta é enviado — não bloqueia a captura da nota. O destaque visual na
//   tela de gestão (Parte 2) continua valendo pra quem não configurou isso.
// - "Agrupado por faixa" (12.12) — Parte 2: adotadas as faixas padrão da
//   metodologia NPS (Detrator 0–6, Neutro 7–8, Promotor 9–10), não o limite
//   de nota baixa configurável (`nps_low_score_threshold`). São conceitos
//   diferentes: a "faixa" é uma classificação fixa e universal do NPS
//   (glossário, seção 24), enquanto o limite configurável só decide quando
//   o alerta de nota baixa dispara.
// - "Período" como filtro (12.12/22.6) — Parte 2: filtra por
//   `survey_sent_at` (sempre preenchido, mesmo pra pesquisa ainda sem
//   resposta), não por `responded_at` (nulo enquanto pendente) — evita
//   esconder pesquisas pendentes de um filtro de período válido.
// - "Produto/categoria" (12.12) — Parte 2: uma venda pode ter vários itens
//   de categorias diferentes; a coluna exibe todas as categorias distintas
//   da venda (agregadas), e o filtro por categoria casa se QUALQUER item da
//   venda pertencer a ela — mesmo critério "ao menos um item corresponde"
//   já usado em outras telas do sistema.

const { crmPool } = require('../database/connection');
const automationSettingsService = require('./automation-settings.service');
const whatsapp = require('../integrations/whatsapp');

// Faixas padrão da metodologia NPS (fixas, não configuráveis).
const SCORE_BANDS = {
  detractor: { min: 0, max: 6 },
  neutral: { min: 7, max: 8 },
  promoter: { min: 9, max: 10 },
};

const LIST_SELECT = `
  SELECT n.id, n.customer_id, c.name AS customer_name, c.phone_e164 AS customer_phone,
         n.sale_id, sale.seller_id, seller.name AS seller_name,
         n.score, n.survey_sent_at, n.responded_at, n.status,
         (SELECT STRING_AGG(DISTINCT p.category, ', ' ORDER BY p.category)
            FROM sale_items si INNER JOIN products p ON p.id = si.product_id
            WHERE si.sale_id = n.sale_id) AS product_categories
  FROM nps_responses n
  INNER JOIN customers c ON c.id = n.customer_id
  LEFT JOIN sales sale ON sale.id = n.sale_id
  LEFT JOIN sellers seller ON seller.id = sale.seller_id
`;

const LIST_ORDER = `ORDER BY (CASE n.status WHEN 'low_score_open' THEN 0 ELSE 1 END), n.survey_sent_at DESC`;

function buildNpsFilters({ scoreBand, dateFrom, dateTo, sellerId, productCategory } = {}) {
  const conditions = [];
  const params = [];

  if (scoreBand && SCORE_BANDS[scoreBand]) {
    const { min, max } = SCORE_BANDS[scoreBand];
    params.push(min);
    conditions.push(`n.score >= $${params.length}`);
    params.push(max);
    conditions.push(`n.score <= $${params.length}`);
  }
  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`n.survey_sent_at >= $${params.length}`);
  }
  if (dateTo) {
    params.push(dateTo);
    conditions.push(`n.survey_sent_at <= $${params.length}`);
  }
  if (sellerId) {
    params.push(sellerId);
    conditions.push(`sale.seller_id = $${params.length}`);
  }
  if (productCategory) {
    params.push(productCategory);
    conditions.push(
      `EXISTS (SELECT 1 FROM sale_items si INNER JOIN products p ON p.id = si.product_id
               WHERE si.sale_id = n.sale_id AND p.category = $${params.length})`
    );
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

// Listagem paginada para a tela de gestão de NPS (FSD 12.12). Notas baixas
// não tratadas (`low_score_open`) sempre aparecem primeiro — é o "alerta
// destacado" da tela (ver decisão acima).
async function listNpsResponses({ scoreBand, dateFrom, dateTo, sellerId, productCategory, page = 1, pageSize = 50 } = {}) {
  const { whereClause, params } = buildNpsFilters({ scoreBand, dateFrom, dateTo, sellerId, productCategory });

  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safePageSize = Math.min(200, Math.max(1, parseInt(pageSize, 10) || 50));
  const offset = (safePage - 1) * safePageSize;

  const countResult = await crmPool.query(
    `SELECT COUNT(*)::int AS total FROM nps_responses n LEFT JOIN sales sale ON sale.id = n.sale_id ${whereClause}`,
    params
  );
  const total = countResult.rows[0].total;

  const dataParams = [...params, safePageSize, offset];
  const dataResult = await crmPool.query(
    `${LIST_SELECT} ${whereClause} ${LIST_ORDER} LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams
  );

  return {
    responses: dataResult.rows,
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.ceil(total / safePageSize) || 1,
  };
}

// Mesmos filtros da listagem, sem paginação — usado pela exportação CSV
// (FSD 22.6: "todo dado exportado deve respeitar exatamente os mesmos
// filtros... aplicados na tela de origem").
async function listNpsResponsesForExport(filters) {
  const { whereClause, params } = buildNpsFilters(filters);
  const result = await crmPool.query(`${LIST_SELECT} ${whereClause} ${LIST_ORDER}`, params);
  return result.rows;
}

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Só reconhece a mensagem como nota se ela for, sozinha, um número de 0 a
// 10 — opcionalmente prefixada por "nota" ou sufixada por "/10". Retorna
// null quando o formato não bate (mensagem não é uma resposta de NPS).
function parseNpsScore(body) {
  const normalized = normalizeText(body);
  const match = normalized.match(/^(?:nota\s*[:\-]?\s*)?(10|[0-9])(?:\s*\/\s*10)?\s*[.!]?$/);
  return match ? Number(match[1]) : null;
}

// Pesquisa de satisfação mais recente ainda sem resposta para o cliente.
async function findPendingNpsResponse(customerId) {
  const result = await crmPool.query(
    `SELECT * FROM nps_responses
     WHERE customer_id = $1 AND status = 'pending'
     ORDER BY survey_sent_at DESC
     LIMIT 1`,
    [customerId]
  );

  return result.rows[0] || null;
}

// Alerta imediato ao(s) Administrador(es) ativo(s) com WhatsApp cadastrado
// (users.whatsapp_phone) — ver decisão de escopo no topo do arquivo. Envio
// direto, fora da fila (mesmo padrão de forwardLeadToSeller, Fase 9): é um
// aviso operacional interno, não uma mensagem a cliente, então não faz
// sentido aplicar cadência/janela de horário. Falha ao enviar é só logada
// — nunca deve impedir a captura da nota em si.
async function notifyAdminsOfLowScore({ customerName, score }) {
  const result = await crmPool.query(
    `SELECT id, whatsapp_phone FROM users
     WHERE role = 'admin' AND active = true AND whatsapp_phone IS NOT NULL`
  );

  for (const admin of result.rows) {
    try {
      await whatsapp.sendText({
        to: admin.whatsapp_phone,
        body:
          `Nota de satisfação baixa recebida!\n` +
          `Cliente: ${customerName}\n` +
          `Nota: ${score}/10\n` +
          `Acesse a tela de Gestão de NPS para tratar.`,
      });
    } catch (err) {
      console.error(`[nps] Falha ao notificar Administrador (usuário ${admin.id}) sobre nota baixa:`, err.message);
    }
  }
}

// Tenta capturar a nota de NPS a partir de uma mensagem recebida. Retorna a
// linha de `nps_responses` atualizada quando reconhecida como resposta
// válida, ou null quando não há pesquisa pendente ou a mensagem não bate no
// formato de nota (nesses casos, quem chama deve seguir o fluxo normal da
// caixa de entrada).
async function captureNpsResponse({ customerId, customerName, body }) {
  const pending = await findPendingNpsResponse(customerId);
  if (!pending) {
    return null;
  }

  const score = parseNpsScore(body);
  if (score === null) {
    return null;
  }

  const threshold = await automationSettingsService.getNpsLowScoreThreshold();
  const status = score <= threshold ? 'low_score_open' : 'answered';

  const result = await crmPool.query(
    `UPDATE nps_responses
     SET score = $1, responded_at = NOW(), status = $2
     WHERE id = $3
     RETURNING *`,
    [score, status, pending.id]
  );

  if (status === 'low_score_open') {
    await notifyAdminsOfLowScore({ customerName: customerName || 'Cliente', score });
  }

  return result.rows[0];
}

module.exports = {
  SCORE_BANDS,
  parseNpsScore,
  findPendingNpsResponse,
  captureNpsResponse,
  notifyAdminsOfLowScore,
  listNpsResponses,
  listNpsResponsesForExport,
};
