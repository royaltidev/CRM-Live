// Custo do produto no espelho (Venda Inteligente — remodelagem, 14/08/2026).
// Origem: colunas já existentes da tabela `produto` do Uniplus
// (`precocusto` = último custo, `customedio` = custo médio ponderado) — não
// exige tabela nova na sincronização, só passar a trazer as duas colunas.
// Habilita as análises de margem, valor imobilizado e preço sugerido.

module.exports = {
  async up(pool) {
    const sql = `
      ALTER TABLE products
        ADD COLUMN cost_price NUMERIC(12, 2),
        ADD COLUMN average_cost NUMERIC(12, 2);
    `;

    await pool.query(sql);
  },
};
