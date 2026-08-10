// Ponto de integração entre a sincronização com o Uniplus (Fase 4) e o motor
// de réguas de relacionamento (Fase 7).
//
// STUB — o motor de réguas real é construído na Fase 7; estas funções existem
// para o job de sincronização já ter o ponto de integração correto, sem
// precisar ser alterado quando a Fase 7 chegar. Por enquanto, apenas registram
// no log quantos itens seriam notificados.
//
// Contexto funcional (docs/FSD.md, seção 13.10, passo 5): ao final de cada
// sincronização, o sistema deve acionar as automações relacionadas às novas
// vendas (agradecimento, cross-sell) e às mudanças de estoque (aviso de volta
// ao estoque).
//
// Quando a Fase 7 for implementada, o corpo destas funções passa a enfileirar
// as execuções de régua correspondentes (tabelas `automation_rules` /
// `automation_rule_executions`, migrations 012 e 013) — a assinatura NÃO deve
// mudar, para não quebrar o chamador em sync.service.js.

// Notifica o motor de automações sobre vendas RECÉM-CRIADAS nesta
// sincronização (apenas inserts, nunca atualizações de vendas já conhecidas —
// caso contrário toda venda dispararia régua a cada execução do job).
// saleIds: array de `sales.id` (ids do CRM Live, não do Uniplus).
async function notifyNewSales(saleIds) {
  const ids = Array.isArray(saleIds) ? saleIds : [];

  console.log(
    `[automation-trigger] (stub Fase 7) ${ids.length} venda(s) nova(s) seriam ` +
      'notificadas ao motor de réguas (agradecimento, cross-sell).'
  );

  return { notified: ids.length };
}

// Notifica o motor de automações sobre produtos que voltaram ao estoque
// (transição de quantidade zerada/negativa para disponível entre o snapshot
// anterior e o snapshot desta execução).
// productIds: array de `products.id` (ids do CRM Live, não do Uniplus).
async function notifyStockReplenished(productIds) {
  const ids = Array.isArray(productIds) ? productIds : [];

  console.log(
    `[automation-trigger] (stub Fase 7) ${ids.length} produto(s) voltaram ao ` +
      'estoque e seriam notificados ao motor de réguas (aviso de volta ao estoque).'
  );

  return { notified: ids.length };
}

module.exports = {
  notifyNewSales,
  notifyStockReplenished,
};
