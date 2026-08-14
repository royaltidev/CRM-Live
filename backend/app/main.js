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
const syncController = require('./controllers/sync.controller');
const automationRulesController = require('./controllers/automation-rules.controller');
const winbackController = require('./controllers/winback.controller');
const templatesController = require('./controllers/templates.controller');
const couponsController = require('./controllers/coupons.controller');
const giftbackController = require('./controllers/giftback.controller');
const productsController = require('./controllers/products.controller');
const complementaryProductsController = require('./controllers/complementary-products.controller');
const campaignsController = require('./controllers/campaigns.controller');
const settingsController = require('./controllers/settings.controller');
const inboxController = require('./controllers/inbox.controller');
const inboxService = require('./services/inbox.service');
const npsController = require('./controllers/nps.controller');
const reportsController = require('./controllers/reports.controller');
const salesInsightsController = require('./controllers/sales-insights.controller');
const { requireAuth, requireAdmin } = require('./middleware/auth.middleware');
const whatsapp = require('./integrations/whatsapp');
const { startMessageQueueJob } = require('./jobs/message-queue.job');
const { startUniplusSyncJob } = require('./jobs/uniplus-sync.job');
const { startAutomationRulesJob } = require('./jobs/automation-rules.job');
const { startCampaignsJob } = require('./jobs/campaigns.job');

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
app.patch('/users/:id/whatsapp-phone', requireAuth, requireAdmin, usersController.updateWhatsappPhone);

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

// ===== Rotas de Sincronização com o Uniplus (Fase 4) =====

app.get('/sync/runs', requireAuth, syncController.listSyncRunsHandler);
app.post('/sync/run', requireAuth, syncController.triggerManualSyncHandler);

// ===== Rotas de Réguas de Relacionamento / Automações (Fase 7) =====

// IMPORTANTE: '/automation-rules/templates/active' precisa vir antes de
// '/automation-rules/:id', senão o Express interpretaria "templates" como
// um :id (mesmo cuidado já aplicado em /customers, /segments, /sellers).
app.get('/automation-rules', requireAuth, automationRulesController.listRules);
app.get('/automation-rules/templates/active', requireAuth, automationRulesController.listActiveTemplates);
app.get('/automation-rules/:id', requireAuth, automationRulesController.getRuleById);
app.post('/automation-rules', requireAuth, automationRulesController.createRule);
app.patch('/automation-rules/:id', requireAuth, automationRulesController.updateRule);
app.patch('/automation-rules/:id/toggle-active', requireAuth, automationRulesController.toggleRuleActive);

app.get('/winback/eligible', requireAuth, winbackController.listEligible);
app.post('/winback/resend', requireAuth, winbackController.resend);

// ===== Rotas de Modelos de Mensagem / Templates (Fase 8) =====

// Leitura: Admin e Acesso Limitado (FSD 8.1/8.5). Escrita: exclusiva do Admin.
// IMPORTANTE: '/templates/:id/image' precisa vir depois de '/templates/:id'
// aqui não é ambíguo (segmentos diferentes), mas mantemos a ordem lógica
// mesma cautela já aplicada em /customers, /segments, /sellers.
app.get('/templates', requireAuth, templatesController.listTemplates);
app.post('/templates', requireAuth, requireAdmin, templatesController.createTemplate);
app.get('/templates/:id', requireAuth, templatesController.getTemplateById);
app.patch('/templates/:id', requireAuth, requireAdmin, templatesController.updateTemplate);
app.patch('/templates/:id/toggle-active', requireAuth, requireAdmin, templatesController.toggleActive);
app.delete('/templates/:id', requireAuth, requireAdmin, templatesController.deleteTemplate);
app.post(
  '/templates/:id/image',
  requireAuth,
  requireAdmin,
  templatesController.uploadImageMiddleware,
  templatesController.uploadTemplateImage
);
app.get('/templates/:id/image', requireAuth, templatesController.downloadTemplateImage);

// ===== Rotas de Cupons (Fase 8) =====

// Leitura: Admin e Acesso Limitado (FSD 8.5). Escrita: exclusiva do Admin.
app.get('/coupons', requireAuth, couponsController.listCoupons);
app.post('/coupons', requireAuth, requireAdmin, couponsController.createCoupon);
app.get('/coupons/:id', requireAuth, couponsController.getCouponById);
app.patch('/coupons/:id', requireAuth, requireAdmin, couponsController.updateCoupon);
app.delete('/coupons/:id', requireAuth, requireAdmin, couponsController.deleteCoupon);

// ===== Rotas de Giftback/Cashback (Fase 8) =====

// Leitura: Admin e Acesso Limitado (FSD 8.5). Escrita: exclusiva do Admin.
app.get('/giftbacks', requireAuth, giftbackController.listGiftbacks);
app.post('/giftbacks', requireAuth, requireAdmin, giftbackController.createGiftback);
app.get('/giftbacks/:id', requireAuth, giftbackController.getGiftbackById);
app.patch('/giftbacks/:id', requireAuth, requireAdmin, giftbackController.updateGiftback);
app.delete('/giftbacks/:id', requireAuth, requireAdmin, giftbackController.deleteGiftback);

app.get('/products', requireAuth, productsController.listProducts);
app.get('/products/categories', requireAuth, productsController.listCategories);

// Cross-sell (produtos complementares), FSD 6.4/12.9 — leitura E escrita
// liberadas a Admin e Acesso Limitado (diferente de Cupons/Giftback acima).
app.get('/complementary-products/settings/discount-percent', requireAuth, complementaryProductsController.getDiscountPercent);
app.patch('/complementary-products/settings/discount-percent', requireAuth, complementaryProductsController.setDiscountPercent);
app.get('/complementary-products', requireAuth, complementaryProductsController.listComplementaryProducts);
app.post('/complementary-products', requireAuth, complementaryProductsController.createComplementaryProduct);
app.post('/complementary-products/detect-patterns', requireAuth, complementaryProductsController.detectPatterns);
app.patch('/complementary-products/:id/toggle-active', requireAuth, complementaryProductsController.toggleActive);
app.delete('/complementary-products/:id', requireAuth, complementaryProductsController.deleteComplementaryProduct);

// Venda Inteligente — Parte 2 (jornadas de compra e itens sem venda, ver
// sales-insights.service.js) — leitura liberada a Admin e Acesso Limitado,
// mesmo padrão do resto da iniciativa.
app.get('/sales-insights/journeys', requireAuth, salesInsightsController.getJourneys);
app.get('/sales-insights/slow-movers', requireAuth, salesInsightsController.getSlowMovers);

// Campanhas manuais (FSD 6.4/12.6) — leitura E escrita liberadas a Admin e
// Acesso Limitado (FSD linha 332 da matriz de permissões).
app.post('/campaigns/preview-recipients', requireAuth, campaignsController.previewRecipients);
app.get('/campaigns', requireAuth, campaignsController.listCampaigns);
app.post('/campaigns', requireAuth, campaignsController.createCampaign);
app.get('/campaigns/:id', requireAuth, campaignsController.getCampaignById);
app.patch('/campaigns/:id', requireAuth, campaignsController.updateCampaign);
app.delete('/campaigns/:id', requireAuth, campaignsController.deleteCampaign);
app.post('/campaigns/:id/cancel', requireAuth, campaignsController.cancelCampaign);
app.post('/campaigns/:id/send', requireAuth, campaignsController.sendCampaignNow);

// ===== Rotas de Caixa de Entrada (FSD 12.10, 13.7 — exclusivas do Admin) =====

app.get('/inbox/conversations', requireAuth, requireAdmin, inboxController.listConversations);
app.get('/inbox/conversations/:id', requireAuth, requireAdmin, inboxController.getConversationById);
app.post('/inbox/conversations/:id/reply', requireAuth, requireAdmin, inboxController.sendManualReply);

// ===== Rotas de Gestão de NPS (FSD 12.12/22.6 — leitura liberada a Admin e
// Acesso Limitado; ações sobre a nota ficam para a Parte 3, exclusivas do
// Administrador) =====

app.get('/nps/responses', requireAuth, npsController.listResponses);
app.get('/nps/responses/export', requireAuth, npsController.exportResponses);
app.post('/nps/responses/:id/treatments', requireAuth, requireAdmin, npsController.createTreatment);
app.get('/nps/responses/:id/treatments', requireAuth, requireAdmin, npsController.listTreatments);

// ===== Rotas de Relatórios/Dashboards (FSD 6.7/22 — leitura liberada a
// Admin e Acesso Limitado) =====

app.get('/reports/dashboard', requireAuth, reportsController.getDashboard);
app.get('/reports/dashboard/export', requireAuth, reportsController.exportDashboard);

// ===== Rotas de Configurações (FSD 12.13 — exclusivas do Admin) =====

app.get(
  '/settings/lead-intent-classification',
  requireAuth,
  requireAdmin,
  settingsController.getLeadIntentClassificationSettings
);
app.put(
  '/settings/lead-intent-classification',
  requireAuth,
  requireAdmin,
  settingsController.updateLeadIntentClassificationSettings
);
app.get('/settings/smart-sales-ai', requireAuth, requireAdmin, settingsController.getSmartSalesAiSettings);
app.put('/settings/smart-sales-ai', requireAuth, requireAdmin, settingsController.updateSmartSalesAiSettings);

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
  //
  // Caixa de entrada (Fase 9, FSD 13.7): toda mensagem recebida (exceto de
  // grupo e as enviadas pela própria loja — já filtradas no provider) passa
  // por processInboundMessage. Registrado ANTES de initialize() para nunca
  // perder um evento, e com .catch() próprio porque o try/catch do provider
  // só cobre erro síncrono, não a Promise retornada pelo callback.
  whatsapp.onMessageReceived(({ from, body }) => {
    inboxService.processInboundMessage({ from, body }).catch((err) => {
      console.error('[inbox] Erro ao processar mensagem recebida:', err.message);
    });
  });

  whatsapp.initialize();

  // Inicia o processamento periódico da fila de envio de mensagens
  // (a cada 60s). Fica "pausado" (sem processar nada) até o Administrador
  // configurar a cadência de disparo em system_settings (chave message_cadence).
  startMessageQueueJob();

  // Inicia a sincronização periódica com o Uniplus (a cada
  // settings.uniplus.syncIntervalMinutes). Não bloqueia o boot do servidor
  // nem derruba o processo em caso de falha — ver
  // backend/app/jobs/uniplus-sync.job.js e backend/app/services/sync.service.js.
  startUniplusSyncJob();

  // Inicia o motor de réguas de relacionamento (aniversário, reativação,
  // ciclo de recompra, pesquisa de satisfação — a cada 5 min). Réguas
  // orientadas a evento (venda nova, incentivo ao cadastro) são acionadas
  // diretamente pela sincronização, via automation-trigger.service.js.
  startAutomationRulesJob();

  // Inicia o disparo periódico de campanhas agendadas cuja hora já chegou
  // (a cada 60s) — campaigns.service.js#dispatchDueCampaigns.
  startCampaignsJob();
});
