// Job do Piloto Automático da Loja — sinal rápido de venda nova.
//
// Dois caminhos convergem no mesmo tratamento
// (backend/app/services/realtime-sale-listener.service.js § handleSaleEvent),
// documentado no artifact "Piloto Automático da Loja":
// 1. LISTEN persistente no canal crm_live_nova_venda — as duas triggers
//    (operacao e dav) já foram validadas ponta a ponta numa cópia de teste
//    em 16/08/2026.
// 2. Poller de segurança, de baixa frequência (5 min, não 30s — ver a
//    discussão de custo/risco no documento), cobrindo a janela em que o
//    listener esteve fora do ar, já que NOTIFY não é durável.
//
// Reconexão com backoff exponencial (1s, 2s, 4s... até um teto de 60s) —
// se a conexão de LISTEN cair, reconecta e reemite o LISTEN sozinho.

const { uniplusPool } = require('../database/connection');
const uniplusRepository = require('../integrations/uniplus/uniplus.repository');
const { handleSaleEvent } = require('../services/realtime-sale-listener.service');

const CHANNEL = 'crm_live_nova_venda';
const SAFETY_POLL_INTERVAL_MS = 5 * 60 * 1000;
const SAFETY_POLL_WINDOW_HOURS = 48;
const MAX_BACKOFF_MS = 60 * 1000;

let listenerClient = null;
let backoffMs = 1000;
let started = false;
let reconnecting = false;
let pollRunning = false;

function parsePayload(raw) {
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error('[realtime-sale-listener] Payload de notificação inválido:', raw, err.message);
    return null;
  }
}

// `error` e `end` podem disparar os dois para o mesmo client morto — sem
// esse flag, cada um agendava sua própria reconexão e dois listeners
// acabavam ativos no mesmo canal (achado de revisão externa, 24/08/2026).
function scheduleReconnect() {
  if (reconnecting) {
    return;
  }
  reconnecting = true;

  if (listenerClient) {
    listenerClient.removeAllListeners();
    listenerClient.release(new Error('listener reconectando'));
    listenerClient = null;
  }
  setTimeout(connectAndListen, backoffMs);
  backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
}

async function connectAndListen() {
  reconnecting = false;
  try {
    listenerClient = await uniplusPool.connect();
    await listenerClient.query(`LISTEN ${CHANNEL}`);
    backoffMs = 1000; // reset após conexão bem-sucedida

    listenerClient.on('notification', (msg) => {
      const payload = parsePayload(msg.payload);
      if (!payload) {
        return;
      }
      handleSaleEvent(payload).catch((err) => {
        console.error('[realtime-sale-listener] Falha ao tratar evento:', err.message);
      });
    });

    listenerClient.on('error', (err) => {
      console.error('[realtime-sale-listener] Conexão de LISTEN caiu:', err.message);
      scheduleReconnect();
    });

    listenerClient.on('end', () => {
      scheduleReconnect();
    });

    console.log(`[realtime-sale-listener] Ouvindo canal "${CHANNEL}" no banco do Uniplus.`);
  } catch (err) {
    console.error('[realtime-sale-listener] Falha ao conectar para LISTEN:', err.message);
    scheduleReconnect();
  }
}

// pollRunning evita sobreposição se um poll demorar mais que o intervalo de
// 5 min (48h de vendas em loop sequencial pode acontecer). O try/catch por
// id evita que uma falha isolada (ex.: um id com dado inconsistente) aborte
// o resto do lote — antes, o catch só existia no nível da função inteira
// (achados de revisão externa, 24/08/2026).
async function runSafetyPoll() {
  if (pollRunning) {
    return;
  }
  pollRunning = true;

  try {
    const operacaoIds = await uniplusRepository.fetchRecentConfirmedOperacaoIds(SAFETY_POLL_WINDOW_HOURS);
    for (const id of operacaoIds) {
      try {
        await handleSaleEvent({ origin: 'operacao', id });
      } catch (err) {
        console.error(`[realtime-sale-listener] Falha ao processar operacao id=${id} no poller:`, err.message);
      }
    }

    const davRows = await uniplusRepository.fetchRecentDavCandidateIds(SAFETY_POLL_WINDOW_HOURS);
    for (const row of davRows) {
      try {
        await handleSaleEvent({ origin: 'dav', id: row.id, tipodocumento: row.tipodocumento });
      } catch (err) {
        console.error(`[realtime-sale-listener] Falha ao processar dav id=${row.id} no poller:`, err.message);
      }
    }
  } catch (err) {
    console.error('[realtime-sale-listener] Falha no poller de segurança:', err.message);
  } finally {
    pollRunning = false;
  }
}

function startRealtimeSaleListenerJob() {
  if (started) {
    return;
  }
  started = true;

  connectAndListen();
  setInterval(runSafetyPoll, SAFETY_POLL_INTERVAL_MS);
}

module.exports = {
  startRealtimeSaleListenerJob,
};
