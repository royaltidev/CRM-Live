// Serviço de relatório de Consentimento e LGPD (FSD seção 6.6, tela 12.15).
// Consulta agregada de status de consentimento por cliente — usado pela tela de
// relatório (Admin e Acesso Limitado, FSD seção 8.5).

const { crmPool } = require('../database/connection');

// Retorna lista de clientes com status de consentimento calculado:
// - 'opted_in'        -> consents.opted_in = true
// - 'opted_out'        -> consents.opted_out = true
// - 'never_contacted'  -> não existe linha em consents, ou existe com
//                         opted_in = false e opted_out = false
//
// Filtros opcionais:
// - status: 'opted_in' | 'opted_out' | 'never_contacted'
// - startDate / endDate: aplicam sobre COALESCE(opted_in_at, opted_out_at)
async function getConsentReport({ status, startDate, endDate } = {}) {
  const conditions = [];
  const params = [];

  const statusExpr = `
    CASE
      WHEN c.opted_out = true THEN 'opted_out'
      WHEN c.opted_in = true THEN 'opted_in'
      ELSE 'never_contacted'
    END
  `;

  if (status) {
    params.push(status);
    conditions.push(`(${statusExpr}) = $${params.length}`);
  }

  if (startDate) {
    params.push(startDate);
    conditions.push(`COALESCE(c.opted_in_at, c.opted_out_at) >= $${params.length}`);
  }

  if (endDate) {
    params.push(endDate);
    conditions.push(`COALESCE(c.opted_in_at, c.opted_out_at) <= $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await crmPool.query(
    `SELECT
       cust.id AS customer_id,
       cust.name,
       cust.phone_e164,
       (${statusExpr}) AS status,
       c.opted_in_at,
       c.opted_out_at
     FROM customers cust
     LEFT JOIN consents c ON c.customer_id = cust.id
     ${whereClause}
     ORDER BY cust.name ASC`,
    params
  );

  return result.rows;
}

module.exports = {
  getConsentReport,
};
