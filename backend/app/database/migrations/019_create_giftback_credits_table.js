// Tabela de créditos de giftback/cashback (desconto futuro).

module.exports = {
  async up(pool) {
    const sql = `
      CREATE TYPE credit_status AS ENUM (
        'available',
        'used',
        'expired'
      );

      CREATE TABLE giftback_credits (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL,
        campaign_id INTEGER,
        credit_percent NUMERIC(5, 2),
        credit_value NUMERIC(12, 2),
        valid_until TIMESTAMP,
        status credit_status NOT NULL DEFAULT 'available',
        used_in_sale_id INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL,
        FOREIGN KEY (used_in_sale_id) REFERENCES sales(id) ON DELETE SET NULL
      );

      CREATE INDEX idx_giftback_credits_customer_id ON giftback_credits(customer_id);
      CREATE INDEX idx_giftback_credits_status ON giftback_credits(status);
      CREATE INDEX idx_giftback_credits_customer_status ON giftback_credits(customer_id, status);
    `;

    await pool.query(sql);
  },
};
