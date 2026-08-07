// Controller de autenticação.
// Rotas: POST /auth/google/callback, GET /auth/logout.

const authService = require('../services/auth.service');

// POST /auth/google/callback
// Frontend envia o token ID do Google; backend valida e cria sessão.
async function handleGoogleCallback(req, res) {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'Token Google não fornecido.' });
    }

    // Valida token do Google.
    const googleData = await authService.verifyGoogleToken(idToken);

    // Obtém ou cria usuário.
    const user = await authService.findOrCreateUser(googleData);

    // Verifica se o usuário está ativo.
    if (!user.active) {
      // Log de segurança: tentativa de login com conta desativada.
      await authService.logSecurityEvent('login_failed', null, null, req.ip, {
        reason: 'user_deactivated',
        email: googleData.email,
      });

      return res.status(403).json({ error: 'Sua conta foi desativada. Entre em contato com o administrador.' });
    }

    // Gera token de sessão.
    const sessionToken = authService.generateSessionToken(user.id, user.role);

    // Define cookie de sessão.
    res.cookie('sessionToken', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS apenas em produção
      sameSite: 'Strict',
      maxAge: 12 * 60 * 60 * 1000, // 12 horas em ms
    });

    // Log de segurança: login bem-sucedido.
    await authService.logSecurityEvent('login_success', user.id, null, req.ip, {
      email: googleData.email,
      role: user.role,
      first_login: user.created_at === user.last_login_at, // Detecta primeiro acesso
    });

    // Retorna dados do usuário (sem dados sensíveis).
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Erro ao validar token Google:', err.message);

    // Log de segurança: falha de autenticação.
    await authService.logSecurityEvent('login_failed', null, null, req.ip, {
      reason: 'google_validation_failed',
      error: err.message,
    });

    return res.status(401).json({ error: 'Falha ao autenticar. Tente novamente.' });
  }
}

// GET /auth/logout
// Encerra a sessão (remove o cookie).
function logout(req, res) {
  // Log de segurança: logout (opcional, mas útil para auditoria).
  if (req.user) {
    authService.logSecurityEvent('logout', req.user.id, null, req.ip);
  }

  // Remove o cookie de sessão.
  res.clearCookie('sessionToken');

  res.json({ success: true, message: 'Sessão encerrada com sucesso.' });
}

// GET /auth/me
// Retorna os dados do usuário autenticado (requer auth middleware).
function getCurrentUser(req, res) {
  // Nota: req.user é preenchido pelo middleware requireAuth.
  // Nesta versão simples, apenas confirmamos que estamos autenticado.
  // Uma versão completa buscaria os dados completos do banco.
  res.json({
    id: req.user.id,
    role: req.user.role,
  });
}

module.exports = {
  handleGoogleCallback,
  logout,
  getCurrentUser,
};
