// Tabela de tratamento de notas de satisfação (ações tomadas).

module.exports = {
  async up(pool) {
    const sql = `
      CREATE TYPE treatment_action_type AS ENUM (
        'message',
        'discount',
        'voucher',
        'other'
      );

      CREATE TABLE nps_treatments (
        id SERIAL PRIMARY KEY,
        nps_response_id INTEGER NOT NULL,
        action_type treatment_action_type NOT NULL,
        description TEXT,
        performed_by INTEGER NOT NULL,
        result TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (nps_response_id) REFERENCES nps_responses(id) ON DELETE RESTRICT,
        FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE RESTRICT
      );

      CREATE INDEX idx_nps_treatments_nps_response_id ON nps_treatments(nps_response_id);
      CREATE INDEX idx_nps_treatments_performed_by ON nps_treatments(performed_by);
    `;

    await pool.query(sql);
  },
};
