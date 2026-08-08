// Serviço da fila de envio de mensagens (FSD seções 6.10, 9.11, 14.3, 20).
//
// Regras principais:
// - Nenhuma mensagem é enfileirada sem checar `isCustomerEligibleForMessage`
//   (contrato de backend/app/services/consent.service.js). Essa checagem é
//   feita DUAS vezes: na "porta de entrada" (enqueueMessage) e novamente na
//   "porta de saída" (processQueueBatch, imediatamente antes de enviar),
//   pois o consentimento pode mudar (opt-out) entre o enfileiramento e o
//   processamento efetivo do lote.
// - Nenhuma chamada direta à biblioteca de mensageria: todo envio passa pela
//   camada de abstração em backend/app/integrations/whatsapp (FSD 9.11).
// - Limite mensal (system_settings.message_monthly_limit_per_customer) e
//   janela de horário (system_settings.message_send_window) TÊM valores
//   padrão (semeados pela migration 029). A cadência de disparo
//   (system_settings.message_cadence) NÃO tem padrão — enquanto ausente, o
//   processamento da fila fica pausado (status "pending_configuration"),
//   seguindo o mesmo padrão de "critério ausente = funcionalidade pausada"
//   já usado em rfm.service.js (getRfmCriteria).
// - Mensagens fora da janela de horário permitida NÃO são descartadas: elas
//   simplesmente continuam com status "queued" e são reconsideradas na
//   próxima execução do job dentro da janela permitida.
// - Contagem do limite mensal: usamos "últimos 30 dias corridos" a partir do
//   momento do processamento (não o mês-calendário), por simplicidade e para
//   evitar picos de liberação no início de cada mês civil.

const { crmPool } = require('../database/connection');
const { isCustomerEligibleForMessage } = require('./consent.service');
const whatsapp = require('../integrations/whatsapp');

const SEND_WINDOW_KEY = 'message_send_window';
const MONTHLY_LIMIT_KEY = 'message_monthly_limit_per_customer';
const CADENCE_KEY = 'message_cadence';

// Limite de segurança para o tamanho do lote processado por execução, usado
// quando `cadence.dailyLimit` não estiver definido ou for maior que este
// valor (evita que uma configuração exagerada trave o processo por muito
// tempo em uma única execução do job).
const SAFETY_BATCH_LIMIT = 50;

// Enfileira uma mensagem outbound para um cliente, após checar consentimento.
// Se o cliente não estiver elegível, NADA é inserido em `messages` e a
// função retorna { enqueued: false, reason: 'no_consent' }.
async function enqueueMessage({
  customerId,
  conversationId,
  body,
  templateId = null,
  automationRuleId = null,
  campaignId = null,
  triggerSource,
}) {
  const eligible = await isCustomerEligibleForMessage(customerId);

  if (!eligible) {
    return { enqueued: false, reason: 'no_consent' };
  }

  const result = await crmPool.query(
    `INSERT INTO messages
       (conversation_id, customer_id, direction, body, template_id, automation_rule_id, campaign_id, trigger_source, status)
     VALUES ($1, $2, 'outbound', $3, $4, $5, $6, $7, 'queued')
     RETURNING id`,
    [conversationId, customerId, body, templateId, automationRuleId, campaignId, triggerSource]
  );

  return { enqueued: true, messageId: result.rows[0].id };
}

// Lê as configurações relevantes para o processamento da fila em
// system_settings. Retorna { sendWindow, monthlyLimit, cadence }, com
// `cadence: null` se a chave message_cadence ainda não tiver sido
// configurada pelo Admin.
async function getQueueSettings() {
  const result = await crmPool.query(
    `SELECT key, value FROM system_settings WHERE key = ANY($1::text[])`,
    [[SEND_WINDOW_KEY, MONTHLY_LIMIT_KEY, CADENCE_KEY]]
  );

  const byKey = {};
  result.rows.forEach((row) => {
    byKey[row.key] = row.value;
  });

  return {
    sendWindow: byKey[SEND_WINDOW_KEY] || null,
    monthlyLimit: byKey[MONTHLY_LIMIT_KEY] || null,
    cadence: byKey[CADENCE_KEY] || null,
  };
}

// Checa se `now` está dentro da janela de horário permitida.
async function isWithinSendWindow(sendWindow, now = new Date()) {
  if (!sendWindow || typeof sendWindow.startHour !== 'number' || typeof sendWindow.endHour !== 'number') {
    // Sem janela configurada corretamente: por segurança, não libera envio.
    return false;
  }

  const currentHour = now.getHours();
  return currentHour >= sendWindow.startHour && currentHour < sendWindow.endHour;
}

// Conta quantas mensagens outbound "efetivamente entregues/enviadas"
// (status sent, delivered ou read) esse cliente recebeu nos últimos `days`
// dias corridos.
async function countRecentMessagesForCustomer(customerId, days = 30) {
  const result = await crmPool.query(
    `SELECT COUNT(*)::int AS count
       FROM messages
      WHERE customer_id = $1
        AND direction = 'outbound'
        AND status IN ('sent', 'delivered', 'read')
        AND created_at >= NOW() - ($2 || ' days')::interval`,
    [customerId, days]
  );

  return result.rows[0].count;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Processa um lote de mensagens da fila. Chamado periodicamente pelo job
// (backend/app/jobs/message-queue.job.js).
async function processQueueBatch() {
  const settings = await getQueueSettings();

  // Cadência sem valor padrão definido no FSD: enquanto o Admin não
  // configurar, a fila fica pausada — nenhuma mensagem é processada e
  // nenhum valor arbitrário é assumido (mesmo padrão de rfm.service.js).
  if (!settings.cadence) {
    return { status: 'pending_configuration', processed: 0 };
  }

  const withinWindow = await isWithinSendWindow(settings.sendWindow);
  if (!withinWindow) {
    return { status: 'outside_window', processed: 0 };
  }

  const monthlyLimit =
    settings.monthlyLimit && typeof settings.monthlyLimit.limit === 'number'
      ? settings.monthlyLimit.limit
      : null;

  const configuredDailyLimit =
    settings.cadence && typeof settings.cadence.dailyLimit === 'number' ? settings.cadence.dailyLimit : null;
  const batchLimit =
    configuredDailyLimit && configuredDailyLimit > 0 && configuredDailyLimit < SAFETY_BATCH_LIMIT
      ? configuredDailyLimit
      : SAFETY_BATCH_LIMIT;

  const intervalMs =
    settings.cadence && typeof settings.cadence.intervalSeconds === 'number'
      ? settings.cadence.intervalSeconds * 1000
      : 0;

  const queuedResult = await crmPool.query(
    `SELECT m.id, m.customer_id, m.body, c.phone_e164
       FROM messages m
       JOIN customers c ON c.id = m.customer_id
      WHERE m.status = 'queued' AND m.direction = 'outbound'
      ORDER BY m.created_at ASC
      LIMIT $1`,
    [batchLimit]
  );

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < queuedResult.rows.length; i += 1) {
    const message = queuedResult.rows[i];

    // Porta de saída: re-checa consentimento imediatamente antes de enviar,
    // mesmo que já tenha sido checado no enfileiramento (enqueueMessage),
    // pois o cliente pode ter feito opt-out nesse meio tempo.
    const eligible = await isCustomerEligibleForMessage(message.customer_id);
    if (!eligible) {
      await crmPool.query(`UPDATE messages SET status = 'failed' WHERE id = $1`, [message.id]);
      failed += 1;
      continue;
    }

    if (monthlyLimit !== null) {
      const recentCount = await countRecentMessagesForCustomer(message.customer_id, 30);
      if (recentCount >= monthlyLimit) {
        // Não descarta: deixa "queued" para tentar em um período futuro.
        skipped += 1;
        continue;
      }
    }

    try {
      const sendResult = await whatsapp.sendText({ to: message.phone_e164, body: message.body });
      await crmPool.query(
        `UPDATE messages
            SET status = 'sent', sent_at = NOW(), external_message_id = $2
          WHERE id = $1`,
        [message.id, sendResult && sendResult.externalMessageId ? sendResult.externalMessageId : null]
      );
      processed += 1;
    } catch (err) {
      console.error(`[message-queue] Falha ao enviar mensagem id=${message.id}:`, err.message);
      await crmPool.query(`UPDATE messages SET status = 'failed' WHERE id = $1`, [message.id]);
      failed += 1;
    }

    // Respeita o intervalo configurado entre envios, exceto após a última mensagem do lote.
    if (intervalMs > 0 && i < queuedResult.rows.length - 1) {
      await sleep(intervalMs);
    }
  }

  return { status: 'ok', processed, skipped, failed };
}

// Lista mensagens (log de disparos) com filtros opcionais, paginado.
async function listMessages(filters = {}) {
  const { customerId, campaignId, automationRuleId, status, startDate, endDate, page = 1, pageSize = 50 } = filters;

  const conditions = [];
  const params = [];

  if (customerId) {
    params.push(customerId);
    conditions.push(`m.customer_id = $${params.length}`);
  }
  if (campaignId) {
    params.push(campaignId);
    conditions.push(`m.campaign_id = $${params.length}`);
  }
  if (automationRuleId) {
    params.push(automationRuleId);
    conditions.push(`m.automation_rule_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`m.status = $${params.length}`);
  }
  if (startDate) {
    params.push(startDate);
    conditions.push(`m.created_at >= $${params.length}`);
  }
  if (endDate) {
    params.push(endDate);
    conditions.push(`m.created_at <= $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safePageSize = Math.min(200, Math.max(1, parseInt(pageSize, 10) || 50));
  const offset = (safePage - 1) * safePageSize;

  const countResult = await crmPool.query(`SELECT COUNT(*)::int AS total FROM messages m ${whereClause}`, params);

  const dataParams = [...params, safePageSize, offset];
  const dataResult = await crmPool.query(
    `SELECT m.id, m.customer_id, c.name AS customer_name, m.conversation_id, m.direction, m.body,
            m.template_id, m.automation_rule_id, m.campaign_id, m.trigger_source, m.status,
            m.external_message_id, m.sent_at, m.created_at
       FROM messages m
       JOIN customers c ON c.id = m.customer_id
       ${whereClause}
      ORDER BY m.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    dataParams
  );

  return {
    messages: dataResult.rows,
    total: countResult.rows[0].total,
    page: safePage,
    pageSize: safePageSize,
  };
}

module.exports = {
  enqueueMessage,
  getQueueSettings,
  isWithinSendWindow,
  countRecentMessagesForCustomer,
  processQueueBatch,
  listMessages,
};
