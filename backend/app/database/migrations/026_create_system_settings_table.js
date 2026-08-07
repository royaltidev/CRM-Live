// Tabela de configurações globais do sistema.
// Ver docs/FSD.md, seção 20 para a lista de parâmetros.

module.exports = {
  async up(pool) {
    const sql = `
      CREATE TABLE system_settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) UNIQUE NOT NULL,
        value JSONB NOT NULL,
        description TEXT,
        updated_by INTEGER,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE INDEX idx_system_settings_key ON system_settings(key);
    `;

    await pool.query(sql);
  },
};
