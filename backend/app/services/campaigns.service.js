// Serviço de campanhas manuais (FSD seções 6.4, 12.6, 13.6, 14.4, 14.5,
// tabelas `campaigns`/`campaign_recipients`, migrations 016/017/033/035).
//
// Fluxo (FSD 13.6): criar (segmento + template + cupom/giftback opcionais +
// agendamento opcional) -> pré-visualizar destinatários elegíveis -> confirmar
// disparo. O disparo em si reaproveita a MESMA fila de envio das réguas
// (message-queue.service.js: consentimento, cadência, janela de horário —
// nada disso é duplicado aqui) e o mesmo renderizador de variáveis
// (rules-engine.service.js#renderTemplate).
//
// Giftback em campanha (decisão registrada em 035_add_campaign_giftback_params.js):
// os parâmetros do crédito ficam na própria campanha; no disparo, uma linha
// nova é criada em giftback_credits POR destinatário elegível.
//
// Atribuição de venda por período (FSD 14.5): quando uma venda nova chega
// (hook automation-trigger.service.js#processNewSale -> attributeSaleToCampaigns
// aqui), se o cliente foi destinatário de uma campanha enviada dentro do
// período parametrizado (`campaign_attribution_days`, sem padrão — ver
// automation-settings.service.js), o cupom/giftback dessa campanha é marcado
// como usado. Isso fecha o "fluxo que marca cupom como usado" citado como
// pendência da Parte 5 em coupons.service.js e giftback.service.js.

const { crmPool } = require('../database/connection');
const segmentsService = require('./segments.service');
const templatesService = require('./templates.service');
const couponsService = require('./coupons.service');
const giftbackService = require('./giftback.service');
const messageQueueService = require('./message-queue.service');
const conversationsService = require('./conversations.service');
const rulesEngine = require('./rules-engine.service');
const automationSettingsService = require('./automation-settings.service');

const ACTIVE_STATUSES = ['draft', 'scheduled'];

function mapCampaignRow(row) {
  return {
    id: row.id,
    name: row.name,
    segmentId: row.segment_id,
    segmentFilter: row.segment_filter,
    messageTemplateId: row.message_template_id,
    templateName: row.template_name || null,
    couponId: row.coupon_id,
    couponCode: row.coupon_code || null,
    giftbackCreditPercent: row.giftback_credit_percent !== null ? Number(row.giftback_credit_percent) : null,
    giftbackCreditValue: row.giftback_credit_value !== null ? Number(row.giftback_credit_value) : null,
    giftbackValidUntil: row.giftback_valid_until,
    scheduledAt: row.scheduled_at,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    sentAt: row.sent_at,
  };
}

const BASE_SELECT = `
  SELECT c.*, t.name AS template_name, co.code AS coupon_code
    FROM campaigns c
    LEFT JOIN message_templates t ON t.id = c.message_template_id
    LEFT JOIN coupons co ON co.id = c.coupon_id
`;

async function listCampaigns({ status = null } = {}) {
  const conditions = [];
  const params = [];

  if (status) {
    params.push(status);
    conditions.push(`c.status = $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await crmPool.query(`${BASE_SELECT} ${where} ORDER BY c.created_at DESC`, params);
  return result.rows.map(mapCampaignRow);
}

async function getCampaignRaw(id) {
  const result = await crmPool.query(`${BASE_SELECT} WHERE c.id = $1`, [id]);
  return result.rows[0] || null;
}

async function getCampaignById(id) {
  const row = await getCampaignRaw(id);
  if (!row) {
    return null;
  }

  const campaign = mapCampaignRow(row);
  campaign.results = await getCampaignResults(id, row);
  return campaign;
}

// Dado um filtro de segmento (salvo ou ad-hoc), retorna os candidatos
// totais e os efetivamente elegíveis (com consentimento válido — mesma
// checagem de negócio de consent.service.js, feita aqui em lote por
// eficiência, já que uma campanha pode ter centenas de destinatários; a
// checagem individual definitiva continua acontecendo em
// message-queue.service.js#enqueueMessage no momento do disparo).
async function previewRecipients({ segmentId = null, segmentFilter = null } = {}) {
  let resolvedFilter = segmentFilter || {};

  if (segmentId) {
    const segment = await segmentsService.getSegmentById(segmentId);
    resolvedFilter = segment.filter_criteria || {};
  }

  const { whereSql, params } = segmentsService.buildCustomerFilterQuery(resolvedFilter);

  const totalResult = await crmPool.query(`SELECT COUNT(*)::int AS count FROM customers c WHERE 1=1 ${whereSql}`, params);

  const eligibleResult = await crmPool.query(
    `SELECT c.id, c.name, c.phone_e164
       FROM customers c
       JOIN consents co ON co.customer_id = c.id AND co.opted_in = true AND co.opted_out = false
      WHERE 1=1 ${whereSql}
      ORDER BY c.id`,
    params
  );

  const totalCandidates = totalResult.rows[0].count;
  return {
    resolvedFilter,
    totalCandidates,
    eligibleCustomers: eligibleResult.rows,
    eligibleCount: eligibleResult.rows.length,
    suppressedCount: totalCandidates - eligibleResult.rows.length,
  };
}

function validateCampaignInput({ name, messageTemplateId }) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new Error('O nome da campanha é obrigatório.');
  }
  if (!messageTemplateId) {
    throw new Error('Selecione um modelo de mensagem.');
  }
}

async function createCampaign({
  name,
  segmentId,
  segmentFilter,
  messageTemplateId,
  couponId,
  giftbackCreditPercent,
  giftbackCreditValue,
  giftbackValidUntil,
  scheduledAt,
  createdBy,
}) {
  validateCampaignInput({ name, messageTemplateId });

  if (!createdBy) {
    throw new Error('createCampaign requer createdBy.');
  }

  const template = await templatesService.getTemplateById(messageTemplateId);
  if (!template || !template.active) {
    throw new Error('Modelo de mensagem não encontrado ou inativo.');
  }

  // segment_filter fica "congelado" no momento da criação — cópia do
  // segmento salvo, ou o filtro ad-hoc informado (FSD seção 11.2).
  let resolvedFilter = segmentFilter && typeof segmentFilter === 'object' ? segmentFilter : {};
  if (segmentId) {
    const segment = await segmentsService.getSegmentById(segmentId);
    resolvedFilter = segment.filter_criteria || {};
  }

  if (couponId) {
    const coupon = await couponsService.getCouponById(couponId);
    if (!coupon || coupon.status !== 'active') {
      throw new Error('Cupom não encontrado ou não está mais ativo.');
    }
  }

  const hasGiftback =
    (giftbackCreditPercent !== null && giftbackCreditPercent !== undefined && giftbackCreditPercent !== '') ||
    (giftbackCreditValue !== null && giftbackCreditValue !== undefined && giftbackCreditValue !== '');
  if (hasGiftback) {
    giftbackService.validateGiftbackData({ creditPercent: giftbackCreditPercent, creditValue: giftbackCreditValue });
  }

  const status = scheduledAt ? 'scheduled' : 'draft';

  const result = await crmPool.query(
    `INSERT INTO campaigns
       (name, segment_id, segment_filter, message_template_id, coupon_id,
        giftback_credit_percent, giftback_credit_value, giftback_valid_until,
        scheduled_at, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING id`,
    [
      name.trim(),
      segmentId || null,
      JSON.stringify(resolvedFilter),
      messageTemplateId,
      couponId || null,
      hasGiftback && giftbackCreditPercent !== '' && giftbackCreditPercent !== undefined && giftbackCreditPercent !== null
        ? Number(giftbackCreditPercent)
        : null,
      hasGiftback && giftbackCreditValue !== '' && giftbackCreditValue !== undefined && giftbackCreditValue !== null
        ? Number(giftbackCreditValue)
        : null,
      giftbackValidUntil || null,
      scheduledAt || null,
      status,
      createdBy,
    ]
  );

  const campaignId = result.rows[0].id;

  // Mantém a associação bidirecional já prevista no schema
  // (coupons.campaign_id, migration 018) em sincronia com campaigns.coupon_id.
  if (couponId) {
    await crmPool.query('UPDATE coupons SET campaign_id = $1 WHERE id = $2', [campaignId, couponId]);
  }

  return getCampaignById(campaignId);
}

// Edição só é permitida enquanto a campanha não foi enviada (rascunho ou
// agendada) — depois disso o histórico não pode ser alterado (FSD seção 10).
async function updateCampaign(id, updates) {
  const existing = await getCampaignRaw(id);
  if (!existing) {
    throw new Error('Campanha não encontrada.');
  }
  if (!ACTIVE_STATUSES.includes(existing.status)) {
    throw new Error('Esta campanha já foi enviada, está sendo enviada ou foi cancelada e não pode mais ser editada.');
  }

  const {
    name = existing.name,
    segmentId = existing.segment_id,
    segmentFilter,
    messageTemplateId = existing.message_template_id,
    couponId,
    giftbackCreditPercent,
    giftbackCreditValue,
    giftbackValidUntil,
    scheduledAt,
  } = updates;

  validateCampaignInput({ name, messageTemplateId });

  const template = await templatesService.getTemplateById(messageTemplateId);
  if (!template || !template.active) {
    throw new Error('Modelo de mensagem não encontrado ou inativo.');
  }

  let resolvedFilter = segmentFilter !== undefined ? segmentFilter : existing.segment_filter;
  if (segmentId) {
    const segment = await segmentsService.getSegmentById(segmentId);
    resolvedFilter = segment.filter_criteria || {};
  }

  const resolvedCouponId = couponId !== undefined ? couponId : existing.coupon_id;
  if (resolvedCouponId) {
    const coupon = await couponsService.getCouponById(resolvedCouponId);
    if (!coupon || coupon.status !== 'active') {
      throw new Error('Cupom não encontrado ou não está mais ativo.');
    }
  }

  const resolvedPercent = giftbackCreditPercent !== undefined ? giftbackCreditPercent : existing.giftback_credit_percent;
  const resolvedValue = giftbackCreditValue !== undefined ? giftbackCreditValue : existing.giftback_credit_value;
  const hasGiftback =
    (resolvedPercent !== null && resolvedPercent !== undefined && resolvedPercent !== '') ||
    (resolvedValue !== null && resolvedValue !== undefined && resolvedValue !== '');
  if (hasGiftback) {
    giftbackService.validateGiftbackData({ creditPercent: resolvedPercent, creditValue: resolvedValue });
  }

  const resolvedScheduledAt = scheduledAt !== undefined ? scheduledAt : existing.scheduled_at;
  const status = resolvedScheduledAt ? 'scheduled' : 'draft';

  await crmPool.query(
    `UPDATE campaigns
        SET name = $1, segment_id = $2, segment_filter = $3, message_template_id = $4,
            coupon_id = $5, giftback_credit_percent = $6, giftback_credit_value = $7,
            giftback_valid_until = $8, scheduled_at = $9, status = $10
      WHERE id = $11`,
    [
      name.trim(),
      segmentId || null,
      JSON.stringify(resolvedFilter),
      messageTemplateId,
      resolvedCouponId || null,
      hasGiftback && resolvedPercent !== '' && resolvedPercent !== undefined && resolvedPercent !== null
        ? Number(resolvedPercent)
        : null,
      hasGiftback && resolvedValue !== '' && resolvedValue !== undefined && resolvedValue !== null
        ? Number(resolvedValue)
        : null,
      (giftbackValidUntil !== undefined ? giftbackValidUntil : existing.giftback_valid_until) || null,
      resolvedScheduledAt || null,
      status,
      id,
    ]
  );

  if (resolvedCouponId !== existing.coupon_id) {
    if (existing.coupon_id) {
      await crmPool.query('UPDATE coupons SET campaign_id = NULL WHERE id = $1 AND campaign_id = $2', [
        existing.coupon_id,
        id,
      ]);
    }
    if (resolvedCouponId) {
      await crmPool.query('UPDATE coupons SET campaign_id = $1 WHERE id = $2', [id, resolvedCouponId]);
    }
  }

  return getCampaignById(id);
}

async function deleteCampaign(id) {
  const existing = await getCampaignRaw(id);
  if (!existing) {
    throw new Error('Campanha não encontrada.');
  }
  if (!ACTIVE_STATUSES.includes(existing.status)) {
    throw new Error('Só é possível excluir campanhas em rascunho ou agendadas.');
  }

  if (existing.coupon_id) {
    await crmPool.query('UPDATE coupons SET campaign_id = NULL WHERE id = $1 AND campaign_id = $2', [
      existing.coupon_id,
      id,
    ]);
  }

  await crmPool.query('DELETE FROM campaigns WHERE id = $1', [id]);
  return true;
}

async function cancelCampaign(id) {
  const existing = await getCampaignRaw(id);
  if (!existing) {
    throw new Error('Campanha não encontrada.');
  }
  if (!ACTIVE_STATUSES.includes(existing.status)) {
    throw new Error('Só é possível cancelar campanhas em rascunho ou agendadas.');
  }

  await crmPool.query(`UPDATE campaigns SET status = 'canceled' WHERE id = $1`, [id]);
  return getCampaignById(id);
}

// Disparo efetivo — usado tanto por "enviar agora" (controller) quanto pelo
// job periódico para campanhas agendadas cuja hora chegou.
async function dispatchCampaign(id) {
  const campaign = await getCampaignRaw(id);
  if (!campaign) {
    throw new Error('Campanha não encontrada.');
  }
  if (!ACTIVE_STATUSES.includes(campaign.status)) {
    throw new Error('Esta campanha já foi enviada ou está cancelada.');
  }

  const { eligibleCustomers } = await previewRecipients({ segmentFilter: campaign.segment_filter });

  // FSD 14.4: uma campanha não pode ser CONFIRMADA sem destinatário
  // elegível. Isso é checado no controller (preview antes de confirmar);
  // aqui, no job automático (sem humano pra avisar), não travamos o
  // sistema — registramos a campanha como enviada com zero destinatários
  // em vez de ficar retentando pra sempre.
  await crmPool.query(`UPDATE campaigns SET status = 'sending' WHERE id = $1`, [id]);

  if (eligibleCustomers.length === 0) {
    await crmPool.query(`UPDATE campaigns SET status = 'sent', sent_at = NOW() WHERE id = $1`, [id]);
    return { dispatched: 0, suppressed: 0 };
  }

  const template = await templatesService.getTemplateById(campaign.message_template_id);
  const coupon = campaign.coupon_id ? await couponsService.getCouponById(campaign.coupon_id) : null;

  let dispatched = 0;
  let suppressed = 0;

  for (const customer of eligibleCustomers) {
    await crmPool.query(
      `INSERT INTO campaign_recipients (campaign_id, customer_id, status)
       VALUES ($1, $2, 'pending')
       ON CONFLICT (campaign_id, customer_id) DO NOTHING`,
      [id, customer.id]
    );

    const variables = { nome: customer.name };
    if (coupon) {
      variables.cupom = coupon.code;
      variables.desconto = coupon.discountValue;
    }

    let body = rulesEngine.renderTemplate(template.bodyText, variables);
    if (template.linkUrl) {
      body = `${body}\n\n${template.linkUrl}`;
    }

    const conversationId = await conversationsService.getOrCreateConversationForCustomer(customer.id);
    const enqueueResult = await messageQueueService.enqueueMessage({
      customerId: customer.id,
      conversationId,
      body,
      templateId: template.id,
      campaignId: id,
      triggerSource: 'campaign',
    });

    if (!enqueueResult.enqueued) {
      await crmPool.query(
        `UPDATE campaign_recipients SET status = 'suppressed' WHERE campaign_id = $1 AND customer_id = $2`,
        [id, customer.id]
      );
      suppressed += 1;
      continue;
    }

    await conversationsService.touchConversation(conversationId);

    if (campaign.giftback_credit_percent !== null || campaign.giftback_credit_value !== null) {
      await giftbackService.createGiftback({
        customerId: customer.id,
        creditPercent: campaign.giftback_credit_percent,
        creditValue: campaign.giftback_credit_value,
        validUntil: campaign.giftback_valid_until,
        campaignId: id,
      });
    }

    dispatched += 1;
  }

  await crmPool.query(`UPDATE campaigns SET status = 'sent', sent_at = NOW() WHERE id = $1`, [id]);
  return { dispatched, suppressed };
}

// "Enviar agora" — dispara imediatamente, mesmo que a campanha tivesse um
// agendamento futuro (o usuário está optando por antecipar).
async function sendCampaignNow(id) {
  return dispatchCampaign(id);
}

// Chamado pelo job periódico (campaigns.job.js): dispara toda campanha
// agendada cuja hora já chegou.
async function dispatchDueCampaigns() {
  const dueResult = await crmPool.query(
    `SELECT id FROM campaigns WHERE status = 'scheduled' AND scheduled_at <= NOW()`
  );

  let dispatched = 0;
  for (const row of dueResult.rows) {
    try {
      await dispatchCampaign(row.id);
      dispatched += 1;
    } catch (err) {
      console.error(`[campaigns] Falha ao disparar campanha agendada id=${row.id}:`, err.message);
    }
  }

  return { checked: dueResult.rows.length, dispatched };
}

// Resultado exibido na tela (FSD 12.6): contagem de destinatários por
// status + vendas/receita atribuídas (só quando campaign_attribution_days
// estiver configurado — sem tela de Configurações ainda, ver
// automation-settings.service.js).
async function getCampaignResults(campaignId, campaignRow = null) {
  const countsResult = await crmPool.query(
    `SELECT status, COUNT(*)::int AS count
       FROM campaign_recipients
      WHERE campaign_id = $1
      GROUP BY status`,
    [campaignId]
  );

  const byStatus = { pending: 0, sent: 0, delivered: 0, responded: 0, failed: 0, suppressed: 0 };
  countsResult.rows.forEach((row) => {
    byStatus[row.status] = row.count;
  });

  const campaign = campaignRow || (await getCampaignRaw(campaignId));
  const attributionDays = await automationSettingsService.getCampaignAttributionDays();

  let attribution = null;
  if (attributionDays !== null && campaign && campaign.sent_at) {
    const attributionResult = await crmPool.query(
      `SELECT COUNT(DISTINCT s.id)::int AS sales_count, COALESCE(SUM(s.total_amount), 0) AS revenue
         FROM campaign_recipients cr
         JOIN sales s ON s.customer_id = cr.customer_id
        WHERE cr.campaign_id = $1
          AND cr.status IN ('sent', 'delivered', 'responded')
          AND s.sale_date >= $2
          AND s.sale_date <= $2::timestamp + ($3 || ' days')::interval`,
      [campaignId, campaign.sent_at, attributionDays]
    );

    attribution = {
      attributedSales: attributionResult.rows[0].sales_count,
      attributedRevenue: Number(attributionResult.rows[0].revenue),
    };
  }

  return { byStatus, attribution };
}

// Hook chamado por automation-trigger.service.js#processNewSale para TODA
// venda nova. Marca como usado o cupom/giftback da campanha mais recente
// (dentro do período de atribuição) da qual o cliente foi destinatário
// efetivo. Não faz nada se o parâmetro de atribuição ainda não foi
// configurado (mesmo padrão "pending_configuration" do resto do sistema).
async function attributeSaleToCampaigns({ sale, customer }) {
  const attributionDays = await automationSettingsService.getCampaignAttributionDays();
  if (attributionDays === null) {
    return;
  }

  // Cupom: um código só, compartilhado pela campanha inteira — a primeira
  // venda atribuída dentro do período "resgata" o cupom (ele já vira
  // indisponível pra atribuições seguintes, coerente com ser de uso único).
  const couponResult = await crmPool.query(
    `SELECT co.id AS coupon_id
       FROM campaign_recipients cr
       JOIN campaigns c ON c.id = cr.campaign_id
       JOIN coupons co ON co.id = c.coupon_id
      WHERE cr.customer_id = $1
        AND cr.status IN ('sent', 'delivered', 'responded')
        AND co.status = 'active'
        AND (co.valid_until IS NULL OR co.valid_until >= $2)
        AND c.sent_at IS NOT NULL
        AND c.sent_at <= $2
        AND c.sent_at >= $2::timestamp - ($3 || ' days')::interval
      ORDER BY c.sent_at DESC
      LIMIT 1`,
    [customer.id, sale.sale_date, attributionDays]
  );

  if (couponResult.rows.length > 0) {
    await crmPool.query(
      `UPDATE coupons
          SET status = 'used', used_by_customer_id = $1, used_in_sale_id = $2, redeemed_at = NOW()
        WHERE id = $3 AND status = 'active'`,
      [customer.id, sale.id, couponResult.rows[0].coupon_id]
    );
  }

  // Giftback: cada destinatário já tem seu próprio crédito individual
  // (emitido no disparo, campaign_id preenchido) — atribui o crédito
  // disponível mais recente desse cliente ligado a uma campanha, dentro do
  // período.
  const giftbackResult = await crmPool.query(
    `SELECT g.id AS giftback_id
       FROM giftback_credits g
       JOIN campaigns c ON c.id = g.campaign_id
      WHERE g.customer_id = $1
        AND g.status = 'available'
        AND (g.valid_until IS NULL OR g.valid_until >= $2)
        AND c.sent_at IS NOT NULL
        AND c.sent_at <= $2
        AND c.sent_at >= $2::timestamp - ($3 || ' days')::interval
      ORDER BY c.sent_at DESC
      LIMIT 1`,
    [customer.id, sale.sale_date, attributionDays]
  );

  if (giftbackResult.rows.length > 0) {
    await crmPool.query(
      `UPDATE giftback_credits
          SET status = 'used', used_in_sale_id = $1
        WHERE id = $2 AND status = 'available'`,
      [sale.id, giftbackResult.rows[0].giftback_id]
    );
  }
}

module.exports = {
  listCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  previewRecipients,
  cancelCampaign,
  sendCampaignNow,
  dispatchDueCampaigns,
  getCampaignResults,
  attributeSaleToCampaigns,
};
