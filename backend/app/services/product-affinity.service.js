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
// Regra de associação: para cada par ORDENADO (A, B) com A != B, calcula
// `coOccurrence` (vendas distintas com os dois produtos) e `confidence` =
// coOccurrence / vendas distintas de A ("de quem comprou A, que fração
// também levou B"). Um candidato só é considerado quando bate os dois
// limiares mínimos abaixo — evita sugerir com base numa coincidência
// isolada. Pares que já têm QUALQUER linha em `complementary_products`
// (manual ou sugerida antes, em qualquer direção) são ignorados, pra não
// duplicar. A descrição gerada pela IA não é persistida (o schema de
// `complementary_products` não tem campo pra isso) — aparece só no retorno
// desta chamada, como transparência imediata pra quem disparou a detecção.

const { crmPool } = require('../database/connection');
const automationSettingsService = require('./automation-settings.service');
const complementaryProductsService = require('./complementary-products.service');
const ai = require('../integrations/ai');

const MIN_CO_OCCURRENCE = 2;
const MIN_CONFIDENCE = 0.5;

async function findCandidatePairs() {
  const result = await crmPool.query(
    `WITH sale_products AS (
       SELECT DISTINCT sale_id, product_id FROM sale_items WHERE product_id IS NOT NULL
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
            (pc.co_occurrence::float / prod_a.total_sales) AS confidence
     FROM pair_counts pc
     JOIN product_counts prod_a ON prod_a.product_id = pc.product_a_id
     JOIN products pa ON pa.id = pc.product_a_id
     JOIN products pb ON pb.id = pc.product_b_id
     WHERE pc.co_occurrence >= $1
       AND (pc.co_occurrence::float / prod_a.total_sales) >= $2
       AND NOT EXISTS (
         SELECT 1 FROM complementary_products cp
         WHERE (cp.product_id = pc.product_a_id AND cp.complementary_product_id = pc.product_b_id)
            OR (cp.product_id = pc.product_b_id AND cp.complementary_product_id = pc.product_a_id)
       )
     ORDER BY confidence DESC, pc.co_occurrence DESC`,
    [MIN_CO_OCCURRENCE, MIN_CONFIDENCE]
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
  }));
}

// Roda o motor: encontra candidatos, opcionalmente refina por IA, e cria as
// sugestões aceitas em complementary_products (source='suggested',
// active=false — revisão fica na tela de Cross-sell já existente).
async function detectFrequentlyBoughtTogether() {
  const candidates = await findCandidatePairs();

  if (candidates.length === 0) {
    return { candidatesEvaluated: 0, suggestionsCreated: 0, aiUsed: false, aiError: null, suggestions: [] };
  }

  const descriptionByKey = new Map();
  let accepted = candidates;
  let aiUsed = false;
  let aiError = null;

  const aiEnabled = await automationSettingsService.getSmartSalesAiEnabled();
  if (aiEnabled) {
    try {
      const refined = await ai.refineProductAffinitySuggestions({
        candidates: candidates.map((c) => ({
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

      accepted = candidates.filter((c) => acceptedKeys.has(`${c.productAId}:${c.productBId}`));
      aiUsed = true;
    } catch (err) {
      // Fail-open: mantém todos os candidatos estatísticos (já filtrados
      // pelos limiares mínimos) em vez de bloquear a funcionalidade por
      // causa de uma falha pontual da IA.
      aiError = err.message;
    }
  }

  const suggestions = [];
  let suggestionsCreated = 0;

  for (const candidate of accepted) {
    const created = await complementaryProductsService.createSuggestedComplementaryProduct({
      productId: candidate.productAId,
      complementaryProductId: candidate.productBId,
    });

    if (created) suggestionsCreated += 1;

    suggestions.push({
      productAName: candidate.productAName,
      productBName: candidate.productBName,
      coOccurrence: candidate.coOccurrence,
      confidence: candidate.confidence,
      description: descriptionByKey.get(`${candidate.productAId}:${candidate.productBId}`) || null,
      created: Boolean(created),
    });
  }

  return { candidatesEvaluated: candidates.length, suggestionsCreated, aiUsed, aiError, suggestions };
}

module.exports = {
  MIN_CO_OCCURRENCE,
  MIN_CONFIDENCE,
  findCandidatePairs,
  detectFrequentlyBoughtTogether,
};
