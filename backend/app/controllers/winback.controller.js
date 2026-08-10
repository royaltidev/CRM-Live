// Controller de reativação (winback) — FSD seção 12.5: "para a régua de
// reativação, consultar tela de clientes elegíveis por etapa, com filtro por
// tempo sem comprar, opção de reenvio manual e consulta às interações".
//
// A lógica de negócio (quem é elegível, o que significa "já notificado neste
// ciclo", reenvio manual etc.) vive em
// backend/app/services/time-based-rules.service.js, construído por outro
// agente em paralelo à Fase 7. Para não travar o carregamento deste
// controller caso aquele serviço ainda não exista no momento em que este
// arquivo é testado isoladamente, o require é feito de forma tardia (dentro
// de cada função), seguindo o mesmo padrão já usado em outros pontos do
// projeto para dependências entre agentes paralelos.

// GET /winback/eligible?ruleId=X
async function listEligible(req, res) {
  try {
    const { ruleId } = req.query;
    if (!ruleId) {
      return res.status(400).json({ error: 'Informe o parâmetro ruleId.' });
    }

    const { listWinbackEligibleCustomers } = require('../services/time-based-rules.service');
    const customers = await listWinbackEligibleCustomers({ ruleId });
    res.json({ customers });
  } catch (err) {
    console.error('Erro ao listar clientes elegíveis para reativação:', err.message);
    res.status(500).json({ error: err.message || 'Erro ao carregar clientes elegíveis.' });
  }
}

// POST /winback/resend  (body: { ruleId, customerId })
async function resend(req, res) {
  try {
    const { ruleId, customerId } = req.body || {};
    if (!ruleId || !customerId) {
      return res.status(400).json({ error: 'Informe ruleId e customerId.' });
    }

    const { manualResendWinback } = require('../services/time-based-rules.service');
    const result = await manualResendWinback({ ruleId, customerId });
    res.json({ result });
  } catch (err) {
    console.error('Erro ao reenviar mensagem de reativação:', err.message);
    res.status(400).json({ error: err.message || 'Erro ao reenviar mensagem de reativação.' });
  }
}

module.exports = {
  listEligible,
  resend,
};
