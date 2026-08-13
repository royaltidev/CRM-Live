// Controller da caixa de entrada (FSD 12.10, 13.7) — exclusivo do
// Administrador (FSD 6.5, matriz de permissões linha 338).

const inboxService = require('../services/inbox.service');

// GET /inbox/conversations?status=&page=&pageSize=
async function listConversations(req, res) {
  try {
    const { status, page, pageSize } = req.query;
    const result = await inboxService.listConversations({
      status: status || null,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
    res.json(result);
  } catch (err) {
    console.error('Erro ao listar conversas:', err.message);
    res.status(500).json({ error: 'Erro ao carregar caixa de entrada.' });
  }
}

// GET /inbox/conversations/:id
async function getConversationById(req, res) {
  try {
    const conversation = await inboxService.getConversationById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversa não encontrada.' });
    }

    const messages = await inboxService.getConversationMessages(req.params.id);
    res.json({ conversation, messages });
  } catch (err) {
    console.error('Erro ao buscar conversa:', err.message);
    res.status(500).json({ error: 'Erro ao buscar conversa.' });
  }
}

// POST /inbox/conversations/:id/reply { body }
async function sendManualReply(req, res) {
  try {
    const { body } = req.body;

    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'A mensagem não pode ser vazia.' });
    }

    const result = await inboxService.sendManualReply({ conversationId: req.params.id, body: body.trim() });
    res.json({ success: true, ...result });
  } catch (err) {
    if (err.message === 'Conversa não encontrada.') {
      return res.status(404).json({ error: err.message });
    }
    if (err.message.includes('não pode receber mensagens')) {
      return res.status(409).json({ error: err.message });
    }
    if (err.message.startsWith('Falha ao enviar mensagem')) {
      return res.status(502).json({ error: err.message });
    }
    console.error('Erro ao enviar resposta manual:', err.message);
    res.status(500).json({ error: 'Erro ao enviar resposta.' });
  }
}

module.exports = {
  listConversations,
  getConversationById,
  sendManualReply,
};
