// Job periódico de sincronização somente-leitura com o ERP Uniplus
// (backend/app/services/sync.service.js#runSync).
//
// IMPORTANTE: este arquivo NÃO inicia o job automaticamente ao ser importado
// (`require`). Quem decide QUANDO iniciar é o `main.js` — este módulo apenas
// expõe `startUniplusSyncJob()`, que deve ser chamada explicitamente. Isso
// evita efeitos colaterais só por importar o arquivo (ex.: em testes) e deixa
// claro no main.js onde o job é ligado. Mesmo padrão de
// `backend/app/jobs/message-queue.job.js`.
//
// Integração pendente (a ser feita por outro processo/agente no main.js —
// ver backend/app/services/SYNC_SERVICE.routes.md):
//   const { startUniplusSyncJob } = require('./jobs/uniplus-sync.job');
//   ...
//   app.listen(settings.port, () => {
//     console.log(`Servidor rodando na porta ${settings.port}`);
//     startUniplusSyncJob();
//   });
//
// Sem sobreposição de execuções: `syncService.runSync()` devolve a Promise da
// execução em andamento em vez de iniciar uma segunda, então um tick do
// intervalo que caia no meio de uma sincronização longa não duplica trabalho.

const settings = require('../config/settings');
const syncService = require('../services/sync.service');

// Intervalo definido em docs/uniplus-schema/05-mapeamento-sincronizacao.md,
// § "Parâmetros técnicos" (padrão: 15 minutos).
const DEFAULT_INTERVAL_MINUTES = 15;

let intervalHandle = null;

function getIntervalMs() {
  const configured = settings.uniplus && Number(settings.uniplus.syncIntervalMinutes);
  const minutes = Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_INTERVAL_MINUTES;
  return minutes * 60 * 1000;
}

async function runOnce() {
  try {
    if (syncService.isSyncRunning()) {
      console.log('[uniplus-sync-job] Sincronização anterior ainda em andamento; tick ignorado.');
      return;
    }

    const run = await syncService.runSync({ triggeredBy: 'scheduler' });

    if (run) {
      console.log(
        `[uniplus-sync-job] Execução #${run.id} concluída com status "${run.status}":`,
        run.records_imported
      );
    } else {
      console.log('[uniplus-sync-job] Execução concluída sem registro de resultado.');
    }
  } catch (err) {
    // Nenhuma falha de sincronização pode derrubar o processo do servidor.
    console.error(
      '[uniplus-sync-job] Erro ao executar a sincronização com o Uniplus:',
      err && err.message ? err.message : err
    );
  }
}

// Inicia a sincronização periódica. Idempotente: chamadas subsequentes não
// criam múltiplos intervalos.
function startUniplusSyncJob() {
  if (intervalHandle) {
    return;
  }

  const intervalMs = getIntervalMs();
  console.log(
    `[uniplus-sync-job] Iniciando job de sincronização com o Uniplus (a cada ${
      intervalMs / 60000
    } minuto(s)).`
  );

  // Executa uma vez imediatamente ao iniciar, e depois a cada intervalMs.
  runOnce();
  intervalHandle = setInterval(runOnce, intervalMs);
}

// Para o job (útil em testes ou shutdown gracioso).
function stopUniplusSyncJob() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

module.exports = {
  startUniplusSyncJob,
  stopUniplusSyncJob,
};
