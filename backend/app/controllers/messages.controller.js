// Controller de mensagens / log de disparos (FSD seção 8.5: rota visível por
// Admin E Acesso Limitado — usa apenas requireAuth, sem requireAdmin).
//
// Sem acesso direto ao banco aqui: toda leitura passa por
// backend/app/services/message-queue.service.js.

const messageQueueService = require('../services/message-queue.service');

// GET /messages
// Query params opcionais: customerId, campaignId, automationRuleId, status,
// startDate, endDate, page, pageSize.
async function listMessages(req, res) {
  try {
    const { customerId, campaignId, automationRuleId, status, startDate, endDate, page, pageSize } = req.query;

    const result = await messageQueueService.listMessages({
      customerId,
      campaignId,
      automationRuleId,
      status,
      startDate,
      endDate,
      page,
      pageSize,
    });

    res.json(result);
  } catch (err) {
    console.error('Erro ao listar mensagens (log de disparos):', err.message);
    res.status(500).json({ error: 'Erro ao carregar o log de disparos.' });
  }
}

module.exports = {
  listMessages,
};
