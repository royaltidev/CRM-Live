// Camada de abstração de mensageria (FSD seção 9.11).
//
// CRÍTICO: nenhum outro módulo do projeto (réguas de automação, campanhas,
// fila de envio, atendimento) pode importar a biblioteca `whatsapp-web.js`
// (ou qualquer outra lib de mensageria) diretamente. Tudo deve passar por
// este módulo, que expõe uma interface genérica e independente de provedor.
//
// A troca de provedor (ex.: migrar para a API oficial do WhatsApp Cloud API
// no futuro) deve ser possível apenas alterando `settings.whatsapp.provider`
// e adicionando um novo arquivo em `./providers/`, sem alterar nenhum
// consumidor desta interface.
//
// Interface exportada (independente do provedor escolhido):
//   - async function initialize()
//   - async function sendText({ to, body })
//   - async function sendImage({ to, imageUrl, caption })
//   - function getConnectionStatus() -> { connected: boolean, lastEventAt: Date|null }
//   - function onSessionDown(callback)

const settings = require('../../config/settings');

// Mapeamento provider -> módulo implementação. Para adicionar um novo
// provedor (ex.: 'cloud_api'), crie `./providers/cloud-api-provider.js`
// implementando a mesma interface e adicione uma entrada aqui.
const PROVIDERS = {
  whatsapp_web: () => require('./providers/whatsapp-web-provider'),
};

function loadProvider() {
  const providerName = settings.whatsapp && settings.whatsapp.provider;
  const providerFactory = PROVIDERS[providerName];

  if (!providerFactory) {
    throw new Error(
      `Provedor de WhatsApp "${providerName}" não é suportado. ` +
        `Provedores disponíveis: ${Object.keys(PROVIDERS).join(', ')}.`
    );
  }

  return providerFactory();
}

const provider = loadProvider();

module.exports = {
  initialize: provider.initialize,
  sendText: provider.sendText,
  sendImage: provider.sendImage,
  getConnectionStatus: provider.getConnectionStatus,
  onSessionDown: provider.onSessionDown,
};
