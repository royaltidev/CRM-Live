// Serviço de segmentos dinâmicos de clientes (filtros combináveis salvos).
// Ver docs/FSD.md, seção 6.2 e tela 12.4.
//
// Formato adotado para dynamic_segments.filter_criteria (JSONB), todos os campos
// são opcionais e combinam-se em AND entre si (dentro de "tags" a combinação é OR
// — cliente precisa ter ao menos UMA das tags listadas):
// {
//   "productCategory": "string|null",              // categoria de produto comprada pelo cliente (via sale_items/products)
//   "averageTicket": { "min": number|null, "max": number|null },  // faixa de customers.average_ticket
//   "purchaseDateRange": { "from": "YYYY-MM-DD"|null, "to": "YYYY-MM-DD"|null }, // baseado em customers.last_purchase_at
//   "tags": ["nome_tag_1", "nome_tag_2"],           // cliente deve ter QUALQUER uma das tags listadas (customer_tags/tags)
//   "rfmSegment": "vip"|"fiel"|"em_risco"|"inativo"|null // filtro por customers.rfm_segment já calculado
// }
//
// LIMITAÇÃO CONHECIDA (MVP): o FSD menciona filtro por bairro/cidade, mas a
// tabela `customers` não possui essas colunas no schema atual (Fase 2). Esse
// filtro específico é ignorado nesta fase — não inventamos coluna nova. Se um
// filterCriteria enviar "neighborhood"/"city", o campo é simplesmente ignorado.

const { crmPool } = require('../database/connection');

// Monta a cláusula WHERE (+ params) correspondente a um filterCriteria.
// Retorna { whereSql, params } — whereSql já vem pronto para ser concatenado
// após "WHERE 1=1 " (facilita compor com outras condições, se necessário).
function buildCustomerFilterQuery(filterCriteria = {}) {
  const conditions = [];
  const params = [];

  const criteria = filterCriteria && typeof filterCriteria === 'object' ? filterCriteria : {};

  // Filtro por categoria de produto: cliente possui ao menos uma sale_item
  // cujo produto pertence à categoria informada.
  if (criteria.productCategory) {
    params.push(criteria.productCategory);
    conditions.push(`
      EXISTS (
        SELECT 1
        FROM sales sa
        JOIN sale_items si ON si.sale_id = sa.id
        JOIN products p ON p.id = si.product_id
        WHERE sa.customer_id = c.id AND p.category = $${params.length}
      )
    `);
  }

  // Filtro por faixa de ticket médio.
  if (criteria.averageTicket && typeof criteria.averageTicket === 'object') {
    const { min, max } = criteria.averageTicket;
    if (min !== null && min !== undefined && min !== '') {
      params.push(min);
      conditions.push(`c.average_ticket >= $${params.length}`);
    }
    if (max !== null && max !== undefined && max !== '') {
      params.push(max);
      conditions.push(`c.average_ticket <= $${params.length}`);
    }
  }

  // Filtro por período da última compra.
  if (criteria.purchaseDateRange && typeof criteria.purchaseDateRange === 'object') {
    const { from, to } = criteria.purchaseDateRange;
    if (from) {
      params.push(from);
      conditions.push(`c.last_purchase_at >= $${params.length}`);
    }
    if (to) {
      params.push(to);
      conditions.push(`c.last_purchase_at <= $${params.length}`);
    }
  }

  // Filtro por tags (OR entre as tags informadas).
  if (Array.isArray(criteria.tags) && criteria.tags.length > 0) {
    params.push(criteria.tags);
    conditions.push(`
      EXISTS (
        SELECT 1
        FROM customer_tags ct
        JOIN tags t ON t.id = ct.tag_id
        WHERE ct.customer_id = c.id AND t.name = ANY($${params.length}::text[])
      )
    `);
  }

  // Filtro por segmento RFM já calculado.
  if (criteria.rfmSegment) {
    params.push(criteria.rfmSegment);
    conditions.push(`c.rfm_segment = $${params.length}`);
  }

  const whereSql = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';
  return { whereSql, params };
}

// Lista os segmentos dinâmicos salvos.
async function listSegments({ includeInactive = false } = {}) {
  const sql = includeInactive
    ? `SELECT * FROM dynamic_segments ORDER BY created_at DESC`
    : `SELECT * FROM dynamic_segments WHERE active = true ORDER BY created_at DESC`;

  const result = await crmPool.query(sql);
  return result.rows;
}

// Busca um segmento pelo id.
async function getSegmentById(id) {
  const result = await crmPool.query('SELECT * FROM dynamic_segments WHERE id = $1', [id]);
  if (result.rows.length === 0) {
    throw new Error('Segmento não encontrado');
  }
  return result.rows[0];
}

// Cria um novo segmento dinâmico.
async function createSegment({ name, filterCriteria, createdBy }) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new Error('Nome do segmento é obrigatório');
  }

  const result = await crmPool.query(
    `INSERT INTO dynamic_segments (name, filter_criteria, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())
     RETURNING *`,
    [name.trim(), JSON.stringify(filterCriteria || {}), createdBy]
  );

  return result.rows[0];
}

// Atualiza um segmento existente (nome, filtros e/ou status ativo).
async function updateSegment(id, { name, filterCriteria, active } = {}) {
  const existing = await getSegmentById(id);

  const newName = name !== undefined ? name : existing.name;
  const newFilterCriteria = filterCriteria !== undefined ? filterCriteria : existing.filter_criteria;
  const newActive = active !== undefined ? active : existing.active;

  if (!newName || typeof newName !== 'string' || !newName.trim()) {
    throw new Error('Nome do segmento é obrigatório');
  }

  const result = await crmPool.query(
    `UPDATE dynamic_segments
     SET name = $1, filter_criteria = $2, active = $3, updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [newName.trim(), JSON.stringify(newFilterCriteria || {}), newActive, id]
  );

  return result.rows[0];
}

// Exclui um segmento. Bloqueia a exclusão se houver campanhas referenciando-o
// (a FK campaigns.segment_id -> dynamic_segments.id é ON DELETE SET NULL, ou
// seja, o banco NÃO impede a exclusão automaticamente; fazemos a checagem aqui
// para não "perder" o vínculo de campanhas silenciosamente). Também tratamos
// o erro de violação de FK (código 23503) como salvaguarda, caso outra tabela
// venha a referenciar dynamic_segments com RESTRICT no futuro.
async function deleteSegment(id) {
  await getSegmentById(id); // valida existência (lança erro se não encontrado)

  const campaignsUsingSegment = await crmPool.query(
    'SELECT COUNT(*)::int AS count FROM campaigns WHERE segment_id = $1',
    [id]
  );

  if (campaignsUsingSegment.rows[0].count > 0) {
    throw new Error(
      'Este segmento está sendo usado por uma ou mais campanhas e não pode ser excluído. Desative-o em vez de excluir.'
    );
  }

  try {
    await crmPool.query('DELETE FROM dynamic_segments WHERE id = $1', [id]);
  } catch (err) {
    if (err.code === '23503') {
      throw new Error(
        'Este segmento está sendo referenciado por outro registro e não pode ser excluído. Desative-o em vez de excluir.'
      );
    }
    throw err;
  }

  return { success: true };
}

// Dado um filterCriteria (mesmo formato salvo em dynamic_segments.filter_criteria),
// retorna a lista de clientes correspondentes + contagem total. Usada tanto para
// pré-visualizar um filtro ainda não salvo quanto para contar clientes de um
// segmento já existente.
async function previewSegmentCustomers(filterCriteria, { limit = 50, offset = 0 } = {}) {
  const { whereSql, params } = buildCustomerFilterQuery(filterCriteria);

  const countSql = `SELECT COUNT(*)::int AS count FROM customers c WHERE 1=1 ${whereSql}`;
  const countResult = await crmPool.query(countSql, params);

  const listParams = [...params, limit, offset];
  const listSql = `
    SELECT c.id, c.uniplus_id, c.name, c.phone_e164, c.average_ticket, c.last_purchase_at, c.rfm_segment
    FROM customers c
    WHERE 1=1 ${whereSql}
    ORDER BY c.name ASC
    LIMIT $${listParams.length - 1} OFFSET $${listParams.length}
  `;
  const listResult = await crmPool.query(listSql, listParams);

  return {
    total: countResult.rows[0].count,
    customers: listResult.rows,
  };
}

module.exports = {
  buildCustomerFilterQuery,
  listSegments,
  getSegmentById,
  createSegment,
  updateSegment,
  deleteSegment,
  previewSegmentCustomers,
};
