// Controller de vendedores e fila de rodízio (FSD tela 12.11, seções 6.5, 8.5, 14.7).
//
// Tela editável por Admin E Acesso limitado (FSD 8.5): todas as rotas usam
// apenas requireAuth, sem requireAdmin.
//
// Escopo desta fase (Fase 5): CRUD de vendedores + visualização da posição
// da fila de rodízio (GET /sellers/rotation/next é só consulta). O motor
// que efetivamente encaminha leads pela fila é a Fase 9 e está fora de
// escopo deste controller.

const sellersService = require('../services/sellers.service');

// GET /sellers?includeInactive=true|false
async function listSellers(req, res) {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const sellers = await sellersService.listSellers({ includeInactive });
    res.json({ sellers });
  } catch (err) {
    console.error('Erro ao listar vendedores:', err.message);
    res.status(500).json({ error: 'Erro ao carregar lista de vendedores.' });
  }
}

// GET /sellers/:id
async function getSellerById(req, res) {
  try {
    const { id } = req.params;
    const seller = await sellersService.getSellerById(id);

    if (!seller) {
      return res.status(404).json({ error: 'Vendedor não encontrado.' });
    }

    res.json({ seller });
  } catch (err) {
    console.error('Erro ao buscar vendedor:', err.message);
    res.status(500).json({ error: 'Erro ao buscar vendedor.' });
  }
}

// POST /sellers
async function createSeller(req, res) {
  try {
    const { name, whatsappPhone, uniplusSellerId } = req.body;
    const seller = await sellersService.createSeller({ name, whatsappPhone, uniplusSellerId });
    res.status(201).json({ seller });
  } catch (err) {
    // Erros de validação do serviço têm mensagem amigável e devem virar 400.
    res.status(400).json({ error: err.message || 'Não foi possível cadastrar o vendedor.' });
  }
}

// PATCH /sellers/:id
async function updateSeller(req, res) {
  try {
    const { id } = req.params;
    const { name, whatsappPhone, uniplusSellerId } = req.body;
    const seller = await sellersService.updateSeller(id, { name, whatsappPhone, uniplusSellerId });
    res.json({ seller });
  } catch (err) {
    if (err.message === 'Vendedor não encontrado') {
      return res.status(404).json({ error: 'Vendedor não encontrado.' });
    }
    res.status(400).json({ error: err.message || 'Não foi possível atualizar o vendedor.' });
  }
}

// PATCH /sellers/:id/toggle-active
async function toggleSellerActive(req, res) {
  try {
    const { id } = req.params;
    const { active } = req.body;

    if (typeof active !== 'boolean') {
      return res.status(400).json({ error: 'O campo "active" deve ser verdadeiro ou falso.' });
    }

    const seller = await sellersService.toggleSellerActive(id, active);
    res.json({ seller });
  } catch (err) {
    if (err.message === 'Vendedor não encontrado') {
      return res.status(404).json({ error: 'Vendedor não encontrado.' });
    }
    console.error('Erro ao ativar/desativar vendedor:', err.message);
    res.status(500).json({ error: 'Erro ao atualizar status do vendedor.' });
  }
}

// GET /sellers/rotation/next
// Apenas consulta quem seria o próximo da fila de rodízio; não efetiva
// nenhuma designação (isso é responsabilidade do motor de encaminhamento,
// Fase 9).
async function getNextInRotation(req, res) {
  try {
    const seller = await sellersService.getNextInRotation();
    res.json({ seller });
  } catch (err) {
    console.error('Erro ao consultar próximo da fila de rodízio:', err.message);
    res.status(500).json({ error: 'Erro ao consultar fila de rodízio.' });
  }
}

module.exports = {
  listSellers,
  getSellerById,
  createSeller,
  updateSeller,
  toggleSellerActive,
  getNextInRotation,
};
