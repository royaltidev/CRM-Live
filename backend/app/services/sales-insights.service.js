// "Jornadas de compra" e "itens sem venda" (Venda Inteligente — Parte 2,
// escopo novo fora do FSD original, mesma iniciativa da Parte 1 documentada
// em product-affinity.service.js). Arquivo IRMÃO daquele, não uma extensão
// dele: a Parte 1 calcula pares específicos de produto pra virar sugestão
// de cross-sell (com efeito colateral em `complementary_products`); este
// arquivo só produz relatórios agregados por CATEGORIA, sem confiança/
// threshold mínimo e SEM nenhum efeito colateral — é puramente informativo,
// pensado para consumo futuro pela tela dedicada de Venda Inteligente
// (Parte 3, fora desta tarefa).

const { crmPool } = require('../database/connection');

const JOURNEY_ITEMS_PER_CATEGORY = 10;

// Para cada categoria de produto, quais produtos (de qualquer categoria,
// inclusive a própria) mais aparecem na MESMA venda que produtos dessa
// categoria — "quando alguém compra algo da categoria X, o que mais
// aparece junto no carrinho". Reaproveita a mesma ideia de
// `sale_products` (vendas distintas por produto) do motor da Parte 1, mas
// agregada por categoria em vez de por par de produto, e sem os limiares
// de confiança/coOccurrence mínimo daquele motor (aqui não gera nenhuma
// sugestão automática, é só leitura de padrão observado).
//
// Cuidado de correção: um produto sozinho na venda não pode "co-ocorrer
// consigo mesmo" (senão toda venda de item único da categoria X inflaria
// artificialmente o próprio item como "acompanhante" de X). Por isso o
// JOIN exige que o produto acompanhante seja um `sale_items` DIFERENTE do
// produto específico que colocou aquela venda na categoria — permitindo
// ainda contar corretamente o caso de duas vendas de produtos diferentes
// da MESMA categoria juntos (ex.: duas cores de tinta no mesmo carrinho).
async function getPurchaseJourneys() {
  const result = await crmPool.query(
    `WITH sale_products AS (
       SELECT DISTINCT sale_id, product_id FROM sale_items WHERE product_id IS NOT NULL
     ),
     category_items AS (
       SELECT sp.sale_id, sp.product_id AS category_product_id, p.category AS category
       FROM sale_products sp
       JOIN products p ON p.id = sp.product_id
       WHERE p.category IS NOT NULL
     ),
     co_occurrence AS (
       SELECT ci.category, sp2.product_id AS companion_product_id,
              COUNT(DISTINCT ci.sale_id)::int AS co_occurrence_count
       FROM category_items ci
       JOIN sale_products sp2
         ON sp2.sale_id = ci.sale_id AND sp2.product_id != ci.category_product_id
       GROUP BY ci.category, sp2.product_id
     ),
     ranked AS (
       SELECT co.category, co.companion_product_id, co.co_occurrence_count,
              p.name AS companion_product_name, p.category AS companion_product_category,
              ROW_NUMBER() OVER (
                PARTITION BY co.category
                ORDER BY co.co_occurrence_count DESC, p.name ASC
              ) AS rank
       FROM co_occurrence co
       JOIN products p ON p.id = co.companion_product_id
     )
     SELECT category, companion_product_id, companion_product_name,
            companion_product_category, co_occurrence_count
     FROM ranked
     WHERE rank <= $1
     ORDER BY category ASC, co_occurrence_count DESC, companion_product_name ASC`,
    [JOURNEY_ITEMS_PER_CATEGORY]
  );

  return groupRowsByCategory(result.rows, (row) => ({
    productId: row.companion_product_id,
    productName: row.companion_product_name,
    productCategory: row.companion_product_category,
    coOccurrenceCount: row.co_occurrence_count,
  }));
}

// Para cada categoria, ranqueia os produtos ATIVOS por quantidade de vendas
// distintas no período em ordem CRESCENTE (menos vendido primeiro),
// incluindo produtos com ZERO vendas (LEFT JOIN, não INNER JOIN — senão um
// produto nunca vendido no período nunca apareceria, que é exatamente o
// caso mais importante pra esse relatório). Sem período informado,
// considera TODO o histórico (sem default de 30 dias, diferente do
// dashboard geral da Fase 11 Parte 1 — aqui o objetivo é achar item parado
// de catálogo, não uma janela recente).
//
// O filtro de período entra na condição do JOIN com `sales`, não no WHERE:
// isso preserva a linha do produto (LEFT JOIN) mesmo quando ele só tem
// vendas FORA do período pedido, contando corretamente `salesCount = 0`
// pra ele nesse caso — um WHERE equivalente devolveria o produto todo (ou
// o excluiria via NULL em campos de sales), quebrando a regra de "incluir
// produto sem venda no período".
//
// Sem limite de itens por categoria (diferente de `getPurchaseJourneys`):
// aqui o caso de uso é auditoria de catálogo parado, então a lista
// completa por categoria é o que interessa, não um top N.
async function getSlowMovingProducts({ startDate, endDate } = {}) {
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  const result = await crmPool.query(
    `SELECT p.category, p.id AS product_id, p.name AS product_name,
            COUNT(DISTINCT CASE WHEN s.id IS NOT NULL THEN si.sale_id END)::int AS sales_count
     FROM products p
     LEFT JOIN sale_items si ON si.product_id = p.id
     LEFT JOIN sales s
       ON s.id = si.sale_id
      AND ($1::timestamp IS NULL OR s.sale_date >= $1)
      AND ($2::timestamp IS NULL OR s.sale_date <= $2)
     WHERE p.active = true
     GROUP BY p.category, p.id, p.name
     ORDER BY p.category ASC, sales_count ASC, p.name ASC`,
    [start, end]
  );

  return groupRowsByCategory(result.rows, (row) => ({
    productId: row.product_id,
    productName: row.product_name,
    salesCount: row.sales_count,
  }));
}

// Agrupa linhas já ordenadas por `category` (vindas do SQL) em
// `{ category, items: [...] }` — a query já garante a ordem certa dentro
// de cada grupo, aqui é só particionar sem reordenar.
function groupRowsByCategory(rows, mapItem) {
  const groups = [];
  let current = null;

  for (const row of rows) {
    if (!current || current.category !== row.category) {
      current = { category: row.category, items: [] };
      groups.push(current);
    }
    current.items.push(mapItem(row));
  }

  return groups;
}

module.exports = {
  JOURNEY_ITEMS_PER_CATEGORY,
  getPurchaseJourneys,
  getSlowMovingProducts,
};
