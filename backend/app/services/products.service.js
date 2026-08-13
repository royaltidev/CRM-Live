// Serviço de produtos — leitura apenas (catálogo é espelho do Uniplus,
// tabela `products`, migration 009). Hoje existe só para alimentar o
// seletor de produto/complemento da tela de Cross-sell (FSD 12.9); nenhuma
// tela de catálogo própria foi pedida.

const { crmPool } = require('../database/connection');

function mapProduct(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    active: row.active,
  };
}

// search: nome (ILIKE), mínimo de 2 caracteres tratado pelo chamador (frontend).
async function listProducts({ search = null, active = null } = {}) {
  const conditions = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`name ILIKE $${params.length}`);
  }
  if (active !== null && active !== undefined) {
    params.push(active === true || active === 'true');
    conditions.push(`active = $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await crmPool.query(
    `SELECT id, name, category, active
       FROM products
       ${where}
      ORDER BY name ASC
      LIMIT 20`,
    params
  );

  return result.rows.map(mapProduct);
}

// Categorias distintas em uso no catálogo — alimenta o filtro de categoria
// da tela de gestão de NPS (FSD 12.12, Fase 10 Parte 2).
async function listProductCategories() {
  const result = await crmPool.query(
    `SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != '' ORDER BY category ASC`
  );

  return result.rows.map((row) => row.category);
}

module.exports = {
  listProducts,
  listProductCategories,
};
