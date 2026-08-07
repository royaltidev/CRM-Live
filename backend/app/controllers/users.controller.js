// Controller de gestão de usuários.
// Rotas exclusivas do Administrador: GET /users, PATCH /users/:id/deactivate.

const authService = require('../services/auth.service');

// GET /users
// Lista todos os usuários do CRM Live (exclusivo do Admin).
async function listUsers(req, res) {
  try {
    const users = await authService.listUsers();

    res.json({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        active: u.active,
        createdAt: u.created_at,
        lastLoginAt: u.last_login_at,
      })),
    });
  } catch (err) {
    console.error('Erro ao listar usuários:', err.message);
    res.status(500).json({ error: 'Erro ao carregar lista de usuários.' });
  }
}

// PATCH /users/:id/deactivate
// Desativa um usuário (exclusivo do Admin).
// Não é possível desativar a si mesmo.
async function deactivateUser(req, res) {
  try {
    const { id: userIdToDeactivate } = req.params;
    const adminId = req.user.id;

    // Verifica se está tentando desativar a si mesmo.
    if (parseInt(userIdToDeactivate, 10) === adminId) {
      return res.status(400).json({
        error: 'Você não pode desativar sua própria conta. Contate outro administrador.',
      });
    }

    // Desativa o usuário.
    const deactivatedUser = await authService.deactivateUser(userIdToDeactivate);

    // Log de segurança: alteração de permissão de usuário.
    await authService.logSecurityEvent('user_access_changed', adminId, null, req.ip, {
      action: 'user_deactivated',
      target_user_id: userIdToDeactivate,
      target_user_email: deactivatedUser.email,
      target_user_role: deactivatedUser.role,
    });

    res.json({
      success: true,
      message: `Usuário ${deactivatedUser.email} foi desativado com sucesso.`,
      user: {
        id: deactivatedUser.id,
        email: deactivatedUser.email,
        role: deactivatedUser.role,
      },
    });
  } catch (err) {
    console.error('Erro ao desativar usuário:', err.message);

    if (err.message === 'Usuário não encontrado') {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    res.status(500).json({ error: 'Erro ao desativar usuário.' });
  }
}

module.exports = {
  listUsers,
  deactivateUser,
};
