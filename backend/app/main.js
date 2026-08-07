// Ponto de entrada da API do backend do CRM Live.
//
// Implementações:
// - Fase 1: Infraestrutura básica (health-check).
// - Fase 2: Banco de dados e persistência.
// - Fase 3: Autenticação, sessão, RBAC e gestão de usuários.

const express = require('express');
const cookieParser = require('cookie-parser');
const settings = require('./config/settings');
const authController = require('./controllers/auth.controller');
const usersController = require('./controllers/users.controller');
const { requireAuth, requireAdmin } = require('./middleware/auth.middleware');

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
});
