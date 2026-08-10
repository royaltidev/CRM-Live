// Controller de réguas de relacionamento (FSD seções 6.3, 12.5).
// Acessível por Administrador e Acesso Limitado (ambos podem criar/editar/
// ativar réguas — FSD seção 8.5).

const automationRulesService = require('../services/automation-rules.service');

// GET /automation-rules?triggerType=&active=
async function listRules(req, res) {
  try {
    const { triggerType, active } = req.query;
    const rules = await automationRulesService.listRules({ triggerType, active });
    res.json({ rules });
  } catch (err) {
    console.error('Erro ao listar réguas:', err.message);
    res.status(500).json({ error: 'Erro ao carregar réguas.' });
  }
}

// GET /automation-rules/:id
async function getRuleById(req, res) {
  try {
    const rule = await automationRulesService.getRuleById(req.params.id);
    if (!rule) {
      return res.status(404).json({ error: 'Régua não encontrada.' });
    }
    res.json({ rule });
  } catch (err) {
    console.error('Erro ao buscar régua:', err.message);
    res.status(500).json({ error: 'Erro ao buscar régua.' });
  }
}

// POST /automation-rules
// body: { name, triggerType, conditions?, messageTemplateId?, cascadeStep?, delayMinutes? }
async function createRule(req, res) {
  try {
    const { name, triggerType, conditions, messageTemplateId, cascadeStep, delayMinutes } = req.body;
    const rule = await automationRulesService.createRule({
      name,
      triggerType,
      conditions,
      messageTemplateId,
      cascadeStep,
      delayMinutes,
      createdBy: req.user.id,
    });
    res.status(201).json({ rule });
  } catch (err) {
    console.error('Erro ao criar régua:', err.message);
    res.status(400).json({ error: err.message || 'Erro ao criar régua.' });
  }
}

// PATCH /automation-rules/:id
async function updateRule(req, res) {
  try {
    const { name, conditions, messageTemplateId, cascadeStep, delayMinutes } = req.body;
    const rule = await automationRulesService.updateRule(req.params.id, {
      name,
      conditions,
      messageTemplateId,
      cascadeStep,
      delayMinutes,
    });
    res.json({ rule });
  } catch (err) {
    if (err.message === 'Régua não encontrada.') {
      return res.status(404).json({ error: err.message });
    }
    console.error('Erro ao atualizar régua:', err.message);
    res.status(400).json({ error: err.message || 'Erro ao atualizar régua.' });
  }
}

// PATCH /automation-rules/:id/toggle-active  (body: { active: boolean })
async function toggleRuleActive(req, res) {
  try {
    const rule = await automationRulesService.toggleRuleActive(req.params.id, req.body.active);
    res.json({ rule });
  } catch (err) {
    if (err.message === 'Régua não encontrada.') {
      return res.status(404).json({ error: err.message });
    }
    if (err.message.includes('modelo de mensagem')) {
      return res.status(409).json({ error: err.message });
    }
    console.error('Erro ao ativar/desativar régua:', err.message);
    res.status(400).json({ error: err.message || 'Erro ao ativar/desativar régua.' });
  }
}

// GET /automation-rules/templates/active — alimenta o campo de seleção de
// template ao criar/editar régua. CRUD completo de templates é Fase 8.
async function listActiveTemplates(req, res) {
  try {
    const templates = await automationRulesService.listActiveTemplates();
    res.json({ templates });
  } catch (err) {
    console.error('Erro ao listar templates ativos:', err.message);
    res.status(500).json({ error: 'Erro ao carregar modelos de mensagem.' });
  }
}

module.exports = {
  listRules,
  getRuleById,
  createRule,
  updateRule,
  toggleRuleActive,
  listActiveTemplates,
};
