// Job periódico que processa a fila de envio de mensagens
// (backend/app/services/message-queue.service.js#processQueueBatch).
//
// IMPORTANTE: este arquivo NÃO inicia o job automaticamente ao ser
// importado (`require`). Quem decide QUANDO iniciar é o `main.js` — este
// módulo apenas expõe `startMessageQueueJob()`, que deve ser chamada
// explicitamente. Isso evita efeitos colaterais só por importar o arquivo
// (ex.: em testes) e deixa claro no main.js onde o job é ligado.
//
// Integração pendente (a ser feita por outro processo/agente no main.js):
//   const { startMessageQueueJob } = require('./jobs/message-queue.job');
//   ...
//   app.listen(settings.port, () => {
//     console.log(`Servidor rodando na porta ${settings.port}`);
//     startMessageQueueJob();
//   });
//
// Ver também backend/app/controllers/messages.routes.md para mais detalhes.

const { processQueueBatch } = require('../services/message-queue.service');

const INTERVAL_MS = 60 * 1000; // a cada 1 minuto

let intervalHandle = null;

async function runOnce() {
  try {
    const result = await processQueueBatch();
    console.log(`[message-queue-job] Execução concluída:`, result);
  } catch (err) {
    console.error('[message-queue-job] Erro ao processar lote da fila de mensagens:', err.message);
  }
}

// Inicia o processamento periódico da fila. Idempotente: chamadas
// subsequentes não criam múltiplos intervalos.
function startMessageQueueJob() {
  if (intervalHandle) {
    return;
  }

  console.log('[message-queue-job] Iniciando job de processamento da fila de mensagens (a cada 60s).');

  // Executa uma vez imediatamente ao iniciar, e depois a cada INTERVAL_MS.
  runOnce();
  intervalHandle = setInterval(runOnce, INTERVAL_MS);
}

// Para o job (útil em testes ou shutdown gracioso).
function stopMessageQueueJob() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

module.exports = {
  startMessageQueueJob,
  stopMessageQueueJob,
};
