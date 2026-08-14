// Serviço de produtos complementares (cross-sell), FSD seções 6.4, 12.9,
// tabela `complementary_products` (migration 011).
//
// Escrita liberada a Admin E Acesso limitado (FSD linha 336 da matriz de
// permissões — diferente de Cupons/Giftback/Templates, que são exclusivos
// do Administrador).
//
// O cadastro MANUAL de par complementar foi REMOVIDO em 14/08/2026 por
// decisão do responsável do projeto (diverge do FSD 6.4, que o previa): na
// prática ninguém sabe de cabeça quais pares valem a pena, e o formulário
// competia com a detecção automática sem acrescentar informação. Todo par
// novo nasce agora da detecção de padrões (product-affinity.service.js) e é
// aceito ou descartado pelo usuário na tela de Cross-sell. Pares 'manual'
// criados antes dessa mudança continuam funcionando normalmente — só não é
// mais possível criar novos.

const { crmPool } = require('../database/connection');

const PG_UNIQUE_VIOLATION = '23505';

function mapRow(row) {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    productCode: row.product_code,
    complementaryProductId: row.complementary_product_id,
    complementaryProductName: row.complementary_product_name,
    complementaryProductCode: row.complementary_product_code,
    source: row.source,
    active: row.active,
    createdBy: row.created_by,
    createdAt: row.created_at,
    // Métricas da detecção (migration 040) — nulas em pares manuais e nos
    // sugeridos antes dessa mudança.
    coOccurrence: row.co_occurrence,
    confidence: row.confidence !== null ? Number(row.confidence) : null,
    lift: row.lift !== null ? Number(row.lift) : null,
    detectedAt: row.detected_at,
    dismissedAt: row.dismissed_at,
  };
}

// O código do Uniplus vai junto do nome porque o catálogo real tem dezenas
// de produtos DIFERENTES com o mesmo nome (ex.: 17 itens chamados
// "LANCHEIRA SESTINE", cada um uma referência) — sem o código, duas linhas
// da lista de sugestões ficam indistinguíveis na tela.
const BASE_SELECT = `
  SELECT cp.*,
         p.name AS product_name, p.uniplus_id AS product_code,
         cpx.name AS complementary_product_name, cpx.uniplus_id AS complementary_product_code
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

// Cria uma sugestão gerada pelo motor de detecção de padrões (Venda
// Inteligente, escopo novo — ver product-affinity.service.js). Sempre
// inativa (pendente de decisão do Admin/Acesso Limitado na própria tela de
// Cross-sell) e sem created_by (gerada pelo sistema, não por um usuário —
// migration 038 tornou a coluna nullable para este caso). Ignora
// silenciosamente pares já existentes (qualquer origem) em vez de lançar
// erro — o motor roda em lote, sobre muitos candidatos.
//
// As métricas (co-ocorrência, confiança, lift) são gravadas junto para que a
// lista detectada continue explicável e revisitável depois — antes da
// migration 040 elas só existiam no diálogo exibido logo após a detecção.
async function createSuggestedComplementaryProduct({
  productId,
  complementaryProductId,
  coOccurrence = null,
  confidence = null,
  lift = null,
}) {
  try {
    const result = await crmPool.query(
      `INSERT INTO complementary_products
         (product_id, complementary_product_id, source, active, created_by,
          co_occurrence, confidence, lift, detected_at)
       VALUES ($1, $2, 'suggested', false, NULL, $3, $4, $5, NOW())
       RETURNING id`,
      [productId, complementaryProductId, coOccurrence, confidence, lift]
    );
    return getComplementaryProductById(result.rows[0].id);
  } catch (err) {
    if (err.code === PG_UNIQUE_VIOLATION) {
      return null;
    }
    throw err;
  }
}

// Ativa ou descarta várias sugestões de uma vez (ação em lote da tela de
// Cross-sell). Uma única query por operação em vez de N chamadas do
// frontend. Devolve quantas linhas foram efetivamente afetadas — ids
// inexistentes são simplesmente ignorados.
async function bulkSetActive(ids, active) {
  const numericIds = (ids || []).map(Number).filter((id) => Number.isInteger(id));
  if (numericIds.length === 0) return 0;

  // Ativar também limpa o descarte: uma oferta em uso não pode continuar
  // marcada como descartada.
  const result = await crmPool.query(
    `UPDATE complementary_products
        SET active = $1,
            dismissed_at = CASE WHEN $1 THEN NULL ELSE dismissed_at END
      WHERE id = ANY($2::int[])`,
    [active, numericIds]
  );
  return result.rowCount;
}

// Descartar NÃO apaga a linha: marca a decisão. Apagar faria o motor de
// detecção sugerir o mesmo par de novo na próxima execução (ele só ignora
// pares que já existem na tabela), e o "descartar" viraria um "adiar"
// eterno. Ver migration 041.
async function bulkDismiss(ids) {
  const numericIds = (ids || []).map(Number).filter((id) => Number.isInteger(id));
  if (numericIds.length === 0) return 0;

  const result = await crmPool.query(
    `UPDATE complementary_products
        SET dismissed_at = NOW(), active = false
      WHERE id = ANY($1::int[]) AND dismissed_at IS NULL`,
    [numericIds]
  );
  return result.rowCount;
}

// Volta atrás no descarte — a sugestão retorna para a lista de pendentes.
async function bulkRestore(ids) {
  const numericIds = (ids || []).map(Number).filter((id) => Number.isInteger(id));
  if (numericIds.length === 0) return 0;

  const result = await crmPool.query(
    'UPDATE complementary_products SET dismissed_at = NULL WHERE id = ANY($1::int[])',
    [numericIds]
  );
  return result.rowCount;
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
  createSuggestedComplementaryProduct,
  bulkSetActive,
  bulkDismiss,
  bulkRestore,
  toggleActive,
  deleteComplementaryProduct,
};
