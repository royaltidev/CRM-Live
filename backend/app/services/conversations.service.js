// Serviço mínimo de conversas (FSD seção 6.5 — Atendimento).
//
// A caixa de entrada e o fluxo completo de atendimento são construídos na
// Fase 9. Este arquivo existe porque `messages.conversation_id` é NOT NULL
// (migration 021/022) — qualquer mensagem, inclusive as automáticas geradas
// pelas réguas de relacionamento (Fase 7), precisa de uma conversa para se
// vincular. Por ora, cada cliente tem no máximo uma conversa "automated",
// reaproveitada por todas as réguas/mensagens automáticas até a Fase 9
// implementar o ciclo completo de status (awaiting_human, answered, closed).

const { crmPool } = require('../database/connection');

// Retorna o id da conversa do cliente, criando uma nova (status 'automated')
// se ainda não existir nenhuma.
async function getOrCreateConversationForCustomer(customerId) {
  const existing = await crmPool.query(
    'SELECT id FROM conversations WHERE customer_id = $1 ORDER BY id LIMIT 1',
    [customerId]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  const created = await crmPool.query(
    `INSERT INTO conversations (customer_id, status) VALUES ($1, 'automated') RETURNING id`,
    [customerId]
  );

  return created.rows[0].id;
}

// Atualiza o timestamp da última mensagem da conversa. Chamado depois de
// enfileirar uma mensagem com sucesso, para manter a conversa ordenável
// quando a caixa de entrada (Fase 9) existir.
async function touchConversation(conversationId) {
  await crmPool.query('UPDATE conversations SET last_message_at = NOW() WHERE id = $1', [
    conversationId,
  ]);
}

module.exports = {
  getOrCreateConversationForCustomer,
  touchConversation,
};
