// Tabela de relação de produtos complementares (cross-sell).

module.exports = {
  async up(pool) {
    const sql = `
      CREATE TABLE complementary_products (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL,
        complementary_product_id INTEGER NOT NULL,
        source VARCHAR(50) NOT NULL CHECK (source IN ('manual', 'suggested')),
        active BOOLEAN NOT NULL DEFAULT true,
        created_by INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (product_id, complementary_product_id),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
        FOREIGN KEY (complementary_product_id) REFERENCES products(id) ON DELETE RESTRICT,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
      );

      CREATE INDEX idx_complementary_products_product_id ON complementary_products(product_id);
      CREATE INDEX idx_complementary_products_active ON complementary_products(active);
    `;

    await pool.query(sql);
  },
};
