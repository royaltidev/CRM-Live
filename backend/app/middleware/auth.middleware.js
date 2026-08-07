// Middleware de autenticação e controle de sessão.
// Valida o token JWT, implementa sliding expiration e protege rotas.

const authService = require('../services/auth.service');

// Middleware: verifica se o usuário tem uma sessão válida.
// Se válida e próxima de expirar (< 1h de tempo restante), renova o token (sliding expiration).
function requireAuth(req, res, next) {
  try {
    const token = req.cookies.sessionToken;

    if (!token) {
      return res.status(401).json({ error: 'Sessão não encontrada. Faça login para continuar.' });
    }

    // Valida o token.
    const payload = authService.verifySessionToken(token);

    // Calcula tempo restante do token.
    const now = Math.floor(Date.now() / 1000);
    const secondsRemaining = payload.exp - now;
    const hoursRemaining = secondsRemaining / 3600;

    // Se < 1h de tempo restante, renova o token (sliding expiration).
    if (hoursRemaining < 1) {
      const newToken = authService.generateSessionToken(payload.userId, payload.role);
      res.cookie('sessionToken', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        maxAge: 12 * 60 * 60 * 1000, // 12 horas em ms
      });
    }

    // Armazena dados do usuário no req para uso em controllers/services.
    req.user = {
      id: payload.userId,
      role: payload.role,
    };

    next();
  } catch (err) {
    // Log de segurança: tentativa de acesso com token inválido.
    const ipAddress = req.ip || req.connection.remoteAddress;
    authService.logSecurityEvent('permission_denied', null, null, ipAddress, {
      reason: 'token_invalid',
      error: err.message,
    });

    return res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' });
  }
}

// Middleware: verifica se o usuário tem um papel específico.
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Sessão não encontrada.' });
    }

    if (req.user.role !== role) {
      // Log de segurança: tentativa de ação sem permissão.
      const ipAddress = req.ip || req.connection.remoteAddress;
      authService.logSecurityEvent('permission_denied', req.user.id, null, ipAddress, {
        reason: 'insufficient_role',
        required_role: role,
        user_role: req.user.role,
      });

      return res.status(403).json({ error: 'Você não tem permissão para executar esta ação.' });
    }

    next();
  };
}

// Middleware: verifica se o usuário é Administrador.
const requireAdmin = requireRole('admin');

module.exports = {
  requireAuth,
  requireRole,
  requireAdmin,
};
