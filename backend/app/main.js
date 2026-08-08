// Ponto de entrada da API do backend do CRM Live.
//
// Implementações:
// - Fase 1: Infraestrutura básica (health-check).
// - Fase 2: Banco de dados e persistência.
// - Fase 3: Autenticação, sessão, RBAC e gestão de usuários.
// - Fase 5: Cadastro/visão 360º do cliente, segmentação (RFM + dinâmica), vendedores.
// - Fase 6: Consentimento (LGPD), camada de mensageria (whatsapp-web.js) e fila de envio.

const express = require('express');
const cookieParser = require('cookie-parser');
const settings = require('./config/settings');
const authController = require('./controllers/auth.controller');
const usersController = require('./controllers/users.controller');
const customersController = require('./controllers/customers.controller');
const tagsController = require('./controllers/tags.controller');
const segmentsController = require('./controllers/segments.controller');
const sellersController = require('./controllers/sellers.controller');
const consentController = require('./controllers/consent.controller');
const messagesController = require('./controllers/messages.controller');
const { requireAuth, requireAdmin } = require('./middleware/auth.middleware');
const whatsapp = require('./integrations/whatsapp');
const { startMessageQueueJob } = require('./jobs/message-queue.job');

const app = express();

// Middleware global.
app.use(express.json());
app.use(cookieParser());

// ===== Rotas Públicas (sem autenticação) =====

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'crm-live-backend' });
});

// Autenticação: callback do Google.
app.post('/auth/google/callback', authController.handleGoogleCallback);

// ===== Rotas Protegidas (exigem autenticação) =====

// Logout.
app.get('/auth/logout', requireAuth, authController.logout);

// Dados do usuário autenticado.
app.get('/auth/me', requireAuth, authController.getCurrentUser);

// ===== Rotas de Gestão de Usuários (exclusivas do Admin) =====

// Listar todos os usuários.
app.get('/users', requireAuth, requireAdmin, usersController.listUsers);

// Desativar um usuário.
app.patch('/users/:id/deactivate', requireAuth, requireAdmin, usersController.deactivateUser);

// ===== Rotas de Clientes e Tags (Fase 5 — Admin e Acesso Limitado) =====

// IMPORTANTE: rota de relatório precisa vir antes de '/customers/:id',
// senão o Express interpretaria "reports" como um :id.
app.get('/customers/reports/sales-without-customer', requireAuth, customersController.getSalesWithoutCustomer);
app.get('/customers', requireAuth, customersController.listCustomers);
app.get('/customers/:id', requireAuth, customersController.getCustomerById);
app.get('/customers/:id/timeline', requireAuth, customersController.getCustomerTimeline);
app.patch('/customers/:id', requireAuth, customersController.updateCustomerComplementaryFields);
app.post('/customers/:id/tags', requireAuth, customersController.addTagToCustomer);
app.delete('/customers/:id/tags/:tagId', requireAuth, customersController.removeTagFromCustomer);

app.get('/tags', requireAuth, tagsController.listTags);
app.post('/tags', requireAuth, tagsController.createTag);
app.patch('/tags/:id', requireAuth, tagsController.updateTag);
app.delete('/tags/:id', requireAuth, tagsController.deleteTag);

// ===== Rotas de Segmentação — RFM e Segmentos Dinâmicos (Fase 5) =====

// IMPORTANTE: sub-rotas de /segments/rfm/* e /segments/preview precisam vir
// antes de '/segments/:id', senão o Express interpretaria "rfm"/"preview" como um :id.
app.get('/segments/rfm/criteria', requireAuth, segmentsController.getRfmCriteria);
app.put('/segments/rfm/criteria', requireAuth, requireAdmin, segmentsController.setRfmCriteria);
app.post('/segments/rfm/recalculate', requireAuth, segmentsController.recalculateRfm);
app.post('/segments/preview', requireAuth, segmentsController.previewSegmentCustomers);

app.get('/segments', requireAuth, segmentsController.listSegments);
app.post('/segments', requireAuth, segmentsController.createSegment);
app.get('/segments/:id', requireAuth, segmentsController.getSegmentById);
app.patch('/segments/:id', requireAuth, segmentsController.updateSegment);
app.delete('/segments/:id', requireAuth, segmentsController.deleteSegment);

// ===== Rotas de Vendedores e Fila de Rodízio (Fase 5) =====

// IMPORTANTE: '/sellers/rotation/next' precisa vir antes de '/sellers/:id',
// senão o Express interpretaria "rotation" como um :id.
app.get('/sellers/rotation/next', requireAuth, sellersController.getNextInRotation);
app.get('/sellers', requireAuth, sellersController.listSellers);
app.post('/sellers', requireAuth, sellersController.createSeller);
app.get('/sellers/:id', requireAuth, sellersController.getSellerById);
app.patch('/sellers/:id', requireAuth, sellersController.updateSeller);
app.patch('/sellers/:id/toggle-active', requireAuth, sellersController.toggleSellerActive);

// ===== Rotas de Consentimento e LGPD (Fase 6) =====

app.get('/consent/report', requireAuth, consentController.getConsentReportHandler);

// ===== Rotas de Mensagens / Log de Disparos (Fase 6) =====

app.get('/messages', requireAuth, messagesController.listMessages);

// ===== Tratamento de Erros Genérico =====

app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err.message);
  res.status(500).json({
    error: 'Ocorreu um erro no servidor. Tente novamente mais tarde.',
  });
});

// ===== Inicializar servidor =====

app.listen(settings.port, () => {
  console.log(`✓ CRM Live backend rodando na porta ${settings.port}`);
  console.log(`  Health check: GET http://localhost:${settings.port}/health`);
  console.log(`  Callback OAuth: POST http://localhost:${settings.port}/auth/google/callback`);

  // Inicializa a camada de mensageria (whatsapp-web.js). Não bloqueia o boot
  // do servidor: erros de inicialização (ex.: Chromium indisponível no
  // ambiente) são tratados internamente pelo provider e apenas logados —
  // ver backend/app/integrations/whatsapp/providers/whatsapp-web-provider.js.
  // No primeiro pareamento (ou se a sessão local for invalidada), o QR Code
  // é impresso neste console e precisa ser escaneado manualmente.
  whatsapp.initialize();

  // Inicia o processamento periódico da fila de envio de mensagens
  // (a cada 60s). Fica "pausado" (sem processar nada) até o Administrador
  // configurar a cadência de disparo em system_settings (chave message_cadence).
  startMessageQueueJob();
});
