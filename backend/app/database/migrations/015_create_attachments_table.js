// Tabela de anexos de template (imagens de mensagem).

module.exports = {
  async up(pool) {
    const sql = `
      CREATE TABLE attachments (
        id SERIAL PRIMARY KEY,
        template_id INTEGER,
        file_path TEXT NOT NULL,
        original_filename VARCHAR(255),
        mime_type VARCHAR(50) NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
        size_bytes INTEGER NOT NULL,
        uploaded_by INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (template_id) REFERENCES message_templates(id) ON DELETE SET NULL,
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT
      );

      CREATE INDEX idx_attachments_template_id ON attachments(template_id);
      CREATE INDEX idx_attachments_uploaded_by ON attachments(uploaded_by);
    `;

    await pool.query(sql);
  },
};
