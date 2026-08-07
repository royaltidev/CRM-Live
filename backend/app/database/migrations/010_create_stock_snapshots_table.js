// Tabela de snapshots de estoque (espelho do Uniplus).

module.exports = {
  async up(pool) {
    const sql = `
      CREATE TABLE stock_snapshots (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        synced_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
      );

      CREATE INDEX idx_stock_snapshots_product_id ON stock_snapshots(product_id);
      CREATE INDEX idx_stock_snapshots_product_synced ON stock_snapshots(product_id, synced_at);
    `;

    await pool.query(sql);
  },
};
