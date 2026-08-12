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
  CROSS_SELL_DISCOUNT_PERCENT: 'cross_sell_discount_percent',
};

async function getSettingValue(key) {
  const result = await crmPool.query('SELECT value FROM system_settings WHERE key = $1', [key]);
  return result.rows.length === 0 ? null : result.rows[0].value;
}

async function upsertSettingValue(key, value, description, updatedBy) {
  await crmPool.query(
    `INSERT INTO system_settings (key, value, description, updated_by, updated_at)
     VALUES ($1, $2::jsonb, $3, $4, NOW())
     ON CONFLICT (key) DO UPDATE
       SET value = $2::jsonb, updated_by = $4, updated_at = NOW()`,
    [key, JSON.stringify(value), description, updatedBy]
  );
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

// Percentual de desconto do cross-sell pós-compra (FSD 6.4, 12.9, 14.6).
// Diferente dos demais parâmetros deste arquivo, é editado diretamente na
// tela de Cross-sell (não em Configurações) por Admin OU Acesso limitado —
// por isso tem uma função de escrita aqui, não só leitura. NÃO tem valor
// padrão no FSD: enquanto ausente, nenhuma oferta de cross-sell é enviada.
async function getCrossSellDiscountPercent() {
  const value = await getSettingValue(KEYS.CROSS_SELL_DISCOUNT_PERCENT);
  return value && Number.isFinite(value.percent) ? value.percent : null;
}

async function setCrossSellDiscountPercent(percent, updatedBy) {
  if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
    throw new Error('O percentual de desconto do cross-sell deve ser maior que zero e no máximo 100.');
  }

  await upsertSettingValue(
    KEYS.CROSS_SELL_DISCOUNT_PERCENT,
    { percent },
    'Percentual de desconto aplicado na oferta automática de cross-sell pós-compra (FSD seção 12.9).',
    updatedBy
  );

  return percent;
}

module.exports = {
  KEYS,
  getNpsSurveyDelayMinutes,
  getNpsLowScoreThreshold,
  getWelcomeCouponDiscountPercent,
  getCrossSellDiscountPercent,
  setCrossSellDiscountPercent,
};
