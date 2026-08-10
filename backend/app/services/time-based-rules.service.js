// Réguas de relacionamento orientadas a TEMPO (FSD seções 6.3, 12.5, 13.3,
// 14.3). São as réguas que não têm um evento de sistema disparando o envio:
// quem as avalia é um job periódico (backend/app/jobs/automation-rules.job.js),
// que a cada ciclo pergunta "quem está elegível AGORA?".
//
// Gatilhos cobertos aqui:
//   - 'birthday'              -> checkBirthdays()
//   - 'days_without_purchase' -> checkWinback()        (win-back em cascata)
//   - 'consumption_cycle'     -> checkConsumptionCycle() (recompra por produto)
//   - 'nps_survey'            -> checkNpsSurveys()
//
// Os gatilhos orientados a evento ('sale_created', 'first_identified_purchase')
// vivem em automation-trigger.service.js. O gatilho 'stock_replenished' foi
// adiado para uma fase futura e NÃO é implementado aqui.
//
// Toda a mecânica de envio (deduplicação, consentimento, renderização do
// template, criação de conversa, registro em automation_rule_executions) é do
// motor central — rules-engine.service.js. Este módulo só responde a duas
// perguntas por régua: (1) quais clientes estão elegíveis e (2) qual é a
// `trigger_reference` daquele evento.

const { crmPool } = require('../database/connection');
const rulesEngine = require('./rules-engine.service');
const automationRulesService = require('./automation-rules.service');
const automationSettings = require('./automation-settings.service');

// --------------------------------------------------------------------------
// Utilitários internos
// --------------------------------------------------------------------------

// Normaliza uma data vinda do banco (o driver `pg` devolve Date para colunas
// TIMESTAMP, mas queries agregadas/mocks podem devolver string) para o formato
// ISO usado na composição da trigger_reference. Retorna null se não houver
// data — quem chama decide o que fazer nesse caso.
function toIsoString(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

// Extrai um número positivo de `conditions` (as condições da régua são um
// JSONB livre — o valor pode chegar como número ou como string digitada na
// tela). Retorna null quando ausente/inválido: régua ainda não configurada.
function positiveNumberFromConditions(conditions, key) {
  if (!conditions || typeof conditions !== 'object') return null;
  const raw = conditions[key];
  if (raw === undefined || raw === null || raw === '') return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

// Acumulador de resultado usado por todas as funções de verificação, para que
// o job possa logar um resumo padronizado de cada ciclo.
function createSummary() {
  return {
    rulesEvaluated: 0,
    rulesSkipped: 0, // régua ativa mas sem condição configurada
    attempted: 0,
    sent: 0,
    skippedNoConsent: 0,
    skippedDuplicate: 0,
    failed: 0,
  };
}

function countResult(summary, result) {
  summary.attempted += 1;
  if (!result || !result.status) {
    summary.failed += 1;
    return;
  }
  if (result.status === 'sent') summary.sent += 1;
  else if (result.status === 'skipped_no_consent') summary.skippedNoConsent += 1;
  else if (result.status === 'skipped_duplicate') summary.skippedDuplicate += 1;
  else summary.failed += 1;
}

// Executa uma régua para um cliente isolando a falha: um erro inesperado em um
// cliente não pode interromper o processamento dos demais (o job roda sem
// supervisão; abortar o lote inteiro por causa de um registro ruim deixaria
// todos os outros clientes sem mensagem).
async function safeAttempt(summary, params) {
  try {
    const result = await rulesEngine.attemptRuleExecution(params);
    countResult(summary, result);
    return result;
  } catch (err) {
    summary.attempted += 1;
    summary.failed += 1;
    console.error(
      `[time-based-rules] Falha ao executar régua ${params.ruleId} para cliente ${params.customerId}:`,
      err.message
    );
    return { status: 'failed', executionId: null, messageId: null, error: err.message };
  }
}

// --------------------------------------------------------------------------
// 1. Aniversário (trigger_type = 'birthday')
// --------------------------------------------------------------------------

// Clientes que fazem aniversário HOJE (dia e mês, ignorando o ano — o ano de
// nascimento não importa e `birth_date` é opcional no cadastro).
async function findBirthdayCustomers() {
  const result = await crmPool.query(
    `SELECT id, name
       FROM customers
      WHERE birth_date IS NOT NULL
        AND EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(DAY FROM birth_date) = EXTRACT(DAY FROM CURRENT_DATE)`
  );
  return result.rows;
}

async function checkBirthdays() {
  const summary = createSummary();
  const rules = await rulesEngine.getActiveRulesByTrigger('birthday');
  if (rules.length === 0) {
    return summary;
  }

  // A lista de aniversariantes é a mesma para todas as réguas de aniversário —
  // uma consulta só, reaproveitada.
  const customers = await findBirthdayCustomers();
  const year = new Date().getFullYear();

  for (const rule of rules) {
    summary.rulesEvaluated += 1;
    for (const customer of customers) {
      // O ano na referência garante no máximo um envio por cliente por régua
      // por ano; o dedup do motor cuida das várias execuções do job no mesmo dia.
      await safeAttempt(summary, {
        ruleId: rule.id,
        customerId: customer.id,
        triggerReference: `birthday-${customer.id}-${year}`,
        templateVariables: { nome: customer.name },
      });
    }
  }

  return summary;
}

// --------------------------------------------------------------------------
// 2. Reativação / win-back (trigger_type = 'days_without_purchase')
// --------------------------------------------------------------------------
//
// Cada régua ativa desse tipo é UMA ETAPA da cascata (ex.: 30/60/90/180 dias).
// O número de dias fica em `rule.conditions.days`, editado na própria régua
// pelo Administrador ou Acesso limitado (FSD 12.5 e 20 — este parâmetro
// explicitamente NÃO fica na tela de Configurações).

// Referência do evento "cliente inativo desde <last_purchase_at>".
//
// Incluir `last_purchase_at` é o que encerra a régua automaticamente quando o
// cliente volta a comprar (FSD 13.3, passo 6), sem tabela de estado: assim que
// uma nova venda é sincronizada, `last_purchase_at` muda e o ciclo antigo deixa
// de existir — a condição de dias passa a ser avaliada contra a nova data, e o
// disparo anterior nunca é reavaliado. Se o cliente ficar inativo de novo, é um
// ciclo novo, com referência nova, e a cascata recomeça.
function buildWinbackTriggerReference(rule, customerId, lastPurchaseAt) {
  const step = rule.cascadeStep === null || rule.cascadeStep === undefined ? rule.id : rule.cascadeStep;
  const cycle = toIsoString(lastPurchaseAt) || 'none';
  return `winback-step${step}-${customerId}-${cycle}`;
}

// Clientes sem comprar há pelo menos `days` dias. `daysSincePurchase` é
// calculado no banco (mesma referência de tempo da condição) para a tela de
// clientes elegíveis por etapa.
async function findInactiveCustomers(days) {
  const result = await crmPool.query(
    `SELECT id,
            name,
            last_purchase_at,
            FLOOR(EXTRACT(EPOCH FROM (NOW() - last_purchase_at)) / 86400)::int AS days_since_purchase
       FROM customers
      WHERE last_purchase_at IS NOT NULL
        AND last_purchase_at <= NOW() - ($1::text || ' days')::interval
      ORDER BY last_purchase_at ASC`,
    [String(days)]
  );
  return result.rows;
}

async function checkWinback() {
  const summary = createSummary();
  const rules = await rulesEngine.getActiveRulesByTrigger('days_without_purchase');

  for (const rule of rules) {
    const days = positiveNumberFromConditions(rule.conditions, 'days');
    if (days === null) {
      // Régua ativa mas ainda sem o número de dias configurado: não é erro,
      // simplesmente não há como saber quem está elegível. Não dispara.
      summary.rulesSkipped += 1;
      continue;
    }

    summary.rulesEvaluated += 1;
    const customers = await findInactiveCustomers(days);

    for (const customer of customers) {
      await safeAttempt(summary, {
        ruleId: rule.id,
        customerId: customer.id,
        triggerReference: buildWinbackTriggerReference(rule, customer.id, customer.last_purchase_at),
        templateVariables: { nome: customer.name },
      });
    }
  }

  return summary;
}

// Clientes elegíveis para uma etapa específica do win-back, com indicação de se
// a régua já foi executada para o ciclo de inatividade atual (FSD 12.5: "tela
// de clientes elegíveis por etapa, com filtro por tempo sem comprar").
//
// Reaproveita exatamente a mesma consulta e a mesma composição de
// trigger_reference usadas pelo job — a tela nunca pode divergir do que o job
// de fato faria.
async function listWinbackEligibleCustomers({ ruleId }) {
  const rule = await automationRulesService.getRuleById(ruleId);
  if (!rule) {
    throw new Error('Régua não encontrada.');
  }
  if (rule.triggerType !== 'days_without_purchase') {
    throw new Error('A régua informada não é uma régua de reativação (days_without_purchase).');
  }

  const days = positiveNumberFromConditions(rule.conditions, 'days');
  if (days === null) {
    // Régua sem "dias sem comprar" definido: não há critério de elegibilidade.
    return [];
  }

  const customers = await findInactiveCustomers(days);
  if (customers.length === 0) {
    return [];
  }

  // Uma única consulta às execuções já registradas para essa régua, restrita aos
  // clientes elegíveis, em vez de uma consulta por cliente.
  const executions = await crmPool.query(
    `SELECT customer_id, trigger_reference
       FROM automation_rule_executions
      WHERE automation_rule_id = $1
        AND customer_id = ANY($2::int[])`,
    [ruleId, customers.map((c) => c.id)]
  );
  const executedReferences = new Set(executions.rows.map((row) => row.trigger_reference));

  return customers.map((customer) => ({
    customerId: customer.id,
    customerName: customer.name,
    lastPurchaseAt: customer.last_purchase_at,
    daysSincePurchase: customer.days_since_purchase,
    alreadyNotifiedThisCycle: executedReferences.has(
      buildWinbackTriggerReference(rule, customer.id, customer.last_purchase_at)
    ),
  }));
}

// Reenvio manual de uma etapa do win-back (FSD 12.5: "opção de reenvio
// manual"). Usa uma trigger_reference distinta (sufixo "manual-<timestamp>")
// para que o dedup do ciclo não bloqueie um reenvio pedido explicitamente por
// um usuário — mas passa pelo MESMO attemptRuleExecution, então continua
// respeitando consentimento/supressão (FSD 14.2: a lista de supressão é
// verificada em todo ponto de envio, sem exceção) e continua registrado em
// automation_rule_executions para auditoria.
async function manualResendWinback({ ruleId, customerId }) {
  if (!ruleId || !customerId) {
    throw new Error('manualResendWinback requer ruleId e customerId.');
  }

  const rule = await automationRulesService.getRuleById(ruleId);
  if (!rule) {
    throw new Error('Régua não encontrada.');
  }
  if (rule.triggerType !== 'days_without_purchase') {
    throw new Error('A régua informada não é uma régua de reativação (days_without_purchase).');
  }

  const customerResult = await crmPool.query(
    'SELECT id, name, last_purchase_at FROM customers WHERE id = $1',
    [customerId]
  );
  const customer = customerResult.rows[0];
  if (!customer) {
    throw new Error('Cliente não encontrado.');
  }

  const baseReference = buildWinbackTriggerReference(rule, customer.id, customer.last_purchase_at);
  const triggerReference = `${baseReference}-manual-${new Date().toISOString()}`;

  return rulesEngine.attemptRuleExecution({
    ruleId: rule.id,
    customerId: customer.id,
    triggerReference,
    templateVariables: { nome: customer.name },
  });
}

// --------------------------------------------------------------------------
// 3. Ciclo de consumo / recompra por produto (trigger_type = 'consumption_cycle')
// --------------------------------------------------------------------------
//
// `rule.conditions = { productId, days }`, ambos obrigatórios e sem valor
// padrão: sem eles não existe "ciclo de consumo" definível, e a régua é pulada.

// Última compra de cada cliente PARA UM PRODUTO específico, quando essa compra
// já passou do ciclo de consumo configurado. O filtro fica no HAVING (e não no
// WHERE) de propósito: interessa a data da ÚLTIMA compra do produto, não a de
// qualquer compra antiga — quem comprou de novo ontem não deve ser lembrado.
async function findConsumptionCycleCustomers(productId, days) {
  const result = await crmPool.query(
    `SELECT s.customer_id AS customer_id,
            c.name AS customer_name,
            MAX(s.sale_date) AS last_product_purchase_at
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       JOIN customers c ON c.id = s.customer_id
      WHERE si.product_id = $1
        AND s.customer_id IS NOT NULL
      GROUP BY s.customer_id, c.name
     HAVING MAX(s.sale_date) <= NOW() - ($2::text || ' days')::interval`,
    [productId, String(days)]
  );
  return result.rows;
}

async function getProductName(productId) {
  try {
    const result = await crmPool.query('SELECT name FROM products WHERE id = $1', [productId]);
    return result.rows[0] ? result.rows[0].name : null;
  } catch (err) {
    // O nome do produto é só uma variável de conveniência do template; se a
    // consulta falhar, a mensagem ainda pode ser enviada sem ela.
    console.error(`[time-based-rules] Não foi possível ler o nome do produto ${productId}:`, err.message);
    return null;
  }
}

async function checkConsumptionCycle() {
  const summary = createSummary();
  const rules = await rulesEngine.getActiveRulesByTrigger('consumption_cycle');

  for (const rule of rules) {
    const productId = positiveNumberFromConditions(rule.conditions, 'productId');
    const days = positiveNumberFromConditions(rule.conditions, 'days');
    if (productId === null || days === null) {
      summary.rulesSkipped += 1;
      continue;
    }

    summary.rulesEvaluated += 1;
    const customers = await findConsumptionCycleCustomers(productId, days);
    if (customers.length === 0) {
      continue;
    }

    const productName = await getProductName(productId);

    for (const customer of customers) {
      const cycle = toIsoString(customer.last_product_purchase_at);
      if (!cycle) {
        // Sem data de última compra não há como identificar o ciclo (não
        // deveria acontecer: a data vem de um MAX() sobre vendas existentes).
        continue;
      }

      await safeAttempt(summary, {
        ruleId: rule.id,
        customerId: customer.customer_id,
        // Mesmo mecanismo do win-back: a data da última compra DESTE produto na
        // referência faz o ciclo se encerrar sozinho quando o cliente recompra.
        triggerReference: `consumption-${rule.id}-${customer.customer_id}-${cycle}`,
        templateVariables: { nome: customer.customer_name, produto: productName || '' },
      });
    }
  }

  return summary;
}

// --------------------------------------------------------------------------
// 4. Pesquisa de satisfação / NPS (trigger_type = 'nps_survey')
// --------------------------------------------------------------------------

// Janela de segurança: vendas mais antigas que isso nunca geram pesquisa.
// Sem ela, ativar a régua meses depois da carga inicial dispararia NPS para
// todo o histórico sincronizado de uma vez.
const NPS_MAX_SALE_AGE = '2 days';

async function findNpsCandidateSales(delayMinutes) {
  const result = await crmPool.query(
    `SELECT s.id AS sale_id,
            s.customer_id AS customer_id,
            c.name AS customer_name
       FROM sales s
       JOIN customers c ON c.id = s.customer_id
      WHERE s.customer_id IS NOT NULL
        AND s.sale_date <= NOW() - ($1::text || ' minutes')::interval
        AND s.sale_date >= NOW() - INTERVAL '${NPS_MAX_SALE_AGE}'
      ORDER BY s.sale_date ASC`,
    [String(delayMinutes)]
  );
  return result.rows;
}

async function checkNpsSurveys() {
  const summary = createSummary();
  const rules = await rulesEngine.getActiveRulesByTrigger('nps_survey');
  if (rules.length === 0) {
    return summary;
  }

  // O prazo vem SEMPRE de system_settings (FSD 14.8 e 20) — é um parâmetro
  // global editado na tela de Configurações, não em `rule.delayMinutes`.
  const delayMinutes = await automationSettings.getNpsSurveyDelayMinutes();
  const sales = await findNpsCandidateSales(delayMinutes);

  for (const rule of rules) {
    summary.rulesEvaluated += 1;
    for (const sale of sales) {
      // Uma pesquisa por venda por régua (a constraint UNIQUE inclui a régua).
      // O motor grava a linha em nps_responses quando o envio ocorre.
      await safeAttempt(summary, {
        ruleId: rule.id,
        customerId: sale.customer_id,
        triggerReference: `nps-sale-${sale.sale_id}`,
        templateVariables: { nome: sale.customer_name },
        npsSaleId: sale.sale_id,
      });
    }
  }

  return summary;
}

module.exports = {
  checkBirthdays,
  checkWinback,
  checkConsumptionCycle,
  checkNpsSurveys,
  listWinbackEligibleCustomers,
  manualResendWinback,
  // Exportados para reuso/inspeção (tela de réguas e testes).
  buildWinbackTriggerReference,
};
