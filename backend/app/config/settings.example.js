// Exemplo de arquivo de configuração do backend do CRM Live.
//
// Copie este arquivo para "settings.js" (mesma pasta) e preencha com os valores
// reais de cada ambiente (desenvolvimento ou produção). O arquivo "settings.js"
// NUNCA deve ser versionado no Git (veja .gitignore na raiz do projeto) — apenas
// este exemplo, sem segredos reais, é versionado.
//
// Regras completas sobre este arquivo: docs/FSD.md, seção 5.5.
// Este módulo deve ser carregado apenas por importação interna do código
// (require('./config/settings')), nunca por uma rota HTTP.

module.exports = {
  // Porta em que a API do backend deve escutar.
  port: 3000,

  // Conexão com o banco de dados próprio do CRM Live (leitura e escrita).
  // Implementação da conexão prevista para a Fase 2 (ver docs/PLANO.md).
  crmDatabase: {
    host: 'db',
    port: 5432,
    database: 'crm_live',
    user: 'crm_live_app',
    password: 'CHANGE_ME',
  },

  // Conexão SOMENTE LEITURA com o banco de dados do Uniplus.
  // O CRM Live nunca escreve nesta conexão, em nenhuma hipótese (docs/FSD.md, seção 1).
  uniplusDatabase: {
    host: 'CHANGE_ME',
    port: 5432,
    database: 'CHANGE_ME',
    user: 'CHANGE_ME_readonly',
    password: 'CHANGE_ME',
    readOnly: true,
  },

  // Sessão / autenticação (Fase 3).
  session: {
    // Chave usada para assinar o token de sessão (JWT).
    // Gere um valor aleatório forte em cada ambiente:
    //   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    // NUNCA reutilize entre desenvolvimento e produção.
    secret: 'CHANGE_ME_WITH_A_STRONG_RANDOM_VALUE',
    // Duração da sessão (sliding expiration), em horas (ver FSD seção 15).
    expirationHours: 12,
  },

  // Autenticação via Google OAuth 2.0 (Fase 3).
  // Obtenha credenciais em: https://console.cloud.google.com/
  // Em desenvolvimento, use localhost:3000; em produção, use o domínio real.
  googleOAuth: {
    clientId: 'YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com',
    clientSecret: 'YOUR_GOOGLE_CLIENT_SECRET_HERE',
    // URL para retorno do Google após autenticação (callback).
    // DEVE corresponder ao redirecionamento autorizado no Google Cloud Console.
    callbackUrl: 'http://localhost:3000/auth/google/callback',
    // Audience do token ID (frontend)
    frontendClientId: 'YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com',
  },

  // Caminhos internos de armazenamento — sempre fora de rota pública (docs/FSD.md, seção 5.4).
  storage: {
    attachmentsPath: './app/storage/attachments',
    logsPath: './app/storage/logs',
  },

  // Integração com WhatsApp Web (provedor específico a definir na Fase 6 — ver docs/PLANO.md).
  whatsapp: {
    provider: 'whatsapp_web', // valor futuro possível: 'cloud_api' (API oficial)
    sessionStoragePath: './app/storage/whatsapp-session',
  },
};
