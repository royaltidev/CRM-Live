// Serviço de gestão de satisfação (NPS) — FSD seção 6.8, fluxo 13.9.
//
// A régua `nps_survey` (Fase 7, rules-engine.service.js) já grava a linha
// `pending` em `nps_responses` ao enviar a pesquisa. Este serviço cuida da
// outra ponta: capturar a NOTA respondida pelo cliente.
//
// Decisão de escopo (ambiguidade real do FSD, resolvida por leitura do texto
// + do código já existente, sem inventar regra de negócio nova):
// - Formato aceito para a resposta: o FSD não define. Só é reconhecida como
//   nota de NPS uma mensagem cujo conteúdo INTEIRO seja um número de 0 a 10
//   (com "nota" opcional na frente ou "/10" no final) — nunca um número
//   embutido em frase livre (ex.: "entreguei em 9 dias" não deve ser
//   interpretado como nota 9). Mensagem que não bate nesse formato não é
//   tratada como resposta de NPS e segue o fluxo normal da caixa de entrada
//   (Fase 9) — o cliente pode estar respondendo outra coisa.
// - "Alerta imediato ao Administrador" (FSD 6.8/12.12): não existe nenhum
//   canal de notificação push/e-mail/WhatsApp para o Administrador em
//   nenhuma outra parte do sistema (a tabela `users` nem tem telefone
//   cadastrado). Resolvido como o "alerta destacado" citado literalmente em
//   12.12: `nps_responses.status = 'low_score_open'` já sinaliza a nota
//   pendente de tratamento, e a tela de gestão de NPS (Parte 2) deve
//   destacá-la — sem inventar um canal de notificação externo inexistente.

const { crmPool } = require('../database/connection');
const automationSettingsService = require('./automation-settings.service');

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Só reconhece a mensagem como nota se ela for, sozinha, um número de 0 a
// 10 — opcionalmente prefixada por "nota" ou sufixada por "/10". Retorna
// null quando o formato não bate (mensagem não é uma resposta de NPS).
function parseNpsScore(body) {
  const normalized = normalizeText(body);
  const match = normalized.match(/^(?:nota\s*[:\-]?\s*)?(10|[0-9])(?:\s*\/\s*10)?\s*[.!]?$/);
  return match ? Number(match[1]) : null;
}

// Pesquisa de satisfação mais recente ainda sem resposta para o cliente.
async function findPendingNpsResponse(customerId) {
  const result = await crmPool.query(
    `SELECT * FROM nps_responses
     WHERE customer_id = $1 AND status = 'pending'
     ORDER BY survey_sent_at DESC
     LIMIT 1`,
    [customerId]
  );

  return result.rows[0] || null;
}

// Tenta capturar a nota de NPS a partir de uma mensagem recebida. Retorna a
// linha de `nps_responses` atualizada quando reconhecida como resposta
// válida, ou null quando não há pesquisa pendente ou a mensagem não bate no
// formato de nota (nesses casos, quem chama deve seguir o fluxo normal da
// caixa de entrada).
async function captureNpsResponse({ customerId, body }) {
  const pending = await findPendingNpsResponse(customerId);
  if (!pending) {
    return null;
  }

  const score = parseNpsScore(body);
  if (score === null) {
    return null;
  }

  const threshold = await automationSettingsService.getNpsLowScoreThreshold();
  const status = score <= threshold ? 'low_score_open' : 'answered';

  const result = await crmPool.query(
    `UPDATE nps_responses
     SET score = $1, responded_at = NOW(), status = $2
     WHERE id = $3
     RETURNING *`,
    [score, status, pending.id]
  );

  return result.rows[0];
}

module.exports = {
  parseNpsScore,
  findPendingNpsResponse,
  captureNpsResponse,
};
