// Serviço de produtos complementares (cross-sell), FSD seções 6.4, 12.9,
// tabela `complementary_products` (migration 011).
//
// Escrita liberada a Admin E Acesso limitado (FSD linha 336 da matriz de
// permissões — diferente de Cupons/Giftback/Templates, que são exclusivos
// do Administrador).
//
// `source` só é gravado como 'manual' por este CRUD: a "revisão de sugestões
// automáticas baseadas em histórico de vendas" citada no FSD (6.4) depende
// de um critério de "comprados juntos" que o FSD não define (frequência,
// janela de tempo) — mesmo tipo de parâmetro sem padrão já tratado em outras
// fases (ex.: rfm_criteria). Fica para quando esse critério for definido;
// o schema já suporta 'suggested' quando isso acontecer.

const { crmPool } = require('../database/connection');

const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';

function mapRow(row) {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    complementaryProductId: row.complementary_product_id,
    complementaryProductName: row.complementary_product_name,
    source: row.source,
    active: row.active,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

const BASE_SELECT = `
  SELECT cp.*, p.name AS product_name, cpx.name AS complementary_product_name
    FROM complementary_products cp
    JOIN products p ON p.id = cp.product_id
    JOIN products cpx ON cpx.id = cp.complementary_product_id
`;

async function listComplementaryProducts({ productId = null, active = null, source = null } = {}) {
  const conditions = [];
  const params = [];

  if (productId) {
    params.push(productId);
    conditions.push(`cp.product_id = $${params.length}`);
  }
  if (active !== null && active !== undefined) {
    params.push(active === true || active === 'true');
    conditions.push(`cp.active = $${params.length}`);
  }
  if (source) {
    params.push(source);
    conditions.push(`cp.source = $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await crmPool.query(`${BASE_SELECT} ${where} ORDER BY cp.created_at DESC`, params);
  return result.rows.map(mapRow);
}

async function getComplementaryProductById(id) {
  const result = await crmPool.query(`${BASE_SELECT} WHERE cp.id = $1`, [id]);
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

// Produtos ativos com complemento ativo, para uma venda (FSD 14.6: "um
// produto só gera oferta de cross-sell se possuir ao menos um produto
// complementar ativo cadastrado"). Usada pelo gatilho pós-venda.
async function getActiveComplementsForProduct(productId) {
  const result = await crmPool.query(`${BASE_SELECT} WHERE cp.product_id = $1 AND cp.active = true`, [productId]);
  return result.rows.map(mapRow);
}

async function createComplementaryProduct({ productId, complementaryProductId, createdBy }) {
  if (!productId || !complementaryProductId) {
    throw new Error('Selecione o produto e o produto complementar.');
  }
  if (Number(productId) === Number(complementaryProductId)) {
    throw new Error('O produto complementar não pode ser o mesmo produto.');
  }
  if (!createdBy) {
    throw new Error('createComplementaryProduct requer createdBy.');
  }

  try {
    const result = await crmPool.query(
      `INSERT INTO complementary_products (product_id, complementary_product_id, source, created_by)
       VALUES ($1, $2, 'manual', $3)
       RETURNING id`,
      [productId, complementaryProductId, createdBy]
    );
    return getComplementaryProductById(result.rows[0].id);
  } catch (err) {
    if (err.code === PG_UNIQUE_VIOLATION) {
      throw new Error('Esse par de produtos já está cadastrado como complementar.');
    }
    if (err.code === PG_FOREIGN_KEY_VIOLATION) {
      throw new Error('Produto não encontrado.');
    }
    throw err;
  }
}

// Cria uma sugestão gerada pelo motor de detecção de padrões (Venda
// Inteligente, escopo novo — ver product-affinity.service.js). Sempre
// inativa (pendente de revisão do Admin/Acesso Limitado na própria tela de
// Cross-sell) e sem created_by (gerada pelo sistema, não por um usuário —
// migration 038 tornou a coluna nullable para este caso). Ignora
// silenciosamente pares já existentes (qualquer origem) em vez de lançar
// erro — o motor roda em lote, sobre muitos candidatos.
async function createSuggestedComplementaryProduct({ productId, complementaryProductId }) {
  try {
    const result = await crmPool.query(
      `INSERT INTO complementary_products (product_id, complementary_product_id, source, active, created_by)
       VALUES ($1, $2, 'suggested', false, NULL)
       RETURNING id`,
      [productId, complementaryProductId]
    );
    return getComplementaryProductById(result.rows[0].id);
  } catch (err) {
    if (err.code === PG_UNIQUE_VIOLATION) {
      return null;
    }
    throw err;
  }
}

async function toggleActive(id) {
  const existing = await getComplementaryProductById(id);
  if (!existing) {
    throw new Error('Relação de produto complementar não encontrada.');
  }

  await crmPool.query('UPDATE complementary_products SET active = $1 WHERE id = $2', [!existing.active, id]);
  return getComplementaryProductById(id);
}

async function deleteComplementaryProduct(id) {
  const existing = await getComplementaryProductById(id);
  if (!existing) {
    throw new Error('Relação de produto complementar não encontrada.');
  }

  await crmPool.query('DELETE FROM complementary_products WHERE id = $1', [id]);
  return true;
}

module.exports = {
  listComplementaryProducts,
  getComplementaryProductById,
  getActiveComplementsForProduct,
  createComplementaryProduct,
  createSuggestedComplementaryProduct,
  toggleActive,
  deleteComplementaryProduct,
};
