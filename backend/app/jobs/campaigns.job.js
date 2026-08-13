// Job periódico que dispara campanhas agendadas cuja hora já chegou
// (campaigns.service.js#dispatchDueCampaigns). Mesmo padrão de
// automation-rules.job.js e message-queue.job.js: não inicia sozinho ao
// ser importado — main.js decide quando chamar startCampaignsJob().

const { dispatchDueCampaigns } = require('../services/campaigns.service');

const INTERVAL_MS = 60 * 1000; // a cada 1 minuto — mesma cadência do message-queue.job

let intervalHandle = null;
let running = false;

async function runOnce() {
  if (running) {
    return;
  }

  running = true;
  try {
    const result = await dispatchDueCampaigns();
    if (result.checked > 0) {
      console.log('[campaigns-job] Execução concluída:', result);
    }
  } catch (err) {
    console.error('[campaigns-job] Erro ao verificar campanhas agendadas:', err.message);
  } finally {
    running = false;
  }
}

function startCampaignsJob() {
  if (intervalHandle) {
    return;
  }

  console.log('[campaigns-job] Iniciando job de disparo de campanhas agendadas (a cada 60s).');

  runOnce();
  intervalHandle = setInterval(runOnce, INTERVAL_MS);
}

function stopCampaignsJob() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

module.exports = {
  startCampaignsJob,
  stopCampaignsJob,
  runOnce,
};
