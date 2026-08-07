// Tabela de itens de venda (produtos de cada venda — espelho).

module.exports = {
  async up(pool) {
    const sql = `
      CREATE TABLE sale_items (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER NOT NULL,
        product_id INTEGER,
        quantity INTEGER,
        unit_price NUMERIC(12, 2),
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE RESTRICT
      );

      CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
      CREATE INDEX idx_sale_items_product_id ON sale_items(product_id);
    `;

    await pool.query(sql);
  },
};
