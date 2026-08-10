// Job periódico das réguas de relacionamento orientadas a TEMPO
// (backend/app/services/time-based-rules.service.js).
//
// A cada ciclo verifica, nesta ordem: aniversariantes, reativação (win-back em
// cascata), ciclo de consumo (recompra por produto) e pesquisa de satisfação
// (NPS). Cada verificação roda dentro do seu PRÓPRIO try/catch: uma régua com
// problema (ex.: consulta que falha) não pode impedir as outras de rodar.
//
// IMPORTANTE: este arquivo NÃO inicia o job automaticamente ao ser importado
// (`require`) — mesmo padrão de message-queue.job.js. Quem decide QUANDO
// iniciar é o `main.js`, chamando `startAutomationRulesJob()` explicitamente:
//
//   const { startAutomationRulesJob } = require('./jobs/automation-rules.job');
//   ...
//   app.listen(settings.port, () => {
//     console.log(`Servidor rodando na porta ${settings.port}`);
//     startAutomationRulesJob();
//   });
//
// O job nunca derruba o processo: qualquer erro é logado e o ciclo seguinte
// acontece normalmente.

const timeBasedRules = require('../services/time-based-rules.service');

const INTERVAL_MS = 5 * 60 * 1000; // a cada 5 minutos

let intervalHandle = null;
// Evita sobreposição: se um ciclo demorar mais que INTERVAL_MS (muitos clientes
// elegíveis, banco lento), o próximo tick é ignorado em vez de rodar em
// paralelo — dois ciclos simultâneos só disputariam o mesmo dedup.
let running = false;

const CHECKS = [
  { name: 'aniversários', run: () => timeBasedRules.checkBirthdays() },
  { name: 'reativação (win-back)', run: () => timeBasedRules.checkWinback() },
  { name: 'ciclo de consumo', run: () => timeBasedRules.checkConsumptionCycle() },
  { name: 'pesquisa de satisfação (NPS)', run: () => timeBasedRules.checkNpsSurveys() },
];

async function runOnce() {
  if (running) {
    console.log('[automation-rules-job] Ciclo anterior ainda em execução — tick ignorado.');
    return;
  }

  running = true;
  try {
    for (const check of CHECKS) {
      try {
        const summary = await check.run();
        // Só loga quando houve algo a fazer, para não poluir o log a cada 5
        // minutos com quatro linhas de zeros.
        if (summary && (summary.attempted > 0 || summary.rulesSkipped > 0)) {
          console.log(`[automation-rules-job] ${check.name}:`, summary);
        }
      } catch (err) {
        console.error(`[automation-rules-job] Erro ao verificar ${check.name}:`, err.message);
      }
    }
  } finally {
    running = false;
  }
}

// Inicia a verificação periódica das réguas orientadas a tempo. Idempotente:
// chamadas subsequentes não criam múltiplos intervalos.
function startAutomationRulesJob() {
  if (intervalHandle) {
    return;
  }

  console.log('[automation-rules-job] Iniciando job de réguas orientadas a tempo (a cada 5 min).');

  // Executa uma vez imediatamente ao iniciar, e depois a cada INTERVAL_MS.
  runOnce();
  intervalHandle = setInterval(runOnce, INTERVAL_MS);
}

// Para o job (útil em testes ou shutdown gracioso).
function stopAutomationRulesJob() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

module.exports = {
  startAutomationRulesJob,
  stopAutomationRulesJob,
  // Exportado para testes: permite rodar um único ciclo sem agendar intervalos.
  runOnce,
};
