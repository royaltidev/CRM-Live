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
  // Usado só como valor INICIAL do pool, no boot: a partir do primeiro uso
  // da tela de Configurações ("Trocar Servidor", 14/08/2026), a conexão
  // real fica em `system_settings` (chave uniplus_connection) e pode ser
  // trocada em tempo real pelo Administrador, sem editar este arquivo nem
  // reiniciar o backend — ver uniplus-connection-settings.service.js.
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

  // Integração com IA para classificação de intenção de lead na caixa de
  // entrada (Fase 9 — ver backend/app/integrations/ai). A chave de API é um
  // segredo de implantação (fica aqui, nunca versionada); já o LIGA/DESLIGA
  // dessa classificação por IA (e as palavras-chave usadas quando desligada)
  // é parâmetro de negócio, editado pelo Administrador na tela de
  // Configurações — não fica neste arquivo (ver system_settings, chaves
  // ai_deepseek_enabled e lead_intent_keywords).
  ai: {
    provider: 'deepseek',
    deepseek: {
      apiKey: 'CHANGE_ME',
      model: 'deepseek-chat',
    },
  },

  // Parâmetros TÉCNICOS da sincronização com o Uniplus (Fase 4) — não são
  // configuração de negócio (essas ficam em system_settings, ver FSD seção 20).
  // Ver docs/uniplus-schema/05-mapeamento-sincronizacao.md, § "Parâmetros técnicos".
  uniplus: {
    // Id da filial única desta loja no Uniplus (usado em saldoestoque.idfilial).
    // Precisa ser o id NUMÉRICO real da filial, confirmado no ambiente de
    // produção — a sincronização de estoque falha com mensagem explícita
    // enquanto este valor não for preenchido.
    filialId: 'CHANGE_ME_uniplus_filial_id',
    // Intervalo entre execuções automáticas do job de sincronização.
    syncIntervalMinutes: 15,
  },
};
