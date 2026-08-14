// Controller de "Venda Inteligente — Parte 2" (jornadas de compra e itens
// sem venda, ver sales-insights.service.js). Leitura liberada a Admin e
// Acesso Limitado, mesmo padrão do resto da iniciativa (Cross-sell, Parte
// 1) — sem requireAdmin.

const salesInsightsService = require('../services/sales-insights.service');

// GET /sales-insights/journeys
async function getJourneys(req, res) {
  try {
    const journeys = await salesInsightsService.getPurchaseJourneys();
    res.json({ journeys });
  } catch (err) {
    console.error('Erro ao gerar jornadas de compra:', err.message);
    res.status(500).json({ error: 'Erro ao gerar jornadas de compra.' });
  }
}

// GET /sales-insights/slow-movers?startDate=&endDate=
async function getSlowMovers(req, res) {
  try {
    const { startDate, endDate } = req.query;
    const slowMovers = await salesInsightsService.getSlowMovingProducts({ startDate, endDate });
    res.json({ slowMovers });
  } catch (err) {
    console.error('Erro ao gerar itens sem venda:', err.message);
    res.status(500).json({ error: 'Erro ao gerar itens sem venda.' });
  }
}

module.exports = {
  getJourneys,
  getSlowMovers,
};
