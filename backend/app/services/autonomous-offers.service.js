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
};

async function getSettingValue(key) {
  const result = await crmPool.query('SELECT value FROM system_settings WHERE key = $1', [key]);
  return result.rows.length === 0 ? null : result.rows[0].value;
}

// Intervalo mínimo, em segundos, entre disparos de WhatsApp do Piloto
// Automático (protege o número contra bloqueio por padrão de envio — ver
// "Piloto Automático da Loja", seção A). Sem valor configurado, retorna
// `null` — o disparo fica pausado, não assume um intervalo arbitrário.
async function getWhatsappMinIntervalSeconds() {
  const value = await getSettingValue(KEYS.WHATSAPP_MIN_INTERVAL_SECONDS);
  return value && Number.isFinite(value.seconds) && value.seconds > 0 ? value.seconds : null;
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

// Janela, em dias, usada para considerar uma oferta "convertida" (nova
// venda do produto ofertado para o mesmo cliente dentro desse prazo). Ainda
// sem definição do dono — usado só pelo job de atribuição de conversão
// (fora do escopo desta primeira versão), não pelo disparo em si.
async function getConversionWindowDays() {
  const value = await getSettingValue(KEYS.CONVERSION_WINDOW_DAYS);
  return value && Number.isFinite(value.days) && value.days > 0 ? value.days : null;
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

module.exports = {
  KEYS,
  getSettingValue,
  getWhatsappMinIntervalSeconds,
  getDavSaleTypeCodes,
  getEtapa2DelayMinutes,
  getConversionWindowDays,
  hasAnyOfferForSale,
  createOffer,
  markOfferSent,
  markOfferFailed,
  markOfferSkipped,
};
