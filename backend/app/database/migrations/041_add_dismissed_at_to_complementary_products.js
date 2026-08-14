// Sugestões de cross-sell descartadas (remodelagem da Venda Inteligente,
// 14/08/2026).
//
// Descartar uma sugestão apagava a linha — e como o motor de detecção só
// ignora pares que JÁ EXISTEM em `complementary_products`, o par apagado
// voltava a ser sugerido na detecção seguinte, indefinidamente. Na prática o
// botão "descartar" não descartava nada: adiava.
//
// Guardando a decisão (`dismissed_at`) em vez de apagar a linha, o par sai
// das listas da tela e passa a ser automaticamente ignorado pelo motor (a
// checagem de par existente já cobre esse caso). A decisão continua
// reversível pelo filtro "Descartadas" da tela de Cross-sell.

module.exports = {
  async up(pool) {
    await pool.query(`
      ALTER TABLE complementary_products
        ADD COLUMN dismissed_at TIMESTAMP;

      CREATE INDEX idx_complementary_products_dismissed_at
        ON complementary_products(dismissed_at);
    `);
  },
};
