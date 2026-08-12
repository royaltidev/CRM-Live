// Controller de giftback/cashback (FSD seções 6.4, 12.8, 14.5).
// Leitura: Admin e Acesso Limitado. Escrita: exclusiva do Administrador
// (aplicado nas rotas via requireAdmin).

const giftbackService = require('../services/giftback.service');

function handleKnownErrors(err, res) {
  if (err.message === 'Crédito de giftback não encontrado.' || err.message === 'Cliente não encontrado.') {
    res.status(404).json({ error: err.message });
    return true;
  }
  if (err.message.includes('não pode ser excluído') || err.message.includes('não pode mais ser editado')) {
    res.status(409).json({ error: err.message });
    return true;
  }
  if (
    err.message.includes('Selecione o cliente') ||
    err.message.includes('crédito deve ser') ||
    err.message.includes('apenas um dos dois')
  ) {
    res.status(400).json({ error: err.message });
    return true;
  }
  return false;
}

// GET /giftbacks?status=available|used|expired&customerName=Maria
async function listGiftbacks(req, res) {
  try {
    const { status, customerName } = req.query;
    const giftbacks = await giftbackService.listGiftbacks({
      status: status || null,
      customerName: customerName || null,
    });
    res.json({ giftbacks });
  } catch (err) {
    console.error('Erro ao listar créditos de giftback:', err.message);
    res.status(500).json({ error: 'Erro ao carregar créditos de giftback.' });
  }
}

// GET /giftbacks/:id
async function getGiftbackById(req, res) {
  try {
    const giftback = await giftbackService.getGiftbackById(req.params.id);

    if (!giftback) {
      return res.status(404).json({ error: 'Crédito de giftback não encontrado.' });
    }

    res.json({ giftback });
  } catch (err) {
    console.error('Erro ao buscar crédito de giftback:', err.message);
    res.status(500).json({ error: 'Erro ao buscar crédito de giftback.' });
  }
}

// POST /giftbacks
async function createGiftback(req, res) {
  try {
    const { customerId, creditPercent, creditValue, validUntil } = req.body;
    const giftback = await giftbackService.createGiftback({ customerId, creditPercent, creditValue, validUntil });
    res.status(201).json({ giftback });
  } catch (err) {
    if (handleKnownErrors(err, res)) return;
    console.error('Erro ao criar crédito de giftback:', err.message);
    res.status(500).json({ error: 'Erro ao criar crédito de giftback.' });
  }
}

// PATCH /giftbacks/:id
async function updateGiftback(req, res) {
  try {
    const { creditPercent, creditValue, validUntil } = req.body;
    const giftback = await giftbackService.updateGiftback(req.params.id, { creditPercent, creditValue, validUntil });
    res.json({ giftback });
  } catch (err) {
    if (handleKnownErrors(err, res)) return;
    console.error('Erro ao atualizar crédito de giftback:', err.message);
    res.status(500).json({ error: 'Erro ao atualizar crédito de giftback.' });
  }
}

// DELETE /giftbacks/:id
async function deleteGiftback(req, res) {
  try {
    await giftbackService.deleteGiftback(req.params.id);
    res.json({ success: true });
  } catch (err) {
    if (handleKnownErrors(err, res)) return;
    console.error('Erro ao excluir crédito de giftback:', err.message);
    res.status(500).json({ error: 'Erro ao excluir crédito de giftback.' });
  }
}

module.exports = {
  listGiftbacks,
  getGiftbackById,
  createGiftback,
  updateGiftback,
  deleteGiftback,
};
