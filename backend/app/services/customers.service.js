// Serviço de clientes — cadastro e visão 360º.
// Toda a base de "customers" é espelho do Uniplus (campos cadastrais são read-only pela API).
// Apenas os campos complementares (birth_date, preferences, preferred_channel) podem ser
// editados pelo CRM Live. Ver FSD seção 6.1.

const { crmPool } = require('../database/connection');

// Lista clientes com busca, filtros e paginação.
// search: busca por nome (ILIKE) ou telefone (ILIKE)
// tagId: filtra clientes que possuem a tag informada
// rfmSegment: filtra por segmento RFM exato
// page/pageSize: paginação (1-indexed)
async function listCustomers({ search, tagId, rfmSegment, page = 1, pageSize = 20 } = {}) {
  const conditions = [];
  const params = [];
  let joinClause = '';

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(c.name ILIKE $${params.length} OR c.phone_e164 ILIKE $${params.length})`);
  }

  if (tagId) {
    joinClause = 'INNER JOIN customer_tags ct ON ct.customer_id = c.id';
    params.push(tagId);
    conditions.push(`ct.tag_id = $${params.length}`);
  }

  if (rfmSegment) {
    params.push(rfmSegment);
    conditions.push(`c.rfm_segment = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safePageSize = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
  const offset = (safePage - 1) * safePageSize;

  // Conta total de resultados (sem paginação) para o front montar a paginação.
  const countSql = `
    SELECT COUNT(DISTINCT c.id) AS total
    FROM customers c
    ${joinClause}
    ${whereClause}
  `;
  const countResult = await crmPool.query(countSql, params);
  const total = parseInt(countResult.rows[0].total, 10);

  const dataParams = [...params, safePageSize, offset];
  const dataSql = `
    SELECT DISTINCT c.id, c.uniplus_id, c.name, c.phone_e164, c.whatsapp_validated,
           c.document, c.email, c.first_purchase_at, c.last_purchase_at,
           c.average_ticket, c.purchase_frequency_days, c.rfm_segment,
           c.birth_date, c.preferences, c.preferred_channel, c.synced_at,
           c.created_at, c.updated_at
    FROM customers c
    ${joinClause}
    ${whereClause}
    ORDER BY c.name ASC
    LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
  `;
  const dataResult = await crmPool.query(dataSql, dataParams);

  return {
    customers: dataResult.rows,
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.ceil(total / safePageSize) || 1,
  };
}

// Retorna um cliente completo (dados cadastrais + tags associadas).
async function getCustomerById(id) {
  const customerResult = await crmPool.query('SELECT * FROM customers WHERE id = $1', [id]);

  if (customerResult.rows.length === 0) {
    return null;
  }

  const customer = customerResult.rows[0];

  const tagsResult = await crmPool.query(
    `SELECT t.id, t.name
     FROM tags t
     INNER JOIN customer_tags ct ON ct.tag_id = t.id
     WHERE ct.customer_id = $1
     ORDER BY t.name ASC`,
    [id]
  );

  customer.tags = tagsResult.rows;

  return customer;
}

// Retorna a linha do tempo de interações do cliente: vendas + mensagens
// unificadas em ordem cronológica decrescente (mais recente primeiro).
async function getCustomerTimeline(id) {
  const salesResult = await crmPool.query(
    `SELECT id, uniplus_id, sale_date, total_amount, seller_id
     FROM sales
     WHERE customer_id = $1
     ORDER BY sale_date DESC`,
    [id]
  );

  const messagesResult = await crmPool.query(
    `SELECT id, conversation_id, direction, body, template_id, automation_rule_id,
            campaign_id, trigger_source, status, sent_at, created_at
     FROM messages
     WHERE customer_id = $1
     ORDER BY created_at DESC`,
    [id]
  );

  const saleEvents = salesResult.rows.map((sale) => ({
    type: 'sale',
    date: sale.sale_date,
    data: sale,
  }));

  const messageEvents = messagesResult.rows.map((message) => ({
    type: 'message',
    date: message.created_at,
    data: message,
  }));

  // Une e ordena cronologicamente (mais recente primeiro).
  const timeline = [...saleEvents, ...messageEvents].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  return timeline;
}

// Atualiza SOMENTE os campos complementares do cliente.
// Campos espelho (uniplus_id, name, phone_e164, document, email, etc.) nunca são
// alterados por aqui — eles só mudam via sincronização com o Uniplus.
async function updateCustomerComplementaryFields(id, { birthDate, preferences, preferredChannel }) {
  const result = await crmPool.query(
    `UPDATE customers
     SET birth_date = $1,
         preferences = $2,
         preferred_channel = $3,
         updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [birthDate ?? null, JSON.stringify(preferences ?? {}), preferredChannel ?? null, id]
  );

  if (result.rows.length === 0) {
    throw new Error('Cliente não encontrado');
  }

  return result.rows[0];
}

// Associa uma tag a um cliente. Idempotente (ON CONFLICT DO NOTHING).
async function addTagToCustomer(customerId, tagId) {
  // Garante que o cliente e a tag existem, para retornar erro amigável.
  const customerCheck = await crmPool.query('SELECT id FROM customers WHERE id = $1', [customerId]);
  if (customerCheck.rows.length === 0) {
    throw new Error('Cliente não encontrado');
  }

  const tagCheck = await crmPool.query('SELECT id, name FROM tags WHERE id = $1', [tagId]);
  if (tagCheck.rows.length === 0) {
    throw new Error('Tag não encontrada');
  }

  await crmPool.query(
    `INSERT INTO customer_tags (customer_id, tag_id)
     VALUES ($1, $2)
     ON CONFLICT (customer_id, tag_id) DO NOTHING`,
    [customerId, tagId]
  );

  return tagCheck.rows[0];
}

// Remove a associação de uma tag de um cliente.
async function removeTagFromCustomer(customerId, tagId) {
  const result = await crmPool.query(
    'DELETE FROM customer_tags WHERE customer_id = $1 AND tag_id = $2 RETURNING customer_id',
    [customerId, tagId]
  );

  if (result.rows.length === 0) {
    throw new Error('Essa tag não está associada a este cliente');
  }

  return true;
}

// Relatório: vendas sem cliente identificado (customer_id IS NULL).
// Útil para acompanhar vendas que precisam ser vinculadas manualmente ou
// que indicam falha de match na sincronização.
async function getSalesWithoutCustomer({ startDate, endDate } = {}) {
  const conditions = ['s.customer_id IS NULL'];
  const params = [];

  if (startDate) {
    params.push(startDate);
    conditions.push(`s.sale_date >= $${params.length}`);
  }

  if (endDate) {
    params.push(endDate);
    conditions.push(`s.sale_date <= $${params.length}`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const sql = `
    SELECT s.id, s.uniplus_id, s.sale_date, s.total_amount, s.seller_id,
           COALESCE(
             json_agg(
               json_build_object('productId', p.id, 'productName', p.name, 'quantity', si.quantity, 'unitPrice', si.unit_price)
             ) FILTER (WHERE si.id IS NOT NULL),
             '[]'
           ) AS items
    FROM sales s
    LEFT JOIN sale_items si ON si.sale_id = s.id
    LEFT JOIN products p ON p.id = si.product_id
    ${whereClause}
    GROUP BY s.id
    ORDER BY s.sale_date DESC
  `;

  const result = await crmPool.query(sql, params);
  return result.rows;
}

module.exports = {
  listCustomers,
  getCustomerById,
  getCustomerTimeline,
  updateCustomerComplementaryFields,
  addTagToCustomer,
  removeTagFromCustomer,
  getSalesWithoutCustomer,
};
