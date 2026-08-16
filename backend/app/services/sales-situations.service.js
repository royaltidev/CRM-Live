// Motor de situações da Venda Inteligente (remodelagem de 14/08/2026,
// escopo novo pedido pelo responsável do projeto — substitui a visão "por
// grupo de mercadoria" da Parte 2 por agrupamento POR SITUAÇÃO DE PREJUÍZO).
//
// Classifica cada produto ativo em:
//   - critico          → atenção imediata (margem negativa, OU parado ≥ 90d
//                        com valor imobilizado acima da média dos parados,
//                        OU cobertura de estoque > 180 dias)
//   - queima_estoque   → saldo > 0 e sem venda ≥ 60d; preço de queima
//                        escalonado (−25% / −40% / −50%), sinalizando
//                        quando fica abaixo do custo
//   - parado           → saldo > 0 e sem venda ≥ 30d (severidade menor)
//   - margem_baixa     → margem < (média do grupo de mercadoria − 10 p.p.);
//                        independente de estoque (é decisão de PREÇO, não de
//                        giro), com preço sugerido para atingir a média
//
// Critérios embasados nas práticas consagradas de gestão de varejo (agir
// sobre estoque envelhecido aos 60–90 dias custa menos que depois; métricas
// de cobertura/weeks-of-supply e margem por grupo) — ver artefato de
// remodelagem apresentado ao responsável em 14/08/2026.
//
// Regras de exclusividade: os grupos de GIRO (critico / queima_estoque /
// parado) são mutuamente exclusivos, nessa ordem de prioridade. margem_baixa
// é independente e pode se sobrepor a qualquer um deles (o mesmo produto
// pode estar parado E com margem errada — são duas decisões diferentes).
//
// Custo usado nos cálculos: customedio (average_cost) com fallback para
// precocusto (cost_price) — zero é tratado como "custo desconhecido" (o
// Uniplus usa 0.000 como default de precocusto, não como custo real).
// Valor imobilizado usa o custo quando conhecido, senão o preço de venda
// (documentado no retorno via `valueBasis`).

const { crmPool } = require('../database/connection');

const PARADO_MIN_DAYS = 30;
const QUEIMA_MIN_DAYS = 60;
const CRITICO_MIN_DAYS = 90;
const COVERAGE_CRITICAL_DAYS = 180;
const MARGIN_GAP_PP = 10;
const MIN_PRODUCTS_FOR_GROUP_MARGIN = 3;
const BURN_DISCOUNT_TIERS = [0.25, 0.4, 0.5];

function round2(value) {
  return Math.round(value * 100) / 100;
}

// Snapshot por produto ativo com tudo que a classificação precisa: último
// saldo conhecido, última venda e unidades vendidas nos últimos 90 dias
// (para cobertura de estoque). Produto sem snapshot de estoque entra com
// saldo 0 (mesmo critério conservador do getSlowMovingProducts da Parte 2).
async function fetchProductSnapshots() {
  const result = await crmPool.query(
    `WITH latest_stock AS (
       SELECT DISTINCT ON (product_id) product_id, quantity
       FROM stock_snapshots
       ORDER BY product_id, synced_at DESC, id DESC
     ),
     product_sales AS (
       SELECT si.product_id,
              MAX(s.sale_date) AS last_sale_date,
              COALESCE(
                SUM(COALESCE(si.quantity, 1))
                  FILTER (WHERE s.sale_date >= NOW() - INTERVAL '90 days'),
                0
              )::float AS units_sold_90d
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       WHERE si.product_id IS NOT NULL
       GROUP BY si.product_id
     )
     SELECT p.id, p.name, p.category, p.price, p.cost_price, p.average_cost,
            COALESCE(ls.quantity, 0) AS stock_quantity,
            ps.last_sale_date,
            COALESCE(ps.units_sold_90d, 0) AS units_sold_90d
     FROM products p
     LEFT JOIN latest_stock ls ON ls.product_id = p.id
     LEFT JOIN product_sales ps ON ps.product_id = p.id
     WHERE p.active = true`
  );

  const now = Date.now();

  return result.rows.map((row) => {
    const price = row.price !== null ? Number(row.price) : null;
    const averageCost = row.average_cost !== null ? Number(row.average_cost) : null;
    const costPrice = row.cost_price !== null ? Number(row.cost_price) : null;
    // Zero = "sem custo cadastrado" no Uniplus, não custo real.
    const cost = averageCost && averageCost > 0 ? averageCost : costPrice && costPrice > 0 ? costPrice : null;

    const daysSinceLastSale = row.last_sale_date
      ? Math.floor((now - new Date(row.last_sale_date).getTime()) / (24 * 60 * 60 * 1000))
      : null; // null = nunca vendeu (tratado como "parado desde sempre")

    const stockQuantity = Number(row.stock_quantity);
    const valueBasis = cost !== null ? 'cost' : 'price';
    const unitValue = cost !== null ? cost : price !== null ? price : 0;

    return {
      productId: row.id,
      productName: row.name,
      category: row.category,
      price,
      cost,
      stockQuantity,
      stockValue: round2(stockQuantity * unitValue),
      valueBasis,
      lastSaleDate: row.last_sale_date,
      daysSinceLastSale,
      unitsSold90d: Number(row.units_sold_90d),
      margin: price && price > 0 && cost !== null ? (price - cost) / price : null,
    };
  });
}

// "Parado há pelo menos N dias": nunca vendeu conta como parado desde
// sempre — é exatamente o item de catálogo que os relatórios de giro
// precisam expor, não esconder.
function isStagnantForAtLeast(product, days) {
  return product.daysSinceLastSale === null || product.daysSinceLastSale >= days;
}

// Cobertura de estoque em dias (weeks of supply em dias): quanto tempo o
// saldo atual dura no ritmo de venda dos últimos 90 dias. Sem venda no
// período, a cobertura é indefinida (null) — o caso "não gira" já é coberto
// pelos critérios de estagnação.
function coverageDays(product) {
  if (product.unitsSold90d <= 0 || product.stockQuantity <= 0) return null;
  return Math.round(product.stockQuantity / (product.unitsSold90d / 90));
}

function classify(products) {
  // Média de valor imobilizado entre os estagnados 90d+ com saldo: separa o
  // "crítico" (capital relevante preso) da queima comum. Média simples e
  // determinística — explicável para o usuário final.
  const stagnant90 = products.filter((p) => p.stockQuantity > 0 && isStagnantForAtLeast(p, CRITICO_MIN_DAYS));
  const avgStagnantValue =
    stagnant90.length > 0 ? stagnant90.reduce((sum, p) => sum + p.stockValue, 0) / stagnant90.length : 0;

  // Margem média por grupo de mercadoria (categoria), só com margens
  // válidas e grupos com amostra mínima — média de 1–2 produtos não é
  // referência de precificação.
  const marginsByCategory = new Map();
  for (const p of products) {
    if (p.margin === null || !p.category) continue;
    if (!marginsByCategory.has(p.category)) marginsByCategory.set(p.category, []);
    marginsByCategory.get(p.category).push(p.margin);
  }
  const avgMarginByCategory = new Map();
  for (const [category, margins] of marginsByCategory) {
    if (margins.length >= MIN_PRODUCTS_FOR_GROUP_MARGIN) {
      avgMarginByCategory.set(category, margins.reduce((a, b) => a + b, 0) / margins.length);
    }
  }

  const critico = [];
  const queimaEstoque = [];
  const parado = [];
  const margemBaixa = [];

  for (const p of products) {
    const coverage = coverageDays(p);

    // --- grupos de giro (mutuamente exclusivos, prioridade: crítico > queima > parado)
    const hasNegativeMargin = p.margin !== null && p.margin < 0;
    const isCriticalStagnant =
      p.stockQuantity > 0 && isStagnantForAtLeast(p, CRITICO_MIN_DAYS) && p.stockValue >= avgStagnantValue && p.stockValue > 0;
    const hasCriticalCoverage = coverage !== null && coverage > COVERAGE_CRITICAL_DAYS;

    if (hasNegativeMargin || isCriticalStagnant || hasCriticalCoverage) {
      critico.push({
        ...p,
        coverageDays: coverage,
        reasons: [
          ...(hasNegativeMargin ? ['margem_negativa'] : []),
          ...(isCriticalStagnant ? ['parado_90d_valor_alto'] : []),
          ...(hasCriticalCoverage ? ['cobertura_estoque_alta'] : []),
        ],
      });
    } else if (p.stockQuantity > 0 && isStagnantForAtLeast(p, QUEIMA_MIN_DAYS)) {
      queimaEstoque.push({
        ...p,
        burnPrices:
          p.price && p.price > 0
            ? BURN_DISCOUNT_TIERS.map((discount) => {
                const burnPrice = round2(p.price * (1 - discount));
                return {
                  discountPercent: Math.round(discount * 100),
                  price: burnPrice,
                  belowCost: p.cost !== null ? burnPrice < p.cost : null,
                };
              })
            : [],
      });
    } else if (p.stockQuantity > 0 && isStagnantForAtLeast(p, PARADO_MIN_DAYS)) {
      parado.push(p);
    }

    // --- margem baixa (independente dos grupos de giro)
    const groupAvgMargin = p.category ? avgMarginByCategory.get(p.category) : undefined;
    if (
      p.margin !== null &&
      groupAvgMargin !== undefined &&
      p.margin < groupAvgMargin - MARGIN_GAP_PP / 100
    ) {
      // Preço para atingir a margem média do grupo: preço = custo / (1 − margem).
      const suggestedPrice = groupAvgMargin < 1 ? round2(p.cost / (1 - groupAvgMargin)) : null;
      margemBaixa.push({
        ...p,
        groupAvgMargin,
        suggestedPrice,
      });
    }
  }

  // Ordenações pensadas para decisão: maior valor imobilizado primeiro nos
  // grupos de giro; maior distância da média primeiro na margem.
  const byStockValueDesc = (a, b) => b.stockValue - a.stockValue || a.productName.localeCompare(b.productName);
  critico.sort(byStockValueDesc);
  queimaEstoque.sort(byStockValueDesc);
  parado.sort(byStockValueDesc);
  margemBaixa.sort(
    (a, b) => (a.margin - a.groupAvgMargin) - (b.margin - b.groupAvgMargin) || a.productName.localeCompare(b.productName)
  );

  return { critico, queimaEstoque, parado, margemBaixa };
}

// Detalhe completo por situação — consumido pela tela de Venda Inteligente.
async function getSituations() {
  const products = await fetchProductSnapshots();
  const groups = classify(products);

  return {
    generatedAt: new Date().toISOString(),
    criteria: {
      paradoMinDays: PARADO_MIN_DAYS,
      queimaMinDays: QUEIMA_MIN_DAYS,
      criticoMinDays: CRITICO_MIN_DAYS,
      coverageCriticalDays: COVERAGE_CRITICAL_DAYS,
      marginGapPp: MARGIN_GAP_PP,
      burnDiscountTiers: BURN_DISCOUNT_TIERS.map((d) => Math.round(d * 100)),
    },
    groups,
  };
}

// Resumo numérico — consumido pelo card do Dashboard. Inclui a contagem de
// sugestões de cross-sell pendentes (complementary_products) para o quinto
// bloco do card, evitando uma segunda chamada do frontend.
async function getOverview() {
  const [products, pendingCrossSell] = await Promise.all([
    fetchProductSnapshots(),
    // Pendente = sugestão automática ainda não ativada E ainda não
    // descartada. O `dismissed_at IS NULL` é essencial desde a migration
    // 041: sem ele, sugestões que o usuário já descartou continuariam
    // contando como decisão pendente no card do Dashboard, para sempre.
    crmPool.query(
      `SELECT COUNT(*)::int AS count
         FROM complementary_products
        WHERE source = 'suggested' AND active = false AND dismissed_at IS NULL`
    ),
  ]);

  const { critico, queimaEstoque, parado, margemBaixa } = classify(products);

  const sumStockValue = (items) => round2(items.reduce((sum, p) => sum + p.stockValue, 0));

  // Capital parado = tudo com saldo > 0 sem venda ≥ 30d. Dos críticos, só
  // entram os realmente estagnados — item crítico por margem negativa ou
  // cobertura alta pode estar vendendo normalmente e não é capital preso.
  // Queima e parado já são estagnados por definição. Margem baixa fica de
  // fora: é problema de preço, não de capital.
  const stagnantCritico = critico.filter((p) => p.stockQuantity > 0 && isStagnantForAtLeast(p, PARADO_MIN_DAYS));
  const stagnantValue = round2(sumStockValue(stagnantCritico) + sumStockValue(queimaEstoque) + sumStockValue(parado));

  // Recuperação estimada com queima: saldo × preço de queima do degrau
  // intermediário (−40%) dos itens do grupo de queima.
  const midTier = BURN_DISCOUNT_TIERS[1];
  const burnRecovery = round2(
    queimaEstoque.reduce((sum, p) => sum + (p.price && p.price > 0 ? p.stockQuantity * p.price * (1 - midTier) : 0), 0)
  );

  return {
    generatedAt: new Date().toISOString(),
    counts: {
      critico: critico.length,
      queimaEstoque: queimaEstoque.length,
      margemBaixa: margemBaixa.length,
      parado: parado.length,
      crossSellPending: pendingCrossSell.rows[0].count,
    },
    totals: {
      stagnantStockValue: stagnantValue,
      criticoStockValue: sumStockValue(critico),
      burnRecoveryEstimate: burnRecovery,
      productsNeedingDecision: new Set(
        [...critico, ...queimaEstoque, ...parado, ...margemBaixa].map((p) => p.productId)
      ).size,
    },
  };
}

module.exports = {
  PARADO_MIN_DAYS,
  QUEIMA_MIN_DAYS,
  CRITICO_MIN_DAYS,
  COVERAGE_CRITICAL_DAYS,
  MARGIN_GAP_PP,
  MIN_PRODUCTS_FOR_GROUP_MARGIN,
  BURN_DISCOUNT_TIERS,
  classify,
  getSituations,
  getOverview,
};
