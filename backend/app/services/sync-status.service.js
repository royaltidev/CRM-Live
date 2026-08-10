// Serviço do painel de status de sincronização com o Uniplus (FSD seção
// 12.14 e 13.10). Consulta a tabela `sync_runs` (migration 027) e expõe o
// gatilho manual de sincronização (`triggered_by = 'manual'`).
//
// Acessível por Administrador e Acesso Limitado (mesma regra da consulta,
// ver docs/uniplus-schema/05-mapeamento-sincronizacao.md, seção final).

const { crmPool } = require('../database/connection');

function mapSyncRunRow(row) {
  return {
    id: row.id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    status: row.status,
    recordsImported: row.records_imported,
    errors: row.errors,
    triggeredBy: row.triggered_by,
  };
}

// GET /sync/runs — histórico de execuções, mais recente primeiro.
async function listSyncRuns({ limit = 20 } = {}) {
  const parsedLimit = Number.parseInt(limit, 10);
  const safeLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20;

  const result = await crmPool.query(
    `SELECT * FROM sync_runs ORDER BY started_at DESC LIMIT $1`,
    [safeLimit]
  );

  return result.rows.map(mapSyncRunRow);
}

// POST /sync/run — dispara uma sincronização manual (triggered_by = 'manual').
//
// Importante: `sync.service.js` é implementado por outro agente em paralelo
// (Fase 4, pipeline de sincronização) e pode não existir ainda neste
// ambiente de desenvolvimento — por isso o `require` é feito dentro da
// função, não no topo do arquivo, para adiar a resolução do módulo até o
// momento da chamada.
//
// Não aguardamos `runSync` terminar: a sincronização completa pode demorar,
// então disparamos e retornamos imediatamente. Quem quiser acompanhar o
// resultado consulta `listSyncRuns` depois (o registro final é gravado em
// `sync_runs` pelo próprio `runSync`).
async function triggerManualSync() {
  // eslint-disable-next-line global-require
  const syncService = require('./sync.service');

  if (syncService.isSyncRunning()) {
    throw new Error('sync_already_running');
  }

  syncService
    .runSync({ triggeredBy: 'manual' })
    .catch((err) => {
      console.error('Erro na sincronização manual:', err.message);
    });

  return { started: true };
}

module.exports = {
  listSyncRuns,
  triggerManualSync,
};
