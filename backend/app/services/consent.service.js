// Serviço de Consentimento e LGPD (FSD seção 6.6, 13.8, 14.2).
//
// *** CONTRATO PÚBLICO ***
// `isCustomerEligibleForMessage` e `processInboundOptOutKeyword` são consumidas por
// OUTRO módulo (fila de envio de mensagens / caixa de entrada WhatsApp, em construção
// em paralelo por outro agente, consumido de fato na Fase 9). NÃO renomeie essas
// funções nem altere a assinatura (parâmetros/retorno) depois de criadas — isso
// quebraria a integração.
//
// Regras de negócio:
// - Nenhuma mensagem pode ser enviada a um cliente sem `consents.opted_in = true`
//   E `consents.opted_out = false`.
// - Quando o cliente responde com uma palavra-chave de saída, ele deve ser bloqueado
//   IMEDIATAMENTE (opted_out = true) e um evento de segurança deve ser registrado.

const { crmPool } = require('../database/connection');
const { logSecurityEvent } = require('./auth.service');

// Palavras-chave de saída reconhecidas (case-insensitive, comparação EXATA após trim
// da mensagem completa — não é uma checagem de substring, para evitar falso positivo
// em frases longas que apenas mencionem a palavra). Ajuste esta lista conforme necessário.
const OPT_OUT_KEYWORDS = ['SAIR', 'PARAR', 'CANCELAR', 'STOP'];

// Retorna a linha de `consents` para o cliente, ou `null` se não existir nenhum
// registro ainda (cliente "nunca contatado": nem opted_in nem opted_out).
async function getConsent(customerId) {
  const result = await crmPool.query('SELECT * FROM consents WHERE customer_id = $1', [customerId]);
  return result.rows[0] || null;
}

// Faz UPSERT em `consents` marcando opted_in = true. Não mexe em opted_out.
async function optIn(customerId, source) {
  const result = await crmPool.query(
    `INSERT INTO consents (customer_id, opted_in, opted_in_at, opted_in_source)
     VALUES ($1, true, NOW(), $2)
     ON CONFLICT (customer_id) DO UPDATE
       SET opted_in = true,
           opted_in_at = NOW(),
           opted_in_source = $2
     RETURNING *`,
    [customerId, source]
  );

  return result.rows[0];
}

// Faz UPSERT em `consents` marcando opted_out = true. Não mexe em opted_in.
async function optOut(customerId, source) {
  const result = await crmPool.query(
    `INSERT INTO consents (customer_id, opted_out, opted_out_at, opted_out_source)
     VALUES ($1, true, NOW(), $2)
     ON CONFLICT (customer_id) DO UPDATE
       SET opted_out = true,
           opted_out_at = NOW(),
           opted_out_source = $2
     RETURNING *`,
    [customerId, source]
  );

  return result.rows[0];
}

// Função crítica consumida pela fila de envio antes de cada disparo.
// Retorna `true` SOMENTE SE existir registro em `consents` com
// opted_in = true E opted_out = false. Qualquer outro caso retorna `false`.
async function isCustomerEligibleForMessage(customerId) {
  const consent = await getConsent(customerId);

  if (!consent) {
    return false;
  }

  return consent.opted_in === true && consent.opted_out === false;
}

// Processa uma mensagem recebida do cliente verificando se o corpo da mensagem
// corresponde EXATAMENTE (após trim, case-insensitive) a uma palavra-chave de saída.
// Se corresponder: registra opt-out imediato + evento de segurança, retorna `true`.
// Caso contrário, não faz nada e retorna `false`.
async function processInboundOptOutKeyword(customerId, messageBody) {
  if (typeof messageBody !== 'string') {
    return false;
  }

  const normalized = messageBody.trim().toUpperCase();
  const matchedKeyword = OPT_OUT_KEYWORDS.find((keyword) => keyword === normalized);

  if (!matchedKeyword) {
    return false;
  }

  await optOut(customerId, 'keyword_reply');
  await logSecurityEvent('customer_opt_out', null, customerId, null, { keyword: matchedKeyword });

  return true;
}

module.exports = {
  OPT_OUT_KEYWORDS,
  getConsent,
  optIn,
  optOut,
  isCustomerEligibleForMessage,
  processInboundOptOutKeyword,
};
