// Motor de detecção de "produtos frequentemente comprados juntos" (Venda
// Inteligente — escopo novo, fora do FSD original, pedido pelo responsável
// do projeto em 14/08/2026). Fecha a pendência documentada em
// complementary-products.service.js desde a Fase 8 Parte 4 ("a revisão de
// sugestões automáticas... fica pendente pra quando esse critério for
// definido; o schema já suporta 'suggested'").
//
// Arquitetura (confirmada com o responsável): a CONTAGEM é sempre feita por
// SQL (determinístico, sem custo por chamada — contar milhares de vendas
// não é trabalho pra uma LLM). A IA (DeepSeek, reaproveitando
// backend/app/integrations/ai/) entra só como refinamento OPCIONAL sobre os
// candidatos já filtrados estatisticamente: ajuda a descartar coincidências
// e escrever uma descrição legível de por que a sugestão faz sentido. Mesmo
// padrão arquitetural da classificação de intenção de lead (Fase 9): toggle
// (`smart_sales_ai_enabled`) + fallback automático pros candidatos
// estatísticos puros se a IA estiver desativada ou falhar — nunca bloqueia
// a funcionalidade por causa da IA.
//
// ---------------------------------------------------------------------------
// CRITÉRIO (revisado em 14/08/2026 — o anterior gerava ruído, não padrão)
// ---------------------------------------------------------------------------
// O critério original (co-ocorrência ≥ 2 e confiança ≥ 50%) produzia
// milhares de pares sem valor: um produto com 2 vendas em conjunto com
// centenas de outros itens é o COMUM do carrinho, não um padrão que ajude a
// vender mais. Duas mudanças corrigem isso:
//
// 1. Limiares de incidência mais altos (co-ocorrência ≥ 5, confiança ≥ 30%)
//    — só entram pares com repetição suficiente pra não ser coincidência.
//
// 2. LIFT em vez de contagem bruta, e sem limiar fixo: o lift compara o que
//    de fato acontece com o que aconteceria por acaso —
//        lift = P(A e B) / (P(A) × P(B))
//    Lift 1 significa "esses produtos aparecem juntos exatamente como o
//    acaso previa" (é o caso do item popular que aparece junto com tudo).
//    Como o responsável pediu explicitamente, o sistema não usa um corte
//    arbitrário (tipo "lift ≥ 2"): ele analisa a DISTRIBUIÇÃO dos lifts dos
//    candidatos e sugere apenas os PONTOS FORA DA CURVA — pelo critério de
//    Tukey, lift acima de Q3 + 1,5 × IQR. Assim o corte se adapta ao próprio
//    catálogo: numa loja onde quase tudo tem lift ~1,2, um lift 2 é
//    excepcional; noutra onde o normal já é 3, ele não é.
//
// Amostra pequena (menos de MIN_SAMPLE_FOR_OUTLIERS candidatos aprovados nos
// limiares) não tem distribuição pra analisar — nesse caso todos os
// candidatos aprovados são mantidos, e o retorno sinaliza isso em
// `outlierAnalysisApplied: false`.

const { crmPool } = require('../database/connection');
const automationSettingsService = require('./automation-settings.service');
const complementaryProductsService = require('./complementary-products.service');
const ai = require('../integrations/ai');

const MIN_CO_OCCURRENCE = 5;
const MIN_CONFIDENCE = 0.3;
const MIN_LIFT = 1; // abaixo/igual a 1 o par é indiferente ou pior que o acaso
const MIN_SAMPLE_FOR_OUTLIERS = 8;
const OUTLIER_IQR_MULTIPLIER = 1.5;

// Quantil por interpolação linear sobre uma lista JÁ ORDENADA (mesma
// definição do método 7 do R / default do numpy).
function quantile(sortedValues, q) {
  if (sortedValues.length === 0) return null;
  if (sortedValues.length === 1) return sortedValues[0];

  const position = (sortedValues.length - 1) * q;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  if (lowerIndex === upperIndex) return sortedValues[lowerIndex];

  const weight = position - lowerIndex;
  return sortedValues[lowerIndex] * (1 - weight) + sortedValues[upperIndex] * weight;
}

// Limite superior de Tukey sobre os lifts: acima dele o par é um ponto fora
// da curva em relação aos outros candidatos do mesmo catálogo.
function computeLiftOutlierThreshold(candidates) {
  const lifts = candidates.map((c) => c.lift).sort((a, b) => a - b);
  const q1 = quantile(lifts, 0.25);
  const q3 = quantile(lifts, 0.75);
  return q3 + OUTLIER_IQR_MULTIPLIER * (q3 - q1);
}

// Candidatos que passam nos limiares de incidência. `confidence` responde
// "de quem comprou A, que fração também levou B"; `lift` responde "isso é
// mais do que o acaso?" (ver cabeçalho).
async function findCandidatePairs() {
  const result = await crmPool.query(
    `WITH sale_products AS (
       SELECT DISTINCT sale_id, product_id FROM sale_items WHERE product_id IS NOT NULL
     ),
     total_sales AS (
       SELECT COUNT(DISTINCT sale_id)::float AS count FROM sale_products
     ),
     pair_counts AS (
       SELECT a.product_id AS product_a_id, b.product_id AS product_b_id,
              COUNT(DISTINCT a.sale_id)::int AS co_occurrence
       FROM sale_products a
       JOIN sale_products b ON a.sale_id = b.sale_id AND a.product_id != b.product_id
       GROUP BY a.product_id, b.product_id
     ),
     product_counts AS (
       SELECT product_id, COUNT(DISTINCT sale_id)::int AS total_sales
       FROM sale_products
       GROUP BY product_id
     )
     SELECT pc.product_a_id, pa.name AS product_a_name, pa.category AS product_a_category,
            pc.product_b_id, pb.name AS product_b_name, pb.category AS product_b_category,
            pc.co_occurrence,
            (pc.co_occurrence::float / prod_a.total_sales) AS confidence,
            -- lift = P(A e B) / (P(A) × P(B)), simplificado pela contagem
            -- total de vendas: (co_occurrence × total) / (vendas_A × vendas_B)
            ((pc.co_occurrence::float * ts.count) / (prod_a.total_sales::float * prod_b.total_sales::float)) AS lift
     FROM pair_counts pc
     CROSS JOIN total_sales ts
     JOIN product_counts prod_a ON prod_a.product_id = pc.product_a_id
     JOIN product_counts prod_b ON prod_b.product_id = pc.product_b_id
     JOIN products pa ON pa.id = pc.product_a_id
     JOIN products pb ON pb.id = pc.product_b_id
     WHERE pc.co_occurrence >= $1
       AND (pc.co_occurrence::float / prod_a.total_sales) >= $2
       AND ((pc.co_occurrence::float * ts.count) / (prod_a.total_sales::float * prod_b.total_sales::float)) > $3
       AND NOT EXISTS (
         SELECT 1 FROM complementary_products cp
         WHERE (cp.product_id = pc.product_a_id AND cp.complementary_product_id = pc.product_b_id)
            OR (cp.product_id = pc.product_b_id AND cp.complementary_product_id = pc.product_a_id)
       )
     ORDER BY lift DESC, pc.co_occurrence DESC`,
    [MIN_CO_OCCURRENCE, MIN_CONFIDENCE, MIN_LIFT]
  );

  return result.rows.map((row) => ({
    productAId: row.product_a_id,
    productAName: row.product_a_name,
    productACategory: row.product_a_category,
    productBId: row.product_b_id,
    productBName: row.product_b_name,
    productBCategory: row.product_b_category,
    coOccurrence: row.co_occurrence,
    confidence: Number(row.confidence),
    lift: Number(row.lift),
  }));
}

// Roda o motor: encontra candidatos, mantém só os pontos fora da curva de
// lift, opcionalmente refina por IA, e cria as sugestões em
// complementary_products (source='suggested', active=false — a decisão é do
// usuário, na tela de Cross-sell).
async function detectFrequentlyBoughtTogether() {
  const candidates = await findCandidatePairs();

  const emptyResult = {
    candidatesEvaluated: candidates.length,
    suggestionsCreated: 0,
    outlierAnalysisApplied: false,
    liftThreshold: null,
    aiUsed: false,
    aiError: null,
    suggestions: [],
  };

  if (candidates.length === 0) return emptyResult;

  // Pontos fora da curva do lift — o corte que o catálogo define, em vez de
  // um limiar arbitrário. Amostra pequena demais fica sem análise (todos os
  // candidatos aprovados nos limiares são mantidos).
  const outlierAnalysisApplied = candidates.length >= MIN_SAMPLE_FOR_OUTLIERS;
  const liftThreshold = outlierAnalysisApplied ? computeLiftOutlierThreshold(candidates) : null;
  let accepted = outlierAnalysisApplied ? candidates.filter((c) => c.lift > liftThreshold) : candidates;

  if (accepted.length === 0) {
    return { ...emptyResult, outlierAnalysisApplied, liftThreshold };
  }

  const descriptionByKey = new Map();
  let aiUsed = false;
  let aiError = null;

  const aiEnabled = await automationSettingsService.getSmartSalesAiEnabled();
  if (aiEnabled) {
    try {
      const refined = await ai.refineProductAffinitySuggestions({
        candidates: accepted.map((c) => ({
          productAId: c.productAId,
          productAName: c.productAName,
          productACategory: c.productACategory,
          productBId: c.productBId,
          productBName: c.productBName,
          productBCategory: c.productBCategory,
          coOccurrence: c.coOccurrence,
          confidence: c.confidence,
        })),
      });

      const acceptedKeys = new Set();
      for (const r of refined) {
        const key = `${r.productAId}:${r.productBId}`;
        if (r.accept) {
          acceptedKeys.add(key);
          if (r.description) descriptionByKey.set(key, r.description);
        }
      }

      accepted = accepted.filter((c) => acceptedKeys.has(`${c.productAId}:${c.productBId}`));
      aiUsed = true;
    } catch (err) {
      // Fail-open: mantém os candidatos estatísticos (já filtrados pelos
      // limiares e pela análise de outliers) em vez de bloquear a
      // funcionalidade por causa de uma falha pontual da IA.
      aiError = err.message;
    }
  }

  const suggestions = [];
  let suggestionsCreated = 0;

  for (const candidate of accepted) {
    const created = await complementaryProductsService.createSuggestedComplementaryProduct({
      productId: candidate.productAId,
      complementaryProductId: candidate.productBId,
      coOccurrence: candidate.coOccurrence,
      confidence: candidate.confidence,
      lift: candidate.lift,
    });

    if (created) suggestionsCreated += 1;

    suggestions.push({
      productAName: candidate.productAName,
      productBName: candidate.productBName,
      coOccurrence: candidate.coOccurrence,
      confidence: candidate.confidence,
      lift: candidate.lift,
      description: descriptionByKey.get(`${candidate.productAId}:${candidate.productBId}`) || null,
      created: Boolean(created),
    });
  }

  return {
    candidatesEvaluated: candidates.length,
    suggestionsCreated,
    outlierAnalysisApplied,
    liftThreshold,
    aiUsed,
    aiError,
    suggestions,
  };
}

module.exports = {
  MIN_CO_OCCURRENCE,
  MIN_CONFIDENCE,
  MIN_LIFT,
  MIN_SAMPLE_FOR_OUTLIERS,
  OUTLIER_IQR_MULTIPLIER,
  quantile,
  computeLiftOutlierThreshold,
  findCandidatePairs,
  detectFrequentlyBoughtTogether,
};
