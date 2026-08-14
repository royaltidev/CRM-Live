// Controller de "Venda Inteligente — Parte 2" (jornadas de compra e itens
// sem venda, ver sales-insights.service.js). Leitura liberada a Admin e
// Acesso Limitado, mesmo padrão do resto da iniciativa (Cross-sell, Parte
// 1) — sem requireAdmin.

const salesInsightsService = require('../services/sales-insights.service');
const salesSituationsService = require('../services/sales-situations.service');

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

// GET /sales-insights/situations — grupos por situação de prejuízo
// (remodelagem da Venda Inteligente, 14/08/2026).
async function getSituations(req, res) {
  try {
    const situations = await salesSituationsService.getSituations();
    res.json(situations);
  } catch (err) {
    console.error('Erro ao classificar situações de venda:', err.message);
    res.status(500).json({ error: 'Erro ao classificar situações de venda.' });
  }
}

// GET /sales-insights/overview — resumo numérico para o card do Dashboard.
async function getOverview(req, res) {
  try {
    const overview = await salesSituationsService.getOverview();
    res.json(overview);
  } catch (err) {
    console.error('Erro ao gerar resumo da Venda Inteligente:', err.message);
    res.status(500).json({ error: 'Erro ao gerar resumo da Venda Inteligente.' });
  }
}

module.exports = {
  getJourneys,
  getSlowMovers,
  getSituations,
  getOverview,
};
