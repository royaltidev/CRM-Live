// Adiciona products.ean — espelha produto.ean do Uniplus.
//
// Decisão registrada na pesquisa "Radar da Loja" (16/08/2026, objetivo 6 —
// estoque parado + cadastro irregular): dois produto.id diferentes com o
// mesmo ean é duplicidade certa de cadastro, sem ambiguidade — mais
// confiável que fuzzy match por nome, que fica como segunda passada só
// para o que sobrar sem EAN em comum.
//
// Nullable e com cobertura parcial por natureza: na validação contra a
// base real, ~14% do catálogo tinha produto.ean preenchido (1.562 de
// 11.296). A tabela produtoean (variações, múltiplos EAN por produto)
// acrescenta mais alguns, mas fica fora do escopo desta migration —
// tratar como evolução futura, não bloqueante para a dedup por EAN direto.
module.exports = {
  async up(pool) {
    const sql = `
      ALTER TABLE products ADD COLUMN IF NOT EXISTS ean VARCHAR(20);

      CREATE INDEX IF NOT EXISTS idx_products_ean ON products(ean) WHERE ean IS NOT NULL;
    `;

    await pool.query(sql);
  },
};
