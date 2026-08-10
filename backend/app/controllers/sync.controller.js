// Controller do painel de status de sincronização com o Uniplus (FSD seção
// 12.14, fluxo 13.10). Rota visível por Admin E Acesso Limitado — usa apenas
// requireAuth, sem requireAdmin (mesmo padrão de messages.controller.js).
//
// Sem acesso direto ao banco aqui: toda leitura/escrita passa por
// backend/app/services/sync-status.service.js.

const syncStatusService = require('../services/sync-status.service');

// GET /sync/runs
// Query param opcional: limit (default 20).
async function listSyncRunsHandler(req, res) {
  try {
    const { limit } = req.query;

    const runs = await syncStatusService.listSyncRuns({ limit });
    res.json({ runs });
  } catch (err) {
    console.error('Erro ao listar execuções de sincronização:', err.message);
    res.status(500).json({ error: 'Erro ao carregar o status de sincronização.' });
  }
}

// POST /sync/run
async function triggerManualSyncHandler(req, res) {
  try {
    await syncStatusService.triggerManualSync();
    res.status(202).json({ message: 'Sincronização iniciada.' });
  } catch (err) {
    if (err.message === 'sync_already_running') {
      res.status(409).json({ error: 'Sincronização já em andamento.' });
      return;
    }

    console.error('Erro ao disparar sincronização manual:', err.message);
    res.status(500).json({ error: 'Erro ao disparar sincronização manual.' });
  }
}

module.exports = {
  listSyncRunsHandler,
  triggerManualSyncHandler,
};
