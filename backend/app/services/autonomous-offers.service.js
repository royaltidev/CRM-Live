// Serviço do Piloto Automático da Loja — parâmetros de negócio (lidos de
// system_settings, mesmo padrão de automation-settings.service.js) e o log
// de disparos autônomos (autonomous_offers, migration 041).
//
// Nenhuma das chaves abaixo tem valor padrão definido pelo dono (exceto
// radar.default_lead_time_days, tratado em outro lugar) — enquanto ausentes,
// a funcionalidade correspondente fica "pending_configuration", mesmo
// princípio já usado em message-queue.service.js (message_cadence) e
// rfm.service.js (rfm_criteria): nenhum valor é assumido pelo código.

const { crmPool } = require('../database/connection');

const KEYS = {
  WHATSAPP_MIN_INTERVAL_SECONDS: 'piloto_automatico.whatsapp_min_interval_seconds',
  DAV_TIPOS_CONSIDERADOS_VENDA: 'piloto_automatico.dav_tipos_considerados_venda',
  ETAPA2_DELAY_MINUTES: 'piloto_automatico.etapa2_delay_minutes',
  CONVERSION_WINDOW_DAYS: 'radar.autonomous_offer_conversion_window_days',
  DEFAULT_LEAD_TIME_DAYS: 'radar.default_lead_time_days',
};

async function getSettingValue(key) {
  const result = await crmPool.query('SELECT value FROM system_settings WHERE key = $1', [key]);
  return result.rows.length === 0 ? null : result.rows[0].value;
}

// Mesmo padrão de upsert usado em automation-settings.service.js e
// rfm.service.js — cada serviço que toca system_settings mantém sua
// própria cópia (não há módulo compartilhado no projeto para isso).
async function upsertSettingValue(key, value, description, updatedBy) {
  await crmPool.query(
    `INSERT INTO system_settings (key, value, description, updated_by, updated_at)
     VALUES ($1, $2::jsonb, $3, $4, NOW())
     ON CONFLICT (key) DO UPDATE
       SET value = $2::jsonb, updated_by = $4, updated_at = NOW()`,
    [key, JSON.stringify(value), description, updatedBy]
  );
}

// Intervalo mínimo, em segundos, entre disparos de WhatsApp do Piloto
// Automático (protege o número contra bloqueio por padrão de envio — ver
// "Piloto Automático da Loja", seção A). Sem valor configurado, retorna
// `null` — o disparo fica pausado, não assume um intervalo arbitrário.
async function getWhatsappMinIntervalSeconds() {
  const value = await getSettingValue(KEYS.WHATSAPP_MIN_INTERVAL_SECONDS);
  return value && Number.isFinite(value.seconds) && value.seconds > 0 ? value.seconds : null;
}

async function setWhatsappMinIntervalSeconds(seconds, updatedBy) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error('O intervalo mínimo entre disparos de WhatsApp deve ser um número maior que zero.');
  }

  await upsertSettingValue(
    KEYS.WHATSAPP_MIN_INTERVAL_SECONDS,
    { seconds },
    'Intervalo mínimo, em segundos, entre disparos de WhatsApp do Piloto Automático da Loja.',
    updatedBy
  );

  return seconds;
}

// Lista de dav.tipodocumento tratados como venda concluída (quando o dav
// ainda não foi convertido em nota fiscal/operação de PDV). Valores
// conhecidos na base (16/08/2026): 1 Pré-venda, 2 Orçamento, 4 Pedido de
// Venda, 6 Pedido de Faturamento, 7 Orçamento de Faturamento — nenhum
// pré-selecionado por este sistema, é decisão do dono via tela de
// parâmetros. Retorna `null` (não array vazio) quando a chave não existe,
// para o chamador distinguir "não configurado ainda" de "configurado para
// nenhum tipo" (esse segundo caso é um array vazio de verdade).
async function getDavSaleTypeCodes() {
  const value = await getSettingValue(KEYS.DAV_TIPOS_CONSIDERADOS_VENDA);
  if (!value || !Array.isArray(value.codes)) {
    return null;
  }
  return value.codes.map((code) => Number(code)).filter((code) => Number.isFinite(code));
}

// Aceita lista vazia de propósito (distinto de "não configurado" — ver
// getDavSaleTypeCodes) — "nenhum tipo conta como venda" é uma escolha
// válida do dono, não um erro. Não restringe a um whitelist fixo de
// códigos: os valores confirmados em produção (16/08/2026) são 1, 2, 4, 6,
// 7, mas a tela de parâmetros oferece esses como opção sem travar o
// backend caso apareça um tipo novo no Uniplus no futuro.
async function setDavSaleTypeCodes(codes, updatedBy) {
  if (!Array.isArray(codes)) {
    throw new Error('A lista de tipos de dav considerados venda deve ser uma lista.');
  }

  const normalized = codes.map((code) => Number(code));
  if (normalized.some((code) => !Number.isFinite(code) || !Number.isInteger(code) || code < 0)) {
    throw new Error('Cada tipo de dav deve ser um número inteiro não-negativo.');
  }

  const unique = Array.from(new Set(normalized));

  await upsertSettingValue(
    KEYS.DAV_TIPOS_CONSIDERADOS_VENDA,
    { codes: unique },
    'Lista de dav.tipodocumento tratados como venda concluída (Piloto Automático e sincronização em lote).',
    updatedBy
  );

  return unique;
}

// Teto de segurança para o delay em setTimeout — acima de ~24,8 dias
// (2^31-1 ms) o Node estoura o int32 do timer e dispara na hora, sem aviso
// (revisão de código externa, 24/08/2026). 20 dias fica bem abaixo do limite
// e é mais que suficiente para o caso de uso (reposição de categoria).
const ETAPA2_DELAY_MAX_MINUTES = 20 * 24 * 60;

// Atraso, em minutos, entre a Etapa 1 (complemento imediato) e a Etapa 2
// (reposição de categoria) da cascata pós-venda. Sem valor configurado, a
// Etapa 2 fica pausada — só a Etapa 1 e o aviso ao vendedor (que não
// dependem deste atraso) continuam ativos.
async function getEtapa2DelayMinutes() {
  const value = await getSettingValue(KEYS.ETAPA2_DELAY_MINUTES);
  return value && Number.isFinite(value.minutes) && value.minutes >= 0 && value.minutes <= ETAPA2_DELAY_MAX_MINUTES
    ? value.minutes
    : null;
}

async function setEtapa2DelayMinutes(minutes, updatedBy) {
  if (!Number.isFinite(minutes) || minutes < 0 || minutes > ETAPA2_DELAY_MAX_MINUTES) {
    throw new Error(
      `O atraso da Etapa 2 deve ser um número entre 0 e ${ETAPA2_DELAY_MAX_MINUTES} minutos (20 dias).`
    );
  }

  await upsertSettingValue(
    KEYS.ETAPA2_DELAY_MINUTES,
    { minutes },
    'Atraso, em minutos, entre a Etapa 1 (complemento imediato) e a Etapa 2 (reposição de categoria) da cascata pós-venda.',
    updatedBy
  );

  return minutes;
}

// Janela, em dias, usada para considerar uma oferta "convertida" (nova
// venda do produto ofertado para o mesmo cliente dentro desse prazo). Ainda
// sem definição do dono — usado só pelo job de atribuição de conversão
// (fora do escopo desta primeira versão), não pelo disparo em si.
async function getConversionWindowDays() {
  const value = await getSettingValue(KEYS.CONVERSION_WINDOW_DAYS);
  return value && Number.isFinite(value.days) && value.days > 0 ? value.days : null;
}

async function setConversionWindowDays(days, updatedBy) {
  if (!Number.isFinite(days) || days <= 0) {
    throw new Error('A janela de conversão deve ser um número de dias maior que zero.');
  }

  await upsertSettingValue(
    KEYS.CONVERSION_WINDOW_DAYS,
    { days },
    'Janela, em dias, para considerar uma oferta autônoma como "convertida" (nova venda do produto ofertado).',
    updatedBy
  );

  return days;
}

// Antecedência mínima, em dias, para o alerta de compra sazonal (objetivo 3
// do Radar da Loja). TEM valor padrão definido pelo dono (30 — "pelo menos
// um mês"), semeado pela migration 042 — diferente das demais chaves deste
// arquivo, cai no padrão em vez de bloquear a funcionalidade se a chave for
// removida (mesmo raciocínio de getNpsSurveyDelayMinutes em
// automation-settings.service.js).
async function getDefaultLeadTimeDays() {
  const value = await getSettingValue(KEYS.DEFAULT_LEAD_TIME_DAYS);
  return value && Number.isFinite(value.days) && value.days > 0 ? value.days : 30;
}

async function setDefaultLeadTimeDays(days, updatedBy) {
  if (!Number.isFinite(days) || days <= 0) {
    throw new Error('A antecedência padrão do alerta de compra sazonal deve ser um número de dias maior que zero.');
  }

  await upsertSettingValue(
    KEYS.DEFAULT_LEAD_TIME_DAYS,
    { days },
    'Antecedência mínima, em dias, para o alerta de compra sazonal (objetivo 3 do Radar da Loja).',
    updatedBy
  );

  return days;
}

// Já existe QUALQUER disparo (qualquer etapa) registrado para esta venda?
// Checagem "barata" de dedup antes de fazer qualquer busca de dados —
// evita reprocessar uma venda que o poller de segurança reencontrou depois
// do listener já ter tratado, ou que a trigger de dav disparou de novo por
// causa de outro UPDATE na mesma linha.
async function hasAnyOfferForSale(origin, originId) {
  const result = await crmPool.query(
    'SELECT 1 FROM autonomous_offers WHERE origin = $1 AND origin_id = $2 LIMIT 1',
    [origin, originId]
  );
  return result.rows.length > 0;
}

// Registra uma oferta como "queued". A restrição UNIQUE (origin, origin_id,
// cascade_step) da migration 041 é a rede de segurança final contra
// duplicidade — ON CONFLICT DO NOTHING faz esta função devolver `null`
// quando a linha já existia, e o chamador deve tratar isso como "não
// enviar de novo", nunca como erro.
async function createOffer({
  origin,
  originId,
  saleUniplusId,
  saleId = null,
  customerId = null,
  sellerId = null,
  productId,
  recipientType,
  recipientPhone,
  cascadeStep,
  ruleReason,
  channel = 'whatsapp',
}) {
  const result = await crmPool.query(
    `INSERT INTO autonomous_offers
       (origin, origin_id, sale_uniplus_id, sale_id, customer_id, seller_id,
        product_id, recipient_type, recipient_phone, cascade_step, rule_reason, channel, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'queued')
     ON CONFLICT (origin, origin_id, cascade_step) DO NOTHING
     RETURNING id`,
    [
      origin,
      originId,
      saleUniplusId,
      saleId,
      customerId,
      sellerId,
      productId,
      recipientType,
      recipientPhone,
      cascadeStep,
      ruleReason,
      channel,
    ]
  );

  return result.rows.length > 0 ? result.rows[0].id : null;
}

async function markOfferSent(offerId, externalMessageId) {
  await crmPool.query(
    `UPDATE autonomous_offers
        SET status = 'sent', sent_at = NOW()
      WHERE id = $1`,
    [offerId]
  );
  return externalMessageId;
}

async function markOfferFailed(offerId, reason) {
  console.error(`[autonomous-offers] Falha ao enviar oferta id=${offerId}:`, reason);
  await crmPool.query(`UPDATE autonomous_offers SET status = 'failed', status_reason = $2 WHERE id = $1`, [
    offerId,
    reason,
  ]);
}

async function markOfferSkipped(offerId, reason) {
  console.log(`[autonomous-offers] Oferta id=${offerId} não enviada:`, reason);
  await crmPool.query(`UPDATE autonomous_offers SET status = 'skipped', status_reason = $2 WHERE id = $1`, [
    offerId,
    reason,
  ]);
}

// Log paginado para a tela de monitoramento do Piloto Automático — mesmo
// padrão de message-queue.service.js § listMessages (COUNT + SELECT
// separados, filtros como condições+params paralelos, LIMIT/OFFSET).
// customer_id e seller_id são nullable (ON DELETE SET NULL na migration
// 041), por isso LEFT JOIN; product_id é NOT NULL (ON DELETE RESTRICT),
// por isso JOIN direto.
async function listOffers(filters = {}) {
  const {
    status,
    cascadeStep,
    recipientType,
    origin,
    startDate,
    endDate,
    page = 1,
    pageSize = 50,
  } = filters;

  const conditions = [];
  const params = [];

  if (status) {
    params.push(status);
    conditions.push(`ao.status = $${params.length}`);
  }
  if (cascadeStep) {
    params.push(cascadeStep);
    conditions.push(`ao.cascade_step = $${params.length}`);
  }
  if (recipientType) {
    params.push(recipientType);
    conditions.push(`ao.recipient_type = $${params.length}`);
  }
  if (origin) {
    params.push(origin);
    conditions.push(`ao.origin = $${params.length}`);
  }
  if (startDate) {
    params.push(startDate);
    conditions.push(`ao.created_at >= $${params.length}`);
  }
  if (endDate) {
    params.push(endDate);
    conditions.push(`ao.created_at <= $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safePageSize = Math.min(200, Math.max(1, parseInt(pageSize, 10) || 50));
  const offset = (safePage - 1) * safePageSize;

  const countResult = await crmPool.query(
    `SELECT COUNT(*)::int AS total FROM autonomous_offers ao ${whereClause}`,
    params
  );

  const dataParams = [...params, safePageSize, offset];
  const dataResult = await crmPool.query(
    `SELECT ao.id, ao.origin, ao.origin_id, ao.sale_uniplus_id, ao.sale_id,
            ao.customer_id, c.name AS customer_name,
            ao.seller_id, s.name AS seller_name,
            ao.product_id, p.name AS product_name,
            ao.recipient_type, ao.recipient_phone, ao.cascade_step, ao.rule_reason,
            ao.channel, ao.status, ao.status_reason,
            ao.queued_at, ao.sent_at, ao.converted_at, ao.converted_sale_id, ao.created_at
       FROM autonomous_offers ao
       LEFT JOIN customers c ON c.id = ao.customer_id
       LEFT JOIN sellers s ON s.id = ao.seller_id
       JOIN products p ON p.id = ao.product_id
       ${whereClause}
      ORDER BY ao.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    dataParams
  );

  return {
    offers: dataResult.rows,
    total: countResult.rows[0].total,
    page: safePage,
    pageSize: safePageSize,
  };
}

module.exports = {
  KEYS,
  getSettingValue,
  getWhatsappMinIntervalSeconds,
  setWhatsappMinIntervalSeconds,
  getDavSaleTypeCodes,
  setDavSaleTypeCodes,
  getEtapa2DelayMinutes,
  setEtapa2DelayMinutes,
  getConversionWindowDays,
  setConversionWindowDays,
  getDefaultLeadTimeDays,
  setDefaultLeadTimeDays,
  hasAnyOfferForSale,
  createOffer,
  markOfferSent,
  markOfferFailed,
  markOfferSkipped,
  listOffers,
};
