// Serviço de réguas de relacionamento (FSD seções 6.3, 12.5, tabela
// `automation_rules`, migration 012).
//
// CRUD de réguas + listagem de templates ativos (só leitura — reaproveita
// templates.service.js, Fase 8, para não duplicar a query de templates).

const { crmPool } = require('../database/connection');
const templatesService = require('./templates.service');

const TRIGGER_TYPES = [
  'sale_created',
  'days_without_purchase',
  'birthday',
  'stock_replenished',
  'nps_survey',
  'consumption_cycle',
  'first_identified_purchase',
  'cross_sell',
];

function validateRuleInput({ name, triggerType, conditions }, { partial = false } = {}) {
  if (!partial || name !== undefined) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new Error('O nome da régua é obrigatório.');
    }
  }

  if (!partial || triggerType !== undefined) {
    if (!TRIGGER_TYPES.includes(triggerType)) {
      throw new Error(`Tipo de gatilho inválido. Valores aceitos: ${TRIGGER_TYPES.join(', ')}.`);
    }
  }

  if (conditions !== undefined && conditions !== null && typeof conditions !== 'object') {
    throw new Error('As condições da régua devem ser um objeto.');
  }
}

function mapRule(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    triggerType: row.trigger_type,
    conditions: row.conditions,
    actionType: row.action_type,
    messageTemplateId: row.message_template_id,
    templateName: row.template_name || null,
    cascadeStep: row.cascade_step,
    delayMinutes: row.delay_minutes,
    active: row.active,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const BASE_SELECT = `
  SELECT r.*, t.name AS template_name
    FROM automation_rules r
    LEFT JOIN message_templates t ON t.id = r.message_template_id
`;

async function listRules({ triggerType, active } = {}) {
  const conditions = [];
  const params = [];

  if (triggerType) {
    params.push(triggerType);
    conditions.push(`r.trigger_type = $${params.length}`);
  }

  if (active !== undefined && active !== null && active !== '') {
    params.push(active === true || active === 'true');
    conditions.push(`r.active = $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await crmPool.query(`${BASE_SELECT} ${where} ORDER BY r.name`, params);
  return result.rows.map(mapRule);
}

async function getRuleById(id) {
  const result = await crmPool.query(`${BASE_SELECT} WHERE r.id = $1`, [id]);
  return mapRule(result.rows[0]);
}

async function createRule({
  name,
  triggerType,
  conditions = {},
  messageTemplateId = null,
  cascadeStep = null,
  delayMinutes = null,
  createdBy,
}) {
  validateRuleInput({ name, triggerType, conditions });

  // Régua criada sempre inativa — ativação exige verificação explícita
  // (bloqueio sem modelo de mensagem associado, ver toggleRuleActive).
  const result = await crmPool.query(
    `INSERT INTO automation_rules
       (name, trigger_type, conditions, action_type, message_template_id, cascade_step, delay_minutes, active, created_by)
     VALUES ($1, $2, $3, 'send_message', $4, $5, $6, false, $7)
     RETURNING id`,
    [name.trim(), triggerType, JSON.stringify(conditions || {}), messageTemplateId, cascadeStep, delayMinutes, createdBy]
  );

  return getRuleById(result.rows[0].id);
}

async function updateRule(id, { name, conditions, messageTemplateId, cascadeStep, delayMinutes } = {}) {
  validateRuleInput({ name, conditions }, { partial: true });

  const existing = await getRuleById(id);
  if (!existing) {
    throw new Error('Régua não encontrada.');
  }

  await crmPool.query(
    `UPDATE automation_rules
        SET name = COALESCE($1, name),
            conditions = COALESCE($2, conditions),
            message_template_id = COALESCE($3, message_template_id),
            cascade_step = COALESCE($4, cascade_step),
            delay_minutes = COALESCE($5, delay_minutes),
            updated_at = NOW()
      WHERE id = $6`,
    [
      name ? name.trim() : null,
      conditions ? JSON.stringify(conditions) : null,
      messageTemplateId,
      cascadeStep,
      delayMinutes,
      id,
    ]
  );

  return getRuleById(id);
}

// Ativa/desativa uma régua. FSD 12.5: "aviso ao tentar ativar régua sem
// modelo de mensagem associado" — bloqueio aplicado aqui, não só na UI.
async function toggleRuleActive(id, active) {
  const rule = await getRuleById(id);
  if (!rule) {
    throw new Error('Régua não encontrada.');
  }

  if (active && !rule.messageTemplateId) {
    throw new Error('Não é possível ativar uma régua sem um modelo de mensagem associado.');
  }

  await crmPool.query('UPDATE automation_rules SET active = $1, updated_at = NOW() WHERE id = $2', [
    !!active,
    id,
  ]);

  return getRuleById(id);
}

// Lista de templates ativos, só leitura — usada para alimentar o campo de
// seleção ao criar/editar uma régua.
async function listActiveTemplates() {
  const templates = await templatesService.listTemplates({ includeInactive: false });
  return templates.map(({ id, name, bodyText }) => ({ id, name, bodyText }));
}

module.exports = {
  TRIGGER_TYPES,
  listRules,
  getRuleById,
  createRule,
  updateRule,
  toggleRuleActive,
  listActiveTemplates,
};
