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
  CAMPAIGN_ATTRIBUTION_DAYS: 'campaign_attribution_days',
  AI_DEEPSEEK_ENABLED: 'ai_deepseek_enabled',
  LEAD_INTENT_KEYWORDS: 'lead_intent_keywords',
  SMART_SALES_AI_ENABLED: 'smart_sales_ai_enabled',
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

// Período (em dias) de atribuição de venda a campanha (FSD seção 20, 14.5):
// uma compra do cliente dentro desse número de dias após o envio da
// campanha é contada como resultado dela nos relatórios. Pertence à tela de
// Configurações (12.11/12.13), ainda não construída — por isso, como
// welcome_coupon_discount_percent, fica só leitura aqui e sem valor padrão
// (relatório de "vendas atribuídas/receita" fica em branco até existir).
async function getCampaignAttributionDays() {
  const value = await getSettingValue(KEYS.CAMPAIGN_ATTRIBUTION_DAYS);
  return value && Number.isFinite(value.days) ? value.days : null;
}

// Ativa/desativa a classificação de intenção de lead (caixa de entrada,
// Fase 9) via API do DeepSeek (backend/app/integrations/ai). Editável na
// tela de Configurações (FSD 12.13). TEM valor padrão (ativada): diferente
// dos parâmetros acima, aqui não existe um estado "pendente" razoável — a
// escolha do responsável do projeto foi usar IA por padrão, e desativar é
// uma decisão explícita do Administrador, não o estado inicial.
async function getAiDeepseekEnabled() {
  const value = await getSettingValue(KEYS.AI_DEEPSEEK_ENABLED);
  return value && typeof value.enabled === 'boolean' ? value.enabled : true;
}

async function setAiDeepseekEnabled(enabled, updatedBy) {
  if (typeof enabled !== 'boolean') {
    throw new Error('O valor de ativação da IA DeepSeek deve ser verdadeiro ou falso.');
  }

  await upsertSettingValue(
    KEYS.AI_DEEPSEEK_ENABLED,
    { enabled },
    'Ativa/desativa a classificação de intenção de lead via API do DeepSeek na caixa de entrada (Fase 9).',
    updatedBy
  );

  return enabled;
}

// Ativa/desativa o refinamento por IA (DeepSeek) das sugestões de "Venda
// Inteligente" (produtos frequentemente comprados juntos — escopo novo,
// fora do FSD original, ver product-affinity.service.js). Flag PRÓPRIA,
// independente de ai_deepseek_enabled (Fase 9) — são usos diferentes da IA,
// o responsável do projeto pode querer ligar/desligar cada um
// separadamente. TEM valor padrão (ativada), mesmo raciocínio do
// ai_deepseek_enabled: desativar é decisão explícita do Administrador, não
// o estado inicial. Desativada (ou falha na chamada), o motor de detecção
// usa só os candidatos estatísticos, sem bloquear a funcionalidade.
async function getSmartSalesAiEnabled() {
  const value = await getSettingValue(KEYS.SMART_SALES_AI_ENABLED);
  return value && typeof value.enabled === 'boolean' ? value.enabled : true;
}

async function setSmartSalesAiEnabled(enabled, updatedBy) {
  if (typeof enabled !== 'boolean') {
    throw new Error('O valor de ativação da IA de Venda Inteligente deve ser verdadeiro ou falso.');
  }

  await upsertSettingValue(
    KEYS.SMART_SALES_AI_ENABLED,
    { enabled },
    'Ativa/desativa o refinamento por IA das sugestões de produtos frequentemente comprados juntos (Venda Inteligente).',
    updatedBy
  );

  return enabled;
}

// Palavras-chave usadas para classificar a intenção de uma mensagem
// recebida quando a IA DeepSeek está desativada (ver lead-intent.service.js).
// NÃO tem valor padrão: enquanto vazias, nenhuma mensagem é classificada por
// palavra-chave (fica 'none') — o Administrador precisa defini-las
// explicitamente na tela de Configurações.
async function getLeadIntentKeywords() {
  const value = await getSettingValue(KEYS.LEAD_INTENT_KEYWORDS);
  return {
    purchaseIntent: value && Array.isArray(value.purchaseIntent) ? value.purchaseIntent : [],
    doubt: value && Array.isArray(value.doubt) ? value.doubt : [],
  };
}

function normalizeKeywordList(list, label) {
  if (!Array.isArray(list)) {
    throw new Error(`A lista de palavras-chave de "${label}" deve ser uma lista.`);
  }

  const cleaned = list
    .map((word) => String(word).trim().toLowerCase())
    .filter((word) => word.length > 0);

  return Array.from(new Set(cleaned));
}

async function setLeadIntentKeywords({ purchaseIntent, doubt }, updatedBy) {
  const keywords = {
    purchaseIntent: normalizeKeywordList(purchaseIntent || [], 'intenção de compra'),
    doubt: normalizeKeywordList(doubt || [], 'dúvida'),
  };

  await upsertSettingValue(
    KEYS.LEAD_INTENT_KEYWORDS,
    keywords,
    'Palavras-chave usadas para classificar a intenção de mensagens recebidas quando a IA DeepSeek está desativada (Fase 9).',
    updatedBy
  );

  return keywords;
}

module.exports = {
  KEYS,
  getNpsSurveyDelayMinutes,
  getNpsLowScoreThreshold,
  getWelcomeCouponDiscountPercent,
  getCrossSellDiscountPercent,
  setCrossSellDiscountPercent,
  getCampaignAttributionDays,
  getAiDeepseekEnabled,
  setAiDeepseekEnabled,
  getSmartSalesAiEnabled,
  setSmartSalesAiEnabled,
  getLeadIntentKeywords,
  setLeadIntentKeywords,
};
