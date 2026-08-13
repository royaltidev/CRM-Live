// Classificação de intenção de mensagens recebidas na caixa de entrada
// (Fase 9, FSD seção 13.7 passo 4).
//
// Decisão do responsável do projeto: a classificação roda por IA (DeepSeek,
// ver backend/app/integrations/ai) OU por uma lista de palavras-chave
// definida pelo próprio Administrador na tela de Configurações — alternável
// por um flag também nessa tela (automation-settings.service.js:
// ai_deepseek_enabled). Quando a IA está desativada, o DeepSeek nem chega a
// ser chamado.
//
// Em caso de falha da chamada à IA (rede, timeout, chave inválida), cai
// para a classificação por palavras-chave em vez de propagar o erro. Se as
// palavras-chave também não classificarem a mensagem (ou não estiverem
// configuradas), assume 'purchase_intent' por segurança — fail-open, pra
// nunca deixar de encaminhar um lead real por causa de uma falha técnica.

const automationSettingsService = require('./automation-settings.service');
const aiIntegration = require('../integrations/ai');

// Remove acentos (NFD + faixa Unicode de marcas diacríticas) pra comparar
// mensagem e palavras-chave sem depender de o cliente ter digitado acento.
const DIACRITICS_REGEX = /[\u0300-\u036f]/g;

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICS_REGEX, '');
}

function classifyByKeywords(messageBody, keywords) {
  const normalizedMessage = normalizeText(messageBody);
  const matchesAny = (list) => list.some((keyword) => normalizedMessage.includes(normalizeText(keyword)));

  if (matchesAny(keywords.purchaseIntent)) {
    return 'purchase_intent';
  }

  if (matchesAny(keywords.doubt)) {
    return 'doubt';
  }

  return 'none';
}

async function classifyLeadIntent({ messageBody }) {
  const aiEnabled = await automationSettingsService.getAiDeepseekEnabled();

  if (!aiEnabled) {
    const keywords = await automationSettingsService.getLeadIntentKeywords();
    return classifyByKeywords(messageBody, keywords);
  }

  try {
    return await aiIntegration.classifyLeadIntent({ messageBody });
  } catch (err) {
    console.error('Falha ao classificar intenção via DeepSeek, tentando por palavras-chave:', err.message);

    const keywords = await automationSettingsService.getLeadIntentKeywords();
    const byKeywords = classifyByKeywords(messageBody, keywords);

    if (byKeywords !== 'none') {
      return byKeywords;
    }

    return 'purchase_intent';
  }
}

module.exports = {
  classifyLeadIntent,
  classifyByKeywords,
};
