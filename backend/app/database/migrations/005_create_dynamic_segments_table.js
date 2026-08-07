// Tabela de segmentos dinâmicos (filtros salvos para campanhas).

module.exports = {
  async up(pool) {
    const sql = `
      CREATE TABLE dynamic_segments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        filter_criteria JSONB NOT NULL DEFAULT '{}',
        active BOOLEAN NOT NULL DEFAULT true,
        created_by INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
      );

      CREATE INDEX idx_dynamic_segments_active ON dynamic_segments(active);
      CREATE INDEX idx_dynamic_segments_created_by ON dynamic_segments(created_by);
    `;

    await pool.query(sql);
  },
};
