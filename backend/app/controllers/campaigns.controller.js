// Controller de campanhas manuais (FSD seções 6.4, 12.6, 13.6).
// Leitura e escrita liberadas a Admin e Acesso Limitado (FSD linha 332 da
// matriz de permissões) — criar template/cupom/giftback NOVO durante o
// fluxo continua exclusivo do Admin, mas isso já é garantido pelas rotas
// de escrita de Templates/Cupons/Giftback (requireAdmin), não precisa ser
// repetido aqui: esta tela só permite ESCOLHER recursos já existentes.

const campaignsService = require('../services/campaigns.service');

function handleKnownErrors(err, res) {
  if (err.message === 'Campanha não encontrada.') {
    res.status(404).json({ error: err.message });
    return true;
  }
  if (
    err.message.includes('não pode mais ser editada') ||
    err.message.includes('já foi enviada') ||
    err.message.includes('Só é possível')
  ) {
    res.status(409).json({ error: err.message });
    return true;
  }
  if (
    err.message.includes('obrigatório') ||
    err.message.includes('Selecione um modelo') ||
    err.message.includes('não encontrado ou') ||
    err.message.includes('crédito deve ser') ||
    err.message.includes('apenas um dos dois')
  ) {
    res.status(400).json({ error: err.message });
    return true;
  }
  return false;
}

// GET /campaigns?status=
async function listCampaigns(req, res) {
  try {
    const { status } = req.query;
    const campaigns = await campaignsService.listCampaigns({ status: status || null });
    res.json({ campaigns });
  } catch (err) {
    console.error('Erro ao listar campanhas:', err.message);
    res.status(500).json({ error: 'Erro ao carregar campanhas.' });
  }
}

// GET /campaigns/:id
async function getCampaignById(req, res) {
  try {
    const campaign = await campaignsService.getCampaignById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campanha não encontrada.' });
    }
    res.json({ campaign });
  } catch (err) {
    console.error('Erro ao buscar campanha:', err.message);
    res.status(500).json({ error: 'Erro ao buscar campanha.' });
  }
}

// POST /campaigns/preview-recipients { segmentId?, segmentFilter? }
// Pré-visualização ad-hoc (FSD 13.6, passo 5) — usada tanto no formulário
// de criação/edição (ainda sem id salvo) quanto para conferir de novo antes
// de confirmar o disparo.
async function previewRecipients(req, res) {
  try {
    const { segmentId, segmentFilter } = req.body;
    const preview = await campaignsService.previewRecipients({
      segmentId: segmentId || null,
      segmentFilter: segmentFilter || null,
    });
    res.json({
      totalCandidates: preview.totalCandidates,
      eligibleCount: preview.eligibleCount,
      suppressedCount: preview.suppressedCount,
    });
  } catch (err) {
    console.error('Erro ao pré-visualizar destinatários:', err.message);
    res.status(500).json({ error: 'Erro ao pré-visualizar destinatários.' });
  }
}

// POST /campaigns
async function createCampaign(req, res) {
  try {
    const {
      name,
      segmentId,
      segmentFilter,
      messageTemplateId,
      couponId,
      giftbackCreditPercent,
      giftbackCreditValue,
      giftbackValidUntil,
      scheduledAt,
    } = req.body;

    const campaign = await campaignsService.createCampaign({
      name,
      segmentId,
      segmentFilter,
      messageTemplateId,
      couponId,
      giftbackCreditPercent,
      giftbackCreditValue,
      giftbackValidUntil,
      scheduledAt,
      createdBy: req.user.id,
    });
    res.status(201).json({ campaign });
  } catch (err) {
    if (handleKnownErrors(err, res)) return;
    console.error('Erro ao criar campanha:', err.message);
    res.status(500).json({ error: 'Erro ao criar campanha.' });
  }
}

// PATCH /campaigns/:id
async function updateCampaign(req, res) {
  try {
    const campaign = await campaignsService.updateCampaign(req.params.id, req.body);
    res.json({ campaign });
  } catch (err) {
    if (handleKnownErrors(err, res)) return;
    console.error('Erro ao atualizar campanha:', err.message);
    res.status(500).json({ error: 'Erro ao atualizar campanha.' });
  }
}

// DELETE /campaigns/:id
async function deleteCampaign(req, res) {
  try {
    await campaignsService.deleteCampaign(req.params.id);
    res.json({ success: true });
  } catch (err) {
    if (handleKnownErrors(err, res)) return;
    console.error('Erro ao excluir campanha:', err.message);
    res.status(500).json({ error: 'Erro ao excluir campanha.' });
  }
}

// POST /campaigns/:id/cancel
async function cancelCampaign(req, res) {
  try {
    const campaign = await campaignsService.cancelCampaign(req.params.id);
    res.json({ campaign });
  } catch (err) {
    if (handleKnownErrors(err, res)) return;
    console.error('Erro ao cancelar campanha:', err.message);
    res.status(500).json({ error: 'Erro ao cancelar campanha.' });
  }
}

// POST /campaigns/:id/send
async function sendCampaignNow(req, res) {
  try {
    // FSD 14.4: não confirma disparo sem destinatário elegível.
    const campaign = await campaignsService.getCampaignById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campanha não encontrada.' });
    }

    const preview = await campaignsService.previewRecipients({ segmentFilter: campaign.segmentFilter });
    if (preview.eligibleCount === 0) {
      return res.status(400).json({ error: 'Nenhum destinatário elegível (com consentimento válido) para esta campanha.' });
    }

    const result = await campaignsService.sendCampaignNow(req.params.id);
    res.json({ result });
  } catch (err) {
    if (handleKnownErrors(err, res)) return;
    console.error('Erro ao disparar campanha:', err.message);
    res.status(500).json({ error: 'Erro ao disparar campanha.' });
  }
}

module.exports = {
  listCampaigns,
  getCampaignById,
  previewRecipients,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  cancelCampaign,
  sendCampaignNow,
};
