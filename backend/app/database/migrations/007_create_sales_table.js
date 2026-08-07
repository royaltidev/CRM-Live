// Tabela de vendas (espelho do Uniplus).

module.exports = {
  async up(pool) {
    const sql = `
      CREATE TABLE sales (
        id SERIAL PRIMARY KEY,
        uniplus_id VARCHAR(255) UNIQUE NOT NULL,
        customer_id INTEGER,
        seller_id INTEGER,
        sale_date TIMESTAMP NOT NULL,
        total_amount NUMERIC(12, 2),
        synced_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
        FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE RESTRICT
      );

      CREATE INDEX idx_sales_uniplus_id ON sales(uniplus_id);
      CREATE INDEX idx_sales_customer_id ON sales(customer_id);
      CREATE INDEX idx_sales_seller_id ON sales(seller_id);
      CREATE INDEX idx_sales_sale_date ON sales(sale_date);
    `;

    await pool.query(sql);
  },
};
