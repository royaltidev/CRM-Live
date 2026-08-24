// Tabela de contagens físicas de estoque.
//
// Registrado na pesquisa "Radar da Loja" (16/08/2026, objetivo 1 —
// prevenção de perdas): suporta o app de contagem física (PWA mobile,
// perfil de acesso limitado, ainda a construir) e alimenta a tela do
// Radar com duas coisas — a cobertura de contagem do período (% dos
// produtos contados nos últimos N dias, que precisa acompanhar todo
// número de discrepância) e a lista "contagem vs. sistema" (fato
// observado, separada da discrepância inferida por movimentoestoque).
//
// counted_by_user_id e counted_by_label coexistem de propósito: o modelo
// de acesso do app de contagem ainda não foi decidido entre (a) estender
// users.role com um perfil novo ou (b) uma tabela própria de operadores
// com PIN, sem conta Google. Guardando os dois — um FK opcional para
// quando for uma conta de usuário normal, um rótulo livre para quando não
// for — a tabela não precisa mudar depois que essa decisão for tomada.
//
// expected_quantity_snapshot é a quantidade que o sistema esperava NO
// MOMENTO da contagem, não uma leitura posterior de stock_snapshots — se
// o estoque mudar depois, a contagem não perde o contexto de comparação.
module.exports = {
  async up(pool) {
    const sql = `
      CREATE TABLE stock_counts (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL,
        counted_quantity NUMERIC(12, 2) NOT NULL,
        expected_quantity_snapshot NUMERIC(12, 2),
        location_label VARCHAR(255),
        counted_by_user_id INTEGER,
        counted_by_label VARCHAR(255),
        counted_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
        FOREIGN KEY (counted_by_user_id) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE INDEX idx_stock_counts_product_id ON stock_counts(product_id);
      CREATE INDEX idx_stock_counts_counted_at ON stock_counts(counted_at);
    `;

    await pool.query(sql);
  },
};
