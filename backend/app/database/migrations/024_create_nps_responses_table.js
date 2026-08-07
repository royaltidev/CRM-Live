// Tabela de respostas de satisfação (NPS).

module.exports = {
  async up(pool) {
    const sql = `
      CREATE TYPE nps_response_status AS ENUM (
        'pending',
        'answered',
        'low_score_open',
        'low_score_treated'
      );

      CREATE TABLE nps_responses (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL,
        sale_id INTEGER,
        survey_sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
        responded_at TIMESTAMP,
        score INTEGER CHECK (score >= 0 AND score <= 10),
        status nps_response_status NOT NULL DEFAULT 'pending',
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL
      );

      CREATE INDEX idx_nps_responses_customer_id ON nps_responses(customer_id);
      CREATE INDEX idx_nps_responses_score ON nps_responses(score);
      CREATE INDEX idx_nps_responses_responded_at ON nps_responses(responded_at);
      CREATE INDEX idx_nps_responses_status ON nps_responses(status);
    `;

    await pool.query(sql);
  },
};
