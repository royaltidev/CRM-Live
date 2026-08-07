// Tabela de consentimento (LGPD — opt-in/opt-out).

module.exports = {
  async up(pool) {
    const sql = `
      CREATE TABLE consents (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER UNIQUE NOT NULL,
        opted_in BOOLEAN NOT NULL DEFAULT false,
        opted_in_at TIMESTAMP,
        opted_in_source VARCHAR(50),
        opted_out BOOLEAN NOT NULL DEFAULT false,
        opted_out_at TIMESTAMP,
        opted_out_source VARCHAR(50),
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
      );

      CREATE INDEX idx_consents_opted_out ON consents(opted_out);
      CREATE INDEX idx_consents_opted_in ON consents(opted_in);
      CREATE INDEX idx_consents_customer_id ON consents(customer_id);
    `;

    await pool.query(sql);
  },
};
