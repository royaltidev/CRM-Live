// Ponto de integração entre a sincronização com o Uniplus (Fase 4) e o motor
// de réguas de relacionamento (Fase 7).
//
// Contexto funcional (docs/FSD.md, seção 13.10, passo 5): ao final de cada
// sincronização, o sistema deve acionar as automações relacionadas às novas
// vendas (agradecimento pós-venda, incentivo ao cadastro) e às mudanças de
// estoque (aviso de volta ao estoque).
//
// A assinatura destas funções NÃO deve mudar, para não quebrar o chamador em
// sync.service.js.

const { crmPool } = require('../database/connection');
const rulesEngine = require('./rules-engine.service');
const welcomeCouponService = require('./welcome-coupon.service');

// Nome de um produto da venda para a variável {{produto}} do template.
// Vendas com vários itens usam o primeiro: o FSD não define critério de
// escolha e a mensagem de agradecimento é sobre a compra, não sobre um item
// específico. Sem itens, a variável fica vazia (o motor já remove o
// placeholder em vez de deixá-lo literal na mensagem).
async function findRepresentativeProductName(saleId) {
  const result = await crmPool.query(
    `SELECT p.name
       FROM sale_items si
       JOIN products p ON p.id = si.product_id
      WHERE si.sale_id = $1
      LIMIT 1`,
    [saleId]
  );
  return result.rows.length > 0 ? result.rows[0].name : '';
}

// Régua de agradecimento pós-venda (FSD 6.3). O Administrador pode ter uma
// régua para primeira compra e outra para compra recorrente — a condição
// `isFirstPurchase` da régua diz a qual caso ela se aplica. Régua sem essa
// condição definida vale para qualquer venda.
async function runThankYouRules({ sale, customer, productName, isFirstPurchase }) {
  const rules = await rulesEngine.getActiveRulesByTrigger('sale_created');

  for (const rule of rules) {
    const expected = rule.conditions ? rule.conditions.isFirstPurchase : undefined;
    if (expected !== undefined && Boolean(expected) !== isFirstPurchase) {
      continue;
    }

    await rulesEngine.attemptRuleExecution({
      ruleId: rule.id,
      customerId: customer.id,
      triggerReference: `sale-${sale.id}`,
      templateVariables: {
        nome: customer.name,
        produto: productName,
        valor: sale.total_amount,
      },
    });
  }
}

// Régua de incentivo ao cadastro (FSD 6.1, gatilho first_identified_purchase):
// só na primeira venda vinculada ao cliente no CRM Live, e só se o
// Administrador já configurou o percentual de desconto do cupom.
async function runFirstPurchaseRules({ sale, customer }) {
  const rules = await rulesEngine.getActiveRulesByTrigger('first_identified_purchase');

  for (const rule of rules) {
    const coupon = await welcomeCouponService.generateWelcomeCoupon({
      customerId: customer.id,
      createdBy: rule.createdBy,
    });

    if (!coupon) {
      // Percentual de desconto ainda não configurado (pending_configuration):
      // não é erro, a régua simplesmente não roda até o parâmetro existir.
      continue;
    }

    await rulesEngine.attemptRuleExecution({
      ruleId: rule.id,
      customerId: customer.id,
      triggerReference: `first-purchase-${sale.id}`,
      templateVariables: {
        nome: customer.name,
        cupom: coupon.code,
      },
    });
  }
}

async function processNewSale(saleId) {
  const saleResult = await crmPool.query(
    'SELECT id, customer_id, seller_id, sale_date, total_amount FROM sales WHERE id = $1',
    [saleId]
  );
  const sale = saleResult.rows[0];
  if (!sale) {
    return;
  }

  // Venda sem cliente identificado: nenhuma régua de relacionamento se
  // aplica (não há a quem enviar).
  if (!sale.customer_id) {
    return;
  }

  const customerResult = await crmPool.query('SELECT id, name FROM customers WHERE id = $1', [
    sale.customer_id,
  ]);
  const customer = customerResult.rows[0];
  if (!customer) {
    return;
  }

  // Primeira compra = esta venda recém-sincronizada é a única já registrada
  // para o cliente no CRM Live.
  const countResult = await crmPool.query(
    'SELECT COUNT(*)::int AS total FROM sales WHERE customer_id = $1',
    [sale.customer_id]
  );
  const totalSales = countResult.rows[0] ? countResult.rows[0].total : 0;
  const isFirstPurchase = totalSales <= 1;

  const productName = await findRepresentativeProductName(sale.id);

  await runThankYouRules({ sale, customer, productName, isFirstPurchase });

  if (isFirstPurchase) {
    await runFirstPurchaseRules({ sale, customer });
  }
}

// Notifica o motor de automações sobre vendas RECÉM-CRIADAS nesta
// sincronização (apenas inserts, nunca atualizações de vendas já conhecidas —
// caso contrário toda venda dispararia régua a cada execução do job).
// saleIds: array de `sales.id` (ids do CRM Live, não do Uniplus).
async function notifyNewSales(saleIds) {
  const ids = Array.isArray(saleIds) ? saleIds : [];

  let processed = 0;
  for (const saleId of ids) {
    // Cada venda é isolada: falha em uma não pode interromper as demais nem
    // abortar a sincronização que chamou este hook.
    try {
      await processNewSale(saleId);
      processed += 1;
    } catch (err) {
      console.error(
        `[automation-trigger] Falha ao processar réguas da venda ${saleId}:`,
        err.message
      );
    }
  }

  return { notified: ids.length, processed };
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
