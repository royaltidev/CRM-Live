// Serviço da caixa de entrada — atendimento e encaminhamento de lead
// (FSD seção 6.5, fluxo 13.7).
//
// Decisões de escopo (não explicitadas literalmente no FSD, resolvidas por
// leitura do texto + do restante do código já construído nas fases
// anteriores, sem inventar regra de negócio nova):
// - "Interrompe qualquer automação em andamento" (13.7, passo 2): o FSD usa
//   o termo "automação" especificamente para réguas de relacionamento
//   (automation_rules/trigger_source='automation'), nunca para campanhas
//   manuais — por isso só mensagens 'queued' com trigger_source='automation'
//   são canceladas aqui. Campanhas manuais não são tocadas.
// - "Vendedor da última venda": só é considerado quando `sales.seller_id`
//   não é nulo. Se a última venda não tiver vendedor vinculado (ou não
//   houver venda alguma), cai para a fila de rodízio — leitura literal do
//   FSD ("se não houver venda anterior"), sem inventar fallback adicional
//   para vendedor inativo.
// - Notificação ao vendedor é um alerta operacional interno (não uma
//   mensagem ao cliente) — por isso usa `whatsapp.sendText` diretamente,
//   fora da fila de envio (message-queue.service.js): a fila existe pra
//   proteger CLIENTES de spam (consentimento/cadência/janela), regras que
//   não fazem sentido pra um aviso pontual a um vendedor da própria loja.

const { crmPool } = require('../database/connection');
const customersService = require('./customers.service');
const sellersService = require('./sellers.service');
const conversationsService = require('./conversations.service');
const consentService = require('./consent.service');
const leadIntentService = require('./lead-intent.service');
const whatsapp = require('../integrations/whatsapp');

const REASON_LABELS = {
  purchase_intent: 'Intenção de compra',
  doubt: 'Dúvida',
};

// Captura real de consentimento (FSD 6.6 — prevista pra Fase 9, ver
// docs/STATUS.md). Pedido do responsável do projeto: perguntar de forma
// simples e rápida, na primeira mensagem do cliente, ANTES de mandar
// qualquer coisa pro DeepSeek — por isso é keyword-based, nunca via IA.
const CONSENT_QUESTION = 'Aceita receber novas mensagens nesta conversa?';
const CONSENT_AFFIRMATIVE_KEYWORDS = ['sim', 'aceito', 'aceita', 'quero', 'pode', 'claro', 'ok', 'certo', 'concordo'];
const CONSENT_NEGATIVE_KEYWORDS = ['nao', 'n', 'negativo', 'nunca'];

function normalizeConsentAnswer(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.!?,]/g, '')
    .trim();
}

// Cancela mensagens automáticas (réguas) ainda não enviadas para o cliente.
// Retorna a quantidade de mensagens interrompidas.
async function interruptPendingAutomations(customerId) {
  const result = await crmPool.query(
    `UPDATE messages
     SET status = 'canceled'
     WHERE customer_id = $1 AND status = 'queued' AND trigger_source = 'automation'
     RETURNING id`,
    [customerId]
  );

  return result.rows.length;
}

// Registra a mensagem recebida na tabela messages (linha do tempo do
// cliente — FSD 13.7, passo 8). Mensagens inbound não passam pelo ciclo de
// entrega da fila de saída; 'delivered' representa que já chegou até nós.
async function logInboundMessage({ conversationId, customerId, body }) {
  const result = await crmPool.query(
    `INSERT INTO messages (conversation_id, customer_id, direction, body, trigger_source, status, sent_at)
     VALUES ($1, $2, 'inbound', $3, 'customer', 'delivered', NOW())
     RETURNING *`,
    [conversationId, customerId, body]
  );

  return result.rows[0];
}

// Encontra o vendedor da última venda do cliente (sales.seller_id não nulo).
async function findLastSaleSeller(customerId) {
  const result = await crmPool.query(
    `SELECT seller_id FROM sales
     WHERE customer_id = $1 AND seller_id IS NOT NULL
     ORDER BY sale_date DESC
     LIMIT 1`,
    [customerId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return sellersService.getSellerById(result.rows[0].seller_id);
}

// Resolve o vendedor responsável por um lead: última venda, com fallback
// para a fila de rodízio (que só avança quando efetivamente usada aqui).
async function resolveResponsibleSeller(customerId) {
  const lastSaleSeller = await findLastSaleSeller(customerId);
  if (lastSaleSeller) {
    return { seller: lastSaleSeller, routingMethod: 'last_sale_seller' };
  }

  const rotationSeller = await sellersService.assignRotation();
  if (rotationSeller) {
    return { seller: rotationSeller, routingMethod: 'rotation_queue' };
  }

  return { seller: null, routingMethod: null };
}

// Encaminha o lead ao vendedor responsável: registra em lead_forwards e
// notifica por WhatsApp. Se não houver vendedor ativo disponível, apenas
// loga o problema — a conversa permanece na caixa de entrada sem
// encaminhamento (FSD 13.7, "erros possíveis").
async function forwardLeadToSeller({ conversationId, customer, reason }) {
  const { seller, routingMethod } = await resolveResponsibleSeller(customer.id);

  if (!seller) {
    console.error(
      `[inbox] Nenhum vendedor ativo disponível para encaminhar o lead do cliente ${customer.id} (${customer.name}). Conversa mantida na caixa de entrada, sem encaminhamento.`
    );
    return null;
  }

  await crmPool.query(
    `INSERT INTO lead_forwards (conversation_id, customer_id, seller_id, reason, routing_method)
     VALUES ($1, $2, $3, $4, $5)`,
    [conversationId, customer.id, seller.id, reason, routingMethod]
  );

  if (seller.whatsappPhone) {
    try {
      await whatsapp.sendText({
        to: seller.whatsappPhone,
        body:
          `Novo lead na Caixa de Entrada do CRM Live!\n` +
          `Cliente: ${customer.name}\n` +
          `Telefone: ${customer.phone_e164}\n` +
          `Motivo: ${REASON_LABELS[reason] || reason}`,
      });
    } catch (err) {
      console.error(`[inbox] Falha ao notificar vendedor ${seller.name} por WhatsApp:`, err.message);
    }
  } else {
    console.warn(`[inbox] Vendedor ${seller.name} não tem WhatsApp cadastrado — lead registrado sem notificação.`);
  }

  return { seller, routingMethod };
}

// Garante consentimento real antes de classificar/encaminhar qualquer
// coisa. Três estados possíveis (ver consent.service.js#markConsentRequested):
// - Sem linha em `consents` ainda: primeiro contato — pergunta e marca como
//   pendente, sem decidir nada nesta rodada.
// - Linha existe com opted_in=false E opted_out=false: pendente de resposta
//   — a MENSAGEM ATUAL é interpretada como a resposta à pergunta (sim/não
//   por palavra-chave simples, nunca IA).
// - opted_in=true: segue para classificação normal.
// Cliente já opted_out (desta rodada ou de antes) nunca chega a ser
// classificado.
async function resolveConsentGate({ customer, conversationId, body }) {
  const consent = await consentService.getConsent(customer.id);

  if (!consent) {
    try {
      await whatsapp.sendText({ to: customer.phone_e164, body: CONSENT_QUESTION });
      await crmPool.query(
        `INSERT INTO messages (conversation_id, customer_id, direction, body, trigger_source, status, sent_at)
         VALUES ($1, $2, 'outbound', $3, 'automation', 'sent', NOW())`,
        [conversationId, customer.id, CONSENT_QUESTION]
      );
    } catch (err) {
      console.error(`[inbox] Falha ao enviar pergunta de consentimento ao cliente ${customer.id}:`, err.message);
    }

    await consentService.markConsentRequested(customer.id);
    return 'consent_requested';
  }

  if (consent.opted_out) {
    return 'opted_out';
  }

  if (!consent.opted_in) {
    const normalized = normalizeConsentAnswer(body);

    if (CONSENT_AFFIRMATIVE_KEYWORDS.includes(normalized)) {
      await consentService.optIn(customer.id, 'inbound_consent_confirmation');
      return 'consent_granted';
    }

    if (CONSENT_NEGATIVE_KEYWORDS.includes(normalized)) {
      await consentService.optOut(customer.id, 'inbound_consent_declined');
      return 'consent_declined';
    }

    return 'consent_pending';
  }

  return 'opted_in';
}

// Processa uma mensagem recebida do cliente (chamado pelo listener do
// provider WhatsApp — ver backend/app/integrations/whatsapp). Implementa o
// fluxo completo do FSD 13.7 (+ opt-out, FSD 13.8, que tem prioridade: uma
// mensagem de saída não é tratada como lead).
async function processInboundMessage({ from, body }) {
  const customer = await customersService.getCustomerByPhone(from);

  if (!customer) {
    console.warn(`[inbox] Mensagem recebida de número não cadastrado como cliente: ${from}`);
    return { handled: false, reason: 'unknown_customer' };
  }

  const conversationId = await conversationsService.getOrCreateConversationForCustomer(customer.id);

  const optedOut = await consentService.processInboundOptOutKeyword(customer.id, body);
  const interruptedCount = await interruptPendingAutomations(customer.id);
  await logInboundMessage({ conversationId, customerId: customer.id, body });
  await conversationsService.setConversationStatus(conversationId, 'awaiting_human');
  await conversationsService.touchConversation(conversationId);

  let forwarded = null;
  let intent = null;
  let consentGate = null;

  if (!optedOut) {
    consentGate = await resolveConsentGate({ customer, conversationId, body });

    if (consentGate === 'opted_in') {
      intent = await leadIntentService.classifyLeadIntent({ messageBody: body });

      if (intent === 'purchase_intent' || intent === 'doubt') {
        forwarded = await forwardLeadToSeller({ conversationId, customer, reason: intent });
      }
    }
  }

  return {
    handled: true,
    customerId: customer.id,
    conversationId,
    optedOut,
    interruptedAutomations: interruptedCount,
    consentGate,
    intent,
    forwarded,
  };
}

// Retorna uma conversa com dados do cliente (usado pela caixa de entrada
// pra abrir uma conversa, e internamente por sendManualReply).
async function getConversationById(id) {
  const result = await crmPool.query(
    `SELECT conv.*, c.name AS customer_name, c.phone_e164 AS customer_phone
     FROM conversations conv
     INNER JOIN customers c ON c.id = conv.customer_id
     WHERE conv.id = $1`,
    [id]
  );

  return result.rows[0] || null;
}

// Mensagens de uma conversa, em ordem cronológica (mais antiga primeiro —
// leitura natural de um thread de chat).
async function getConversationMessages(conversationId) {
  const result = await crmPool.query(
    `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
    [conversationId]
  );

  return result.rows;
}

// Lista conversas da caixa de entrada (FSD 12.10): exclui conversas
// puramente 'automated' (nenhuma resposta humana envolvida ainda — não há o
// que atender), prioriza as aguardando atendimento humano, e traz o último
// encaminhamento de lead (se houver) pra "visualizar se um lead já foi
// encaminhado a um vendedor".
async function listConversations({ status, page = 1, pageSize = 20 } = {}) {
  const conditions = [`conv.status != 'automated'`];
  const params = [];

  if (status) {
    params.push(status);
    conditions.push(`conv.status = $${params.length}`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safePageSize = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
  const offset = (safePage - 1) * safePageSize;

  const countResult = await crmPool.query(`SELECT COUNT(*) AS total FROM conversations conv ${whereClause}`, params);
  const total = parseInt(countResult.rows[0].total, 10);

  const dataParams = [...params, safePageSize, offset];
  const dataResult = await crmPool.query(
    `SELECT conv.id, conv.status, conv.last_message_at, conv.created_at,
            c.id AS customer_id, c.name AS customer_name, c.phone_e164 AS customer_phone,
            (SELECT body FROM messages m WHERE m.conversation_id = conv.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_body,
            lf.seller_id AS forwarded_seller_id, s.name AS forwarded_seller_name, lf.reason AS forwarded_reason
     FROM conversations conv
     INNER JOIN customers c ON c.id = conv.customer_id
     LEFT JOIN LATERAL (
       SELECT * FROM lead_forwards WHERE conversation_id = conv.id ORDER BY forwarded_at DESC LIMIT 1
     ) lf ON true
     LEFT JOIN sellers s ON s.id = lf.seller_id
     ${whereClause}
     ORDER BY (CASE conv.status WHEN 'awaiting_human' THEN 0 ELSE 1 END), conv.last_message_at DESC NULLS LAST
     LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams
  );

  return {
    conversations: dataResult.rows,
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.ceil(total / safePageSize) || 1,
  };
}

// Envia uma resposta manual do Administrador a um cliente, pela caixa de
// entrada (FSD 13.7, passo 7). Diferente das réguas/campanhas, envia
// IMEDIATAMENTE (fora da fila de envio) — cadência e janela de horário
// existem pra conter volume de disparo automático, o que não se aplica a
// uma resposta humana pontual. Consentimento, porém, é inegociável (FSD
// 6.6: "automática ou manual") e É checado aqui.
async function sendManualReply({ conversationId, body }) {
  const conversation = await getConversationById(conversationId);
  if (!conversation) {
    throw new Error('Conversa não encontrada.');
  }

  const eligible = await consentService.isCustomerEligibleForMessage(conversation.customer_id);
  if (!eligible) {
    throw new Error('Este cliente não pode receber mensagens (sem consentimento válido ou optou por sair).');
  }

  const inserted = await crmPool.query(
    `INSERT INTO messages (conversation_id, customer_id, direction, body, trigger_source, status)
     VALUES ($1, $2, 'outbound', $3, 'manual', 'queued')
     RETURNING *`,
    [conversationId, conversation.customer_id, body]
  );
  const messageRow = inserted.rows[0];

  try {
    const sendResult = await whatsapp.sendText({ to: conversation.customer_phone, body });
    await crmPool.query(
      `UPDATE messages SET status = 'sent', sent_at = NOW(), external_message_id = $2 WHERE id = $1`,
      [messageRow.id, sendResult && sendResult.externalMessageId ? sendResult.externalMessageId : null]
    );
  } catch (err) {
    await crmPool.query(`UPDATE messages SET status = 'failed' WHERE id = $1`, [messageRow.id]);
    throw new Error(`Falha ao enviar mensagem: ${err.message}`);
  }

  await conversationsService.setConversationStatus(conversationId, 'answered');
  await conversationsService.touchConversation(conversationId);

  return { messageId: messageRow.id };
}

module.exports = {
  processInboundMessage,
  listConversations,
  getConversationById,
  getConversationMessages,
  sendManualReply,
};
