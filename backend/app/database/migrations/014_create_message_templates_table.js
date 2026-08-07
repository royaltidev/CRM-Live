// Tabela de modelos de mensagem (templates reutilizáveis).

module.exports = {
  async up(pool) {
    const sql = `
      CREATE TABLE message_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        body_text TEXT NOT NULL,
        variables JSONB DEFAULT '[]',
        image_attachment_id INTEGER,
        link_url TEXT,
        active BOOLEAN NOT NULL DEFAULT true,
        created_by INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
      );

      CREATE INDEX idx_message_templates_active ON message_templates(active);
      CREATE INDEX idx_message_templates_created_by ON message_templates(created_by);
    `;

    await pool.query(sql);
  },
};
