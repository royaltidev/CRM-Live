// Tabela de produtos (catálogo — espelho do Uniplus).

module.exports = {
  async up(pool) {
    const sql = `
      CREATE TABLE products (
        id SERIAL PRIMARY KEY,
        uniplus_id VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(255),
        price NUMERIC(12, 2),
        active BOOLEAN NOT NULL DEFAULT true,
        synced_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_products_uniplus_id ON products(uniplus_id);
      CREATE INDEX idx_products_category ON products(category);
      CREATE INDEX idx_products_active ON products(active);
    `;

    await pool.query(sql);
  },
};
