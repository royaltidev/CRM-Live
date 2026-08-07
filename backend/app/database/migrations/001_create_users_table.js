// Tabela de usuários do CRM Live.
// Primer usuário autenticado via Google vira admin, demais ficam limited.
// Ver docs/FSD.md, seção 11.2 e seção 8.

module.exports = {
  async up(pool) {
    const sql = `
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        google_subject VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        avatar_url TEXT,
        role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'limited')),
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_login_at TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_users_email ON users(email);
      CREATE INDEX idx_users_google_subject ON users(google_subject);
      CREATE INDEX idx_users_active ON users(active);
    `;

    await pool.query(sql);
  },
};
