// Controller da tela de monitoramento do Piloto Automático da Loja — log
// paginado de autonomous_offers. Ver backend/app/controllers/
// autonomous-offers.routes.md para o contrato da API.

const autonomousOffersService = require('../services/autonomous-offers.service');

// GET /piloto-automatico/offers
// Query params opcionais: status, cascadeStep, recipientType, origin,
// startDate, endDate, page, pageSize.
async function listOffers(req, res) {
  try {
    const { status, cascadeStep, recipientType, origin, startDate, endDate, page, pageSize } = req.query;

    const result = await autonomousOffersService.listOffers({
      status,
      cascadeStep,
      recipientType,
      origin,
      startDate,
      endDate,
      page,
      pageSize,
    });

    res.json(result);
  } catch (err) {
    console.error('Erro ao listar ofertas do Piloto Automático:', err.message);
    res.status(500).json({ error: 'Erro ao carregar o log do Piloto Automático.' });
  }
}

module.exports = {
  listOffers,
};
