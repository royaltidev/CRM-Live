// Controller de segmentação de clientes: segmentos dinâmicos + critérios RFM.
// Ver docs/FSD.md, seção 6.2, tela 12.4 e seção 20.
//
// Regras de acesso (ver segments.routes.md para o mapeamento completo):
// - Segmentos dinâmicos (CRUD + preview): qualquer usuário autenticado
//   (Admin e Acesso limitado podem editar segmentação — FSD seção 8.5).
// - Leitura dos critérios RFM: qualquer usuário autenticado.
// - Escrita dos critérios RFM (PUT /segments/rfm/criteria): EXCLUSIVO do
//   Administrador (FSD seção 20) — protegido por requireAdmin na rota.
// - Recálculo manual do RFM: qualquer usuário autenticado. Nesta fase não há
//   job de sincronização automática com o Uniplus (Fase 4 ainda não
//   implementada), então o recálculo é uma ação manual disparável por
//   qualquer usuário logado. Quando a sincronização automática existir, ela
//   deverá chamar rfmService.recalculateRfmForAllCustomers() ao final do sync.

const segmentsService = require('../services/segments.service');
const rfmService = require('../services/rfm.service');

// GET /segments?includeInactive=true|false
async function listSegments(req, res) {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const segments = await segmentsService.listSegments({ includeInactive });
    res.json({ segments });
  } catch (err) {
    console.error('Erro ao listar segmentos:', err.message);
    res.status(500).json({ error: 'Erro ao carregar segmentos.' });
  }
}

// GET /segments/:id
async function getSegmentById(req, res) {
  try {
    const segment = await segmentsService.getSegmentById(req.params.id);
    res.json({ segment });
  } catch (err) {
    if (err.message === 'Segmento não encontrado') {
      return res.status(404).json({ error: err.message });
    }
    console.error('Erro ao buscar segmento:', err.message);
    res.status(500).json({ error: 'Erro ao buscar segmento.' });
  }
}

// POST /segments  (body: { name, filterCriteria })
async function createSegment(req, res) {
  try {
    const { name, filterCriteria } = req.body;
    const segment = await segmentsService.createSegment({
      name,
      filterCriteria,
      createdBy: req.user.id,
    });
    res.status(201).json({ segment });
  } catch (err) {
    console.error('Erro ao criar segmento:', err.message);
    res.status(400).json({ error: err.message || 'Erro ao criar segmento.' });
  }
}

// PATCH /segments/:id  (body: { name?, filterCriteria?, active? })
async function updateSegment(req, res) {
  try {
    const { name, filterCriteria, active } = req.body;
    const segment = await segmentsService.updateSegment(req.params.id, {
      name,
      filterCriteria,
      active,
    });
    res.json({ segment });
  } catch (err) {
    if (err.message === 'Segmento não encontrado') {
      return res.status(404).json({ error: err.message });
    }
    console.error('Erro ao atualizar segmento:', err.message);
    res.status(400).json({ error: err.message || 'Erro ao atualizar segmento.' });
  }
}

// DELETE /segments/:id
async function deleteSegment(req, res) {
  try {
    await segmentsService.deleteSegment(req.params.id);
    res.json({ success: true, message: 'Segmento excluído com sucesso.' });
  } catch (err) {
    if (err.message === 'Segmento não encontrado') {
      return res.status(404).json({ error: err.message });
    }
    if (err.message.includes('campanhas') || err.message.includes('referenciado')) {
      return res.status(409).json({ error: err.message });
    }
    console.error('Erro ao excluir segmento:', err.message);
    res.status(500).json({ error: 'Erro ao excluir segmento.' });
  }
}

// POST /segments/preview  (body: { filterCriteria })
// Permite pré-visualizar um filtro ainda não salvo (ou reusar para contar
// clientes de um segmento já existente, enviando seu filter_criteria).
async function previewSegmentCustomers(req, res) {
  try {
    const { filterCriteria } = req.body;
    const result = await segmentsService.previewSegmentCustomers(filterCriteria || {});
    res.json(result);
  } catch (err) {
    console.error('Erro ao pré-visualizar segmento:', err.message);
    res.status(400).json({ error: err.message || 'Erro ao pré-visualizar segmento.' });
  }
}

// GET /segments/rfm/criteria
async function getRfmCriteria(req, res) {
  try {
    const criteria = await rfmService.getRfmCriteria();
    if (!criteria) {
      return res.json({ configured: false, criteria: null });
    }
    res.json({ configured: true, criteria });
  } catch (err) {
    console.error('Erro ao buscar critérios RFM:', err.message);
    res.status(500).json({ error: 'Erro ao buscar critérios RFM.' });
  }
}

// PUT /segments/rfm/criteria  (ADMIN ONLY — protegido por requireAdmin na rota)
async function setRfmCriteria(req, res) {
  try {
    const criteria = await rfmService.setRfmCriteria(req.body, req.user.id);
    res.json({ configured: true, criteria });
  } catch (err) {
    console.error('Erro ao salvar critérios RFM:', err.message);
    res.status(400).json({ error: err.message || 'Erro ao salvar critérios RFM.' });
  }
}

// POST /segments/rfm/recalculate
async function recalculateRfm(req, res) {
  try {
    const result = await rfmService.recalculateRfmForAllCustomers();
    res.json(result);
  } catch (err) {
    console.error('Erro ao recalcular RFM:', err.message);
    res.status(500).json({ error: 'Erro ao recalcular classificação RFM.' });
  }
}

module.exports = {
  listSegments,
  getSegmentById,
  createSegment,
  updateSegment,
  deleteSegment,
  previewSegmentCustomers,
  getRfmCriteria,
  setRfmCriteria,
  recalculateRfm,
};
