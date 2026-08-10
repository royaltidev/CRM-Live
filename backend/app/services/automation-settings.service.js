// Parâmetros de configuração das réguas de relacionamento (FSD seção 20).
//
// Mesmo padrão já usado em rfm.service.js (rfm_criteria) e
// message-queue.service.js (message_cadence): cada chave é lida
// individualmente de `system_settings`; quando ausente, a funcionalidade que
// depende dela fica bloqueada ("pending_configuration"), sem nenhum valor
// arbitrário assumido pelo código.

const { crmPool } = require('../database/connection');

const KEYS = {
  NPS_SURVEY_DELAY_MINUTES: 'nps_survey_delay_minutes',
  NPS_LOW_SCORE_THRESHOLD: 'nps_low_score_threshold',
  WELCOME_COUPON_DISCOUNT_PERCENT: 'welcome_coupon_discount_percent',
};

async function getSettingValue(key) {
  const result = await crmPool.query('SELECT value FROM system_settings WHERE key = $1', [key]);
  return result.rows.length === 0 ? null : result.rows[0].value;
}

// Prazo (em minutos) para envio da pesquisa de satisfação após a venda.
// TEM valor padrão no FSD (30) — semeado pela migration 031. Se por algum
// motivo a chave for removida manualmente, cai para o padrão do FSD em vez
// de bloquear a régua (diferente dos parâmetros SEM padrão, como o cupom de
// boas-vindas).
async function getNpsSurveyDelayMinutes() {
  const value = await getSettingValue(KEYS.NPS_SURVEY_DELAY_MINUTES);
  return value && Number.isFinite(value.minutes) ? value.minutes : 30;
}

// Nota igual ou inferior é considerada baixa. TEM valor padrão no FSD (6).
async function getNpsLowScoreThreshold() {
  const value = await getSettingValue(KEYS.NPS_LOW_SCORE_THRESHOLD);
  return value && Number.isFinite(value.threshold) ? value.threshold : 6;
}

// Percentual de desconto do cupom de incentivo ao cadastro (régua
// first_identified_purchase). NÃO tem valor padrão no FSD — retorna null
// quando ainda não configurado; quem chama deve tratar isso como
// "pending_configuration" e não gerar o cupom.
async function getWelcomeCouponDiscountPercent() {
  const value = await getSettingValue(KEYS.WELCOME_COUPON_DISCOUNT_PERCENT);
  return value && Number.isFinite(value.percent) ? value.percent : null;
}

module.exports = {
  KEYS,
  getNpsSurveyDelayMinutes,
  getNpsLowScoreThreshold,
  getWelcomeCouponDiscountPercent,
};
