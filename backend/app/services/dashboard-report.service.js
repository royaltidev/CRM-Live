// Serviço de dashboard geral de relacionamento (FSD seções 6.7, 22.1).
// Consulta agregada: taxa de recompra, ticket médio, frequência de compra,
// clientes ativos x inativos, NPS médio — disponível a Admin e Acesso
// Limitado (FSD seção 8.5).
//
// Decisões de design (o FSD não define as fórmulas, resolvidas por leitura
// literal dos termos + reaproveitamento de conceitos já existentes no
// sistema, sem inventar critério novo):
// - Período: filtra `sales.sale_date` (recompra/ticket médio/frequência) e
//   `nps_responses.responded_at` (NPS médio) — cada indicador usa a data que
//   faz sentido pra ele. Padrão "últimos 30 dias" quando nenhum filtro é
//   informado (FSD 22.1, "Filtros: período — padrão últimos 30 dias").
// - Taxa de recompra: % de clientes com MAIS DE UMA compra no período, sobre
//   o total de clientes com AO MENOS UMA compra no período (definição
//   padrão de "repeat purchase rate").
// - Ticket médio: valor médio das vendas no período (`AVG(sales.total_amount)`).
// - Frequência de compra: total de vendas no período / clientes distintos
//   que compraram no período.
// - NPS médio: média de `nps_responses.score` entre as respostas recebidas
//   no período (`score IS NOT NULL`).
// - Clientes ativos x inativos: reaproveita a classificação RFM já
//   existente (`customers.rfm_segment`, Fase 5) em vez de inventar um
//   segundo critério de atividade — "inativo" é o segmento de mesmo nome
//   configurado pelo Administrador (convenção já usada em todo o resto do
//   sistema, ver rfm.service.js). É um retrato ATUAL (não filtrado por
//   período — o RFM já tem sua própria janela de recência configurável).
//   Sem critérios RFM configurados ainda, o indicador fica
//   'pending_configuration' — mesmo padrão de outros parâmetros sem
//   default (ex.: welcome_coupon_discount_percent).

const { crmPool } = require('../database/connection');
const rfmService = require('./rfm.service');

const DEFAULT_PERIOD_DAYS = 30;

function resolvePeriod({ startDate, endDate }) {
  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate ? new Date(startDate) : new Date(end.getTime() - DEFAULT_PERIOD_DAYS * 24 * 60 * 60 * 1000);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

async function getActiveVsInactive() {
  const criteria = await rfmService.getRfmCriteria();
  if (!criteria) {
    return { status: 'pending_configuration' };
  }

  const result = await crmPool.query(`
    SELECT
      COUNT(*) FILTER (WHERE rfm_segment = 'inativo')::int AS inactive,
      COUNT(*) FILTER (WHERE rfm_segment IS NOT NULL AND rfm_segment != 'inativo')::int AS active,
      COUNT(*) FILTER (WHERE rfm_segment IS NULL)::int AS unclassified
    FROM customers
  `);

  return { status: 'ok', ...result.rows[0] };
}

async function getGeneralDashboard({ startDate, endDate } = {}) {
  const { start, end } = resolvePeriod({ startDate, endDate });

  const salesStats = await crmPool.query(
    `SELECT COUNT(*)::int AS sales_count,
            COALESCE(AVG(total_amount), 0) AS avg_ticket,
            COUNT(DISTINCT customer_id)::int AS distinct_customers
     FROM sales
     WHERE customer_id IS NOT NULL AND sale_date >= $1 AND sale_date <= $2::date + INTERVAL '1 day'`,
    [start, end]
  );

  const repeatStats = await crmPool.query(
    `SELECT COUNT(*) FILTER (WHERE cnt > 1)::int AS repeat_customers, COUNT(*)::int AS total_customers
     FROM (
       SELECT customer_id, COUNT(*) AS cnt
       FROM sales
       WHERE customer_id IS NOT NULL AND sale_date >= $1 AND sale_date <= $2::date + INTERVAL '1 day'
       GROUP BY customer_id
     ) t`,
    [start, end]
  );

  const npsStats = await crmPool.query(
    `SELECT AVG(score) AS avg_score, COUNT(*)::int AS response_count
     FROM nps_responses
     WHERE score IS NOT NULL AND responded_at >= $1 AND responded_at <= $2::date + INTERVAL '1 day'`,
    [start, end]
  );

  const activeVsInactive = await getActiveVsInactive();

  const { sales_count: salesCount, avg_ticket: avgTicket, distinct_customers: distinctCustomers } = salesStats.rows[0];
  const { repeat_customers: repeatCustomers, total_customers: totalCustomersWithPurchase } = repeatStats.rows[0];
  const { avg_score: avgScore, response_count: npsResponseCount } = npsStats.rows[0];

  return {
    period: { startDate: start, endDate: end },
    repurchaseRate: totalCustomersWithPurchase > 0 ? repeatCustomers / totalCustomersWithPurchase : null,
    avgTicket: Number(avgTicket),
    salesCount,
    purchaseFrequency: distinctCustomers > 0 ? salesCount / distinctCustomers : null,
    npsAverage: avgScore !== null ? Number(avgScore) : null,
    npsResponseCount,
    activeVsInactive,
  };
}

module.exports = {
  getGeneralDashboard,
};
