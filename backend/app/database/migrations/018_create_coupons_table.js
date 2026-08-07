// Tabela de cupons (códigos de desconto).

module.exports = {
  async up(pool) {
    const sql = `
      CREATE TYPE discount_type AS ENUM (
        'percent',
        'fixed'
      );

      CREATE TYPE coupon_status AS ENUM (
        'active',
        'used',
        'expired'
      );

      CREATE TABLE coupons (
        id SERIAL PRIMARY KEY,
        code VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        discount_type discount_type NOT NULL,
        discount_value NUMERIC(12, 2) NOT NULL,
        valid_from TIMESTAMP,
        valid_until TIMESTAMP,
        campaign_id INTEGER,
        status coupon_status NOT NULL DEFAULT 'active',
        used_by_customer_id INTEGER,
        used_in_sale_id INTEGER,
        redeemed_at TIMESTAMP,
        created_by INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL,
        FOREIGN KEY (used_by_customer_id) REFERENCES customers(id) ON DELETE SET NULL,
        FOREIGN KEY (used_in_sale_id) REFERENCES sales(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
      );

      CREATE INDEX idx_coupons_code ON coupons(code);
      CREATE INDEX idx_coupons_status ON coupons(status);
      CREATE INDEX idx_coupons_used_by_customer_id ON coupons(used_by_customer_id);
      CREATE INDEX idx_coupons_valid_until ON coupons(valid_until);
    `;

    await pool.query(sql);
  },
};
