// Camada de abstração de IA (FSD seção 13.7, passo 4 — detecção de
// intenção de compra/dúvida na resposta de um cliente na caixa de
// entrada).
//
// Mesmo princípio arquitetural da camada de mensageria
// (backend/app/integrations/whatsapp): nenhum outro módulo do projeto pode
// importar o SDK/provedor de IA diretamente. Tudo passa por este módulo,
// para trocar de provedor no futuro sem alterar nenhum consumidor.
//
// Decisão (confirmada com o responsável do projeto): o FSD não define
// nenhum critério objetivo pra "demonstra intenção de compra ou dúvida"
// (sem lista de palavras-chave, sem heurística) — usar uma IA pra
// classificar a mensagem recebida, em vez de inventar uma lista de
// palavras-chave arbitrária. Provedor escolhido: DeepSeek.
//
// Interface exportada (independente do provedor escolhido):
//   - async function classifyLeadIntent({ messageBody }) ->
//       Promise<'purchase_intent' | 'doubt' | 'none'>

const settings = require('../../config/settings');

const PROVIDERS = {
  deepseek: () => require('./providers/deepseek-provider'),
};

function loadProvider() {
  const providerName = settings.ai && settings.ai.provider;
  const providerFactory = PROVIDERS[providerName];

  if (!providerFactory) {
    throw new Error(
      `Provedor de IA "${providerName}" não é suportado. ` +
        `Provedores disponíveis: ${Object.keys(PROVIDERS).join(', ')}.`
    );
  }

  return providerFactory();
}

const provider = loadProvider();

module.exports = {
  classifyLeadIntent: provider.classifyLeadIntent,
};
