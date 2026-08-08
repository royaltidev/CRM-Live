// Implementação da camada de abstração de mensageria (ver ../index.js) usando
// a biblioteca `whatsapp-web.js` (decisão registrada no FSD/PLANO da Fase 6 —
// escolhida em vez de Baileys por estabilidade de conexão em projetos anteriores).
//
// IMPORTANTE: este é o ÚNICO arquivo do projeto que pode importar
// `whatsapp-web.js` diretamente. Nenhum outro módulo (fila de envio,
// automações, campanhas, controllers) deve fazer esse require — todos devem
// usar `backend/app/integrations/whatsapp/index.js`.
//
// LIMITAÇÃO OPERACIONAL (documentada para o pareamento inicial):
// Esta fase não implementa nenhuma tela no frontend para exibir o QR Code de
// pareamento. Na primeira inicialização (ou sempre que a sessão local for
// invalidada), o QR Code é impresso diretamente no console/terminal do
// processo Node (via `qrcode-terminal`) e precisa ser escaneado manualmente
// no WhatsApp do celular vinculado à loja, a partir do PC onde o backend
// está rodando. Depois do primeiro pareamento, a sessão fica persistida em
// `settings.whatsapp.sessionStoragePath` (LocalAuth) e sobrevive a reinícios
// do processo, então isso só deve ser necessário uma vez (ou quando a sessão
// expirar/for desconectada manualmente do celular).

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const settings = require('../../../config/settings');
const { logSecurityEvent } = require('../../../services/auth.service');

let client = null;
let initialized = false;
let initializing = null;

// Estado interno de conexão, atualizado pelos eventos da biblioteca.
const connectionState = {
  connected: false,
  lastEventAt: null,
};

// Callbacks registrados via onSessionDown(), chamados quando a sessão cair.
const sessionDownCallbacks = [];

function updateConnectionState(connected) {
  connectionState.connected = connected;
  connectionState.lastEventAt = new Date();
}

function createClient() {
  return new Client({
    authStrategy: new LocalAuth({
      dataPath: settings.whatsapp.sessionStoragePath,
    }),
    puppeteer: {
      // Necessário em muitos ambientes de servidor/containers sem sandbox
      // gráfico completo. Ver documentação de whatsapp-web.js/Puppeteer.
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  });
}

// Inicializa o cliente do WhatsApp Web. Não derruba o processo em caso de
// falha — apenas loga o erro, mantendo `connectionState.connected = false`.
async function initialize() {
  if (initialized) {
    return;
  }

  if (initializing) {
    return initializing;
  }

  initializing = (async () => {
    try {
      client = createClient();

      client.on('qr', (qr) => {
        console.log('[whatsapp] QR Code recebido. Escaneie no WhatsApp do celular da loja:');
        qrcodeTerminal.generate(qr, { small: true });
      });

      client.on('ready', () => {
        console.log('[whatsapp] Sessão conectada e pronta.');
        updateConnectionState(true);
      });

      client.on('authenticated', () => {
        console.log('[whatsapp] Autenticado com sucesso.');
      });

      client.on('auth_failure', (message) => {
        console.error('[whatsapp] Falha de autenticação:', message);
        updateConnectionState(false);
      });

      client.on('disconnected', (reason) => {
        console.error('[whatsapp] Sessão desconectada:', reason);
        updateConnectionState(false);

        // Notifica callbacks registrados (ex.: alertas na UI, jobs, etc.).
        sessionDownCallbacks.forEach((callback) => {
          try {
            callback({ reason });
          } catch (callbackErr) {
            console.error('[whatsapp] Erro em callback de onSessionDown:', callbackErr.message);
          }
        });

        // Registra evento de segurança (FSD): sessão do WhatsApp caída.
        logSecurityEvent('whatsapp_session_down', null, null, null, { reason });
      });

      await client.initialize();
      initialized = true;
    } catch (err) {
      // Erro de inicialização não deve derrubar o processo Node inteiro.
      console.error('[whatsapp] Erro ao inicializar o cliente do WhatsApp Web:', err.message);
      updateConnectionState(false);
    }
  })();

  return initializing;
}

// Envia uma mensagem de texto. `to` deve ser um telefone em formato E.164
// (ex.: +5511999999999) — a conversão para o formato esperado pela lib
// (<numero>@c.us) é feita aqui, internamente ao provider.
async function sendText({ to, body }) {
  if (!client || !initialized) {
    throw new Error('Cliente do WhatsApp Web não está inicializado.');
  }

  const chatId = formatChatId(to);
  const result = await client.sendMessage(chatId, body);

  return {
    externalMessageId: result && result.id ? result.id._serialized : null,
  };
}

// Envia uma imagem com legenda opcional. `imageUrl` deve ser uma URL
// publicamente acessível ou um caminho de arquivo local suportado pela lib.
async function sendImage({ to, imageUrl, caption }) {
  if (!client || !initialized) {
    throw new Error('Cliente do WhatsApp Web não está inicializado.');
  }

  const { MessageMedia } = require('whatsapp-web.js');
  const chatId = formatChatId(to);
  const media = await MessageMedia.fromUrl(imageUrl);
  const result = await client.sendMessage(chatId, media, { caption });

  return {
    externalMessageId: result && result.id ? result.id._serialized : null,
  };
}

function formatChatId(phoneE164) {
  // Remove o "+" inicial e qualquer caractere não numérico, conforme
  // esperado pelo formato "<numero>@c.us" da biblioteca.
  const digitsOnly = String(phoneE164).replace(/\D/g, '');
  return `${digitsOnly}@c.us`;
}

// Retorna o estado de conexão atual, de forma síncrona.
function getConnectionStatus() {
  return {
    connected: connectionState.connected,
    lastEventAt: connectionState.lastEventAt,
  };
}

// Registra um callback a ser chamado quando a sessão cair (evento
// "disconnected" da biblioteca).
function onSessionDown(callback) {
  if (typeof callback === 'function') {
    sessionDownCallbacks.push(callback);
  }
}

module.exports = {
  initialize,
  sendText,
  sendImage,
  getConnectionStatus,
  onSessionDown,
};
