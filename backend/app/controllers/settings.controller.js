// Controller da tela de Configurações (FSD 12.13) — parâmetro de
// classificação de intenção de lead (Fase 9). Rotas exclusivas do
// Administrador.

const automationSettingsService = require('../services/automation-settings.service');

// GET /settings/lead-intent-classification
async function getLeadIntentClassificationSettings(req, res) {
  try {
    const [aiDeepseekEnabled, keywords] = await Promise.all([
      automationSettingsService.getAiDeepseekEnabled(),
      automationSettingsService.getLeadIntentKeywords(),
    ]);

    res.json({ aiDeepseekEnabled, keywords });
  } catch (err) {
    console.error('Erro ao carregar configuração de classificação de intenção de lead:', err.message);
    res.status(500).json({ error: 'Erro ao carregar configuração.' });
  }
}

// PUT /settings/lead-intent-classification
async function updateLeadIntentClassificationSettings(req, res) {
  try {
    const { aiDeepseekEnabled, keywords } = req.body;
    const adminId = req.user.id;

    if (typeof aiDeepseekEnabled === 'boolean') {
      await automationSettingsService.setAiDeepseekEnabled(aiDeepseekEnabled, adminId);
    }

    if (keywords) {
      await automationSettingsService.setLeadIntentKeywords(
        {
          purchaseIntent: keywords.purchaseIntent || [],
          doubt: keywords.doubt || [],
        },
        adminId
      );
    }

    const [updatedEnabled, updatedKeywords] = await Promise.all([
      automationSettingsService.getAiDeepseekEnabled(),
      automationSettingsService.getLeadIntentKeywords(),
    ]);

    res.json({ aiDeepseekEnabled: updatedEnabled, keywords: updatedKeywords });
  } catch (err) {
    console.error('Erro ao salvar configuração de classificação de intenção de lead:', err.message);
    res.status(400).json({ error: err.message || 'Erro ao salvar configuração.' });
  }
}

// GET /settings/smart-sales-ai (Venda Inteligente — escopo novo, ver
// product-affinity.service.js).
async function getSmartSalesAiSettings(req, res) {
  try {
    const aiEnabled = await automationSettingsService.getSmartSalesAiEnabled();
    res.json({ aiEnabled });
  } catch (err) {
    console.error('Erro ao carregar configuração de IA da Venda Inteligente:', err.message);
    res.status(500).json({ error: 'Erro ao carregar configuração.' });
  }
}

// PUT /settings/smart-sales-ai
async function updateSmartSalesAiSettings(req, res) {
  try {
    const { aiEnabled } = req.body;
    const updated = await automationSettingsService.setSmartSalesAiEnabled(aiEnabled, req.user.id);
    res.json({ aiEnabled: updated });
  } catch (err) {
    console.error('Erro ao salvar configuração de IA da Venda Inteligente:', err.message);
    res.status(400).json({ error: err.message || 'Erro ao salvar configuração.' });
  }
}

module.exports = {
  getLeadIntentClassificationSettings,
  updateLeadIntentClassificationSettings,
  getSmartSalesAiSettings,
  updateSmartSalesAiSettings,
};
