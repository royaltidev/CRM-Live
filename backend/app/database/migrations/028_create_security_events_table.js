// Tabela de log de segurança.
// Ver docs/FSD.md, seção 19 para a lista de eventos.

module.exports = {
  async up(pool) {
    const sql = `
      CREATE TYPE security_event_type AS ENUM (
        'login_success',
        'login_failed',
        'permission_denied',
        'customer_opt_out',
        'user_access_changed',
        'whatsapp_session_down'
      );

      CREATE TABLE security_events (
        id SERIAL PRIMARY KEY,
        event_type security_event_type NOT NULL,
        user_id INTEGER,
        customer_id INTEGER,
        ip_address INET,
        details JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
      );

      CREATE INDEX idx_security_events_event_type ON security_events(event_type);
      CREATE INDEX idx_security_events_created_at ON security_events(created_at);
      CREATE INDEX idx_security_events_event_type_created ON security_events(event_type, created_at);
      CREATE INDEX idx_security_events_user_id ON security_events(user_id);
    `;

    await pool.query(sql);
  },
};
