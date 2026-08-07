// Serviço de autenticação do CRM Live.
// Responsável por validar tokens Google, criar/atualizar usuários, gerar sessões.

const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const { crmPool } = require('../database/connection');
const settings = require('../config/settings');

const googleClient = new OAuth2Client(settings.googleOAuth.clientId);

// Valida token ID do Google e retorna dados do usuário.
async function verifyGoogleToken(token) {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: settings.googleOAuth.frontendClientId,
    });

    const payload = ticket.getPayload();
    return {
      googleSubject: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };
  } catch (err) {
    throw new Error(`Falha ao validar token Google: ${err.message}`);
  }
}

// Obtém ou cria um usuário baseado em dados do Google.
// Primeira conta criada vira admin; demais ficam limited.
async function findOrCreateUser(googleData) {
  const client = await crmPool.connect();

  try {
    await client.query('BEGIN');

    // Tenta localizar usuário existente.
    const existing = await client.query(
      'SELECT id, role, active FROM users WHERE google_subject = $1',
      [googleData.googleSubject]
    );

    if (existing.rows.length > 0) {
      // Usuário já existe — apenas atualiza last_login_at.
      const result = await client.query(
        `UPDATE users
         SET last_login_at = NOW()
         WHERE google_subject = $1
         RETURNING id, email, name, role, active, created_at`,
        [googleData.googleSubject]
      );

      await client.query('COMMIT');
      return result.rows[0];
    }

    // Verifica se já existe algum usuário (para decidir o papel).
    const countResult = await client.query('SELECT COUNT(*) FROM users');
    const isFirstUser = parseInt(countResult.rows[0].count, 10) === 0;

    // Cria novo usuário com papel baseado em ordem de criação.
    const role = isFirstUser ? 'admin' : 'limited';
    const result = await client.query(
      `INSERT INTO users (google_subject, email, name, avatar_url, role, created_at, last_login_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, email, name, role, active, created_at`,
      [googleData.googleSubject, googleData.email, googleData.name, googleData.picture, role]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Gera token JWT para sessão.
function generateSessionToken(userId, role) {
  const expirationHours = settings.session.expirationHours;
  const expiresIn = `${expirationHours}h`;

  return jwt.sign(
    {
      userId,
      role,
      iat: Math.floor(Date.now() / 1000),
    },
    settings.session.secret,
    { expiresIn }
  );
}

// Valida token JWT e retorna payload.
function verifySessionToken(token) {
  try {
    return jwt.verify(token, settings.session.secret);
  } catch (err) {
    throw new Error(`Token inválido ou expirado: ${err.message}`);
  }
}

// Registra evento de segurança.
async function logSecurityEvent(eventType, userId = null, customerId = null, ipAddress = null, details = null) {
  try {
    await crmPool.query(
      `INSERT INTO security_events (event_type, user_id, customer_id, ip_address, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [eventType, userId, customerId, ipAddress, details ? JSON.stringify(details) : null]
    );
  } catch (err) {
    // Log de segurança não deve falhar — apenas loga o erro e continua.
    console.error('Erro ao registrar evento de segurança:', err.message);
  }
}

// Desativa um usuário (não permite mais login).
async function deactivateUser(userId) {
  const result = await crmPool.query(
    'UPDATE users SET active = false WHERE id = $1 RETURNING id, email, role',
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('Usuário não encontrado');
  }

  return result.rows[0];
}

// Lista todos os usuários (para gestão).
async function listUsers() {
  const result = await crmPool.query(
    `SELECT id, email, name, role, active, created_at, last_login_at
     FROM users
     ORDER BY created_at DESC`
  );

  return result.rows;
}

module.exports = {
  verifyGoogleToken,
  findOrCreateUser,
  generateSessionToken,
  verifySessionToken,
  logSecurityEvent,
  deactivateUser,
  listUsers,
};
