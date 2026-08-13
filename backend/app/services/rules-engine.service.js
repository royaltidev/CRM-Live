// Motor de execução de réguas de relacionamento (FSD seções 6.3, 13.x,
// 14.3). Usado por TODAS as réguas (orientadas a evento ou a tempo) — a
// lógica de deduplicação, verificação de consentimento e enfileiramento de
// mensagem vive em um único lugar, para não divergir entre réguas.
//
// Contrato usado pelas demais partes da Fase 7 (job periódico, hooks de
// evento, frontend):
//   - getActiveRulesByTrigger(triggerType) -> Promise<Rule[]>
//   - attemptRuleExecution({ ruleId, customerId, triggerReference,
//       templateVariables, npsSaleId }) -> Promise<{ status, executionId, messageId }>
//
// `status` retornado: 'sent' | 'skipped_no_consent' | 'skipped_duplicate' | 'failed'.
// 'skipped_duplicate' não é persistido de novo em automation_rule_executions
// (o registro já existe da execução anterior) — é só um retorno informativo
// para quem chamou.

const { crmPool } = require('../database/connection');
const automationRulesService = require('./automation-rules.service');
const messageQueueService = require('./message-queue.service');
const conversationsService = require('./conversations.service');
const templatesService = require('./templates.service');

// Saudação pelo horário do envio (pedido do responsável do projeto, em
// substituição a um "Olá" fixo nos templates): 05h–11h59 "Bom dia", 12h–17h59
// "Boa tarde", 18h–4h59 "Boa noite". Usa explicitamente o horário de
// Brasília — o container roda em UTC (confirmado em
// Intl.DateTimeFormat().resolvedOptions().timeZone), então `new
// Date().getHours()` ficaria sistematicamente 3h errado.
function greetingForCurrentTime() {
  const hour = parseInt(
    new Intl.DateTimeFormat('pt-BR', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'America/Sao_Paulo',
    }).format(new Date()),
    10
  );

  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

// Substitui variáveis {{nome}} no corpo do template pelos valores em
// `variables`. Variável sem valor correspondente é removida (string vazia)
// em vez de deixar o placeholder literal na mensagem enviada ao cliente.
// `{{saudacao}}` é sempre disponível automaticamente (não precisa ser
// passada por quem chama) — mesma variável em TODOS os templates/réguas/
// campanhas, já que passam por esta função única.
function renderTemplate(bodyText, variables = {}) {
  const allVariables = { saudacao: greetingForCurrentTime(), ...variables };

  return String(bodyText || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    const value = allVariables[key];
    return value === undefined || value === null ? '' : String(value);
  });
}

async function getActiveRulesByTrigger(triggerType) {
  return automationRulesService.listRules({ triggerType, active: true });
}

// Verifica se a régua já foi executada para este cliente+evento (dedup
// explícito, além da constraint UNIQUE de automation_rule_executions —
// checar antes evita depender de capturar erro de violação de constraint
// no caminho normal).
async function alreadyExecuted(ruleId, customerId, triggerReference) {
  const result = await crmPool.query(
    `SELECT id FROM automation_rule_executions
      WHERE automation_rule_id = $1 AND customer_id = $2 AND trigger_reference = $3`,
    [ruleId, customerId, triggerReference]
  );
  return result.rows.length > 0;
}

async function recordExecution(ruleId, customerId, triggerReference, status) {
  try {
    const result = await crmPool.query(
      `INSERT INTO automation_rule_executions (automation_rule_id, customer_id, trigger_reference, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [ruleId, customerId, triggerReference, status]
    );
    return result.rows[0].id;
  } catch (err) {
    // Corrida entre duas execuções do job para o mesmo evento: a constraint
    // UNIQUE(automation_rule_id, customer_id, trigger_reference) já
    // impediria a duplicidade mesmo sem o check prévio. Código 23505 =
    // unique_violation no Postgres.
    if (err && err.code === '23505') {
      return null;
    }
    throw err;
  }
}

// Executa (ou pula) uma régua para um cliente, para um evento específico.
async function attemptRuleExecution({ ruleId, customerId, triggerReference, templateVariables = {}, npsSaleId = null }) {
  if (!ruleId || !customerId || !triggerReference) {
    throw new Error('attemptRuleExecution requer ruleId, customerId e triggerReference.');
  }

  if (await alreadyExecuted(ruleId, customerId, triggerReference)) {
    return { status: 'skipped_duplicate', executionId: null, messageId: null };
  }

  const rule = await automationRulesService.getRuleById(ruleId);
  if (!rule || !rule.active || !rule.messageTemplateId) {
    // Régua inativa ou sem template não deveria ter sido selecionada por
    // getActiveRulesByTrigger, mas a checagem fica aqui como defesa —
    // nunca deve gerar um envio indevido.
    return { status: 'failed', executionId: null, messageId: null };
  }

  try {
    const template = await templatesService.getTemplateById(rule.messageTemplateId);
    if (!template || !template.active) {
      const executionId = await recordExecution(ruleId, customerId, triggerReference, 'failed');
      return { status: 'failed', executionId, messageId: null };
    }

    // Link do template (se houver) vai anexado ao final do texto — é o
    // único jeito de "enviar" o link, já que a mensagem de WhatsApp é
    // sempre um texto (a imagem, se houver, é resolvida separadamente por
    // message-queue.service.js no momento do envio, via template_id).
    let body = renderTemplate(template.bodyText, templateVariables);
    if (template.linkUrl) {
      body = `${body}\n\n${template.linkUrl}`;
    }
    const conversationId = await conversationsService.getOrCreateConversationForCustomer(customerId);

    const enqueueResult = await messageQueueService.enqueueMessage({
      customerId,
      conversationId,
      body,
      templateId: template.id,
      automationRuleId: ruleId,
      triggerSource: 'automation',
    });

    if (!enqueueResult.enqueued) {
      const executionId = await recordExecution(ruleId, customerId, triggerReference, 'skipped_no_consent');
      return { status: 'skipped_no_consent', executionId, messageId: null };
    }

    await conversationsService.touchConversation(conversationId);

    // Régua de NPS: registra a pesquisa enviada (FSD 6.8, tabela
    // nps_responses) para que a Fase 10 (gestão de satisfação) já encontre
    // o registro pronto para receber a nota quando o cliente responder.
    if (rule.triggerType === 'nps_survey' && npsSaleId) {
      await crmPool.query(
        `INSERT INTO nps_responses (customer_id, sale_id, survey_sent_at, status)
         VALUES ($1, $2, NOW(), 'pending')`,
        [customerId, npsSaleId]
      );
    }

    const executionId = await recordExecution(ruleId, customerId, triggerReference, 'sent');
    return { status: 'sent', executionId, messageId: enqueueResult.messageId };
  } catch (err) {
    const executionId = await recordExecution(ruleId, customerId, triggerReference, 'failed').catch(() => null);
    console.error(`[rules-engine] Falha ao executar régua ${ruleId} para cliente ${customerId}:`, err.message);
    return { status: 'failed', executionId, messageId: null, error: err.message };
  }
}

module.exports = {
  renderTemplate,
  getActiveRulesByTrigger,
  attemptRuleExecution,
};
