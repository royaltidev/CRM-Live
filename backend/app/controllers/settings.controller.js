// Controller da tela de Configurações (FSD 12.13) — parâmetro de
// classificação de intenção de lead (Fase 9), IA da Venda Inteligente e
// parâmetros do Piloto Automático da Loja / Radar da Loja. Rotas
// exclusivas do Administrador.

const automationSettingsService = require('../services/automation-settings.service');
const autonomousOffersService = require('../services/autonomous-offers.service');

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

// GET /settings/piloto-automatico — parâmetros do Piloto Automático da Loja
// (cascata pós-venda em tempo real) e do Radar da Loja relacionados. Cada
// campo pode vir `null` quando ainda não configurado pelo dono
// (pending_configuration) — ver autonomous-offers.service.js.
async function getPilotoAutomaticoSettings(req, res) {
  try {
    const [
      whatsappMinIntervalSeconds,
      davTiposConsideradosVenda,
      etapa2DelayMinutes,
      conversionWindowDays,
      defaultLeadTimeDays,
    ] = await Promise.all([
      autonomousOffersService.getWhatsappMinIntervalSeconds(),
      autonomousOffersService.getDavSaleTypeCodes(),
      autonomousOffersService.getEtapa2DelayMinutes(),
      autonomousOffersService.getConversionWindowDays(),
      autonomousOffersService.getDefaultLeadTimeDays(),
    ]);

    res.json({
      whatsappMinIntervalSeconds,
      davTiposConsideradosVenda,
      etapa2DelayMinutes,
      conversionWindowDays,
      defaultLeadTimeDays,
    });
  } catch (err) {
    console.error('Erro ao carregar configuração do Piloto Automático da Loja:', err.message);
    res.status(500).json({ error: 'Erro ao carregar configuração.' });
  }
}

// PUT /settings/piloto-automatico — atualização parcial: só os campos
// presentes no corpo (diferente de `undefined`) são validados e salvos; os
// demais permanecem como estavam. Isso permite o Administrador preencher
// os parâmetros aos poucos sem correr o risco de zerar um valor já
// configurado ao salvar outro campo do mesmo formulário.
async function updatePilotoAutomaticoSettings(req, res) {
  try {
    const {
      whatsappMinIntervalSeconds,
      davTiposConsideradosVenda,
      etapa2DelayMinutes,
      conversionWindowDays,
      defaultLeadTimeDays,
    } = req.body;
    const adminId = req.user.id;

    if (whatsappMinIntervalSeconds !== undefined) {
      await autonomousOffersService.setWhatsappMinIntervalSeconds(whatsappMinIntervalSeconds, adminId);
    }
    if (davTiposConsideradosVenda !== undefined) {
      await autonomousOffersService.setDavSaleTypeCodes(davTiposConsideradosVenda, adminId);
    }
    if (etapa2DelayMinutes !== undefined) {
      await autonomousOffersService.setEtapa2DelayMinutes(etapa2DelayMinutes, adminId);
    }
    if (conversionWindowDays !== undefined) {
      await autonomousOffersService.setConversionWindowDays(conversionWindowDays, adminId);
    }
    if (defaultLeadTimeDays !== undefined) {
      await autonomousOffersService.setDefaultLeadTimeDays(defaultLeadTimeDays, adminId);
    }

    const [
      updatedWhatsappMinIntervalSeconds,
      updatedDavTiposConsideradosVenda,
      updatedEtapa2DelayMinutes,
      updatedConversionWindowDays,
      updatedDefaultLeadTimeDays,
    ] = await Promise.all([
      autonomousOffersService.getWhatsappMinIntervalSeconds(),
      autonomousOffersService.getDavSaleTypeCodes(),
      autonomousOffersService.getEtapa2DelayMinutes(),
      autonomousOffersService.getConversionWindowDays(),
      autonomousOffersService.getDefaultLeadTimeDays(),
    ]);

    res.json({
      whatsappMinIntervalSeconds: updatedWhatsappMinIntervalSeconds,
      davTiposConsideradosVenda: updatedDavTiposConsideradosVenda,
      etapa2DelayMinutes: updatedEtapa2DelayMinutes,
      conversionWindowDays: updatedConversionWindowDays,
      defaultLeadTimeDays: updatedDefaultLeadTimeDays,
    });
  } catch (err) {
    console.error('Erro ao salvar configuração do Piloto Automático da Loja:', err.message);
    res.status(400).json({ error: err.message || 'Erro ao salvar configuração.' });
  }
}

module.exports = {
  getLeadIntentClassificationSettings,
  updateLeadIntentClassificationSettings,
  getSmartSalesAiSettings,
  updateSmartSalesAiSettings,
  getPilotoAutomaticoSettings,
  updatePilotoAutomaticoSettings,
};
