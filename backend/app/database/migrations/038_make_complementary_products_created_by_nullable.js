// Permite created_by nulo em complementary_products — escopo novo (Venda
// Inteligente, fora do FSD original): uma sugestão gerada automaticamente
// pelo motor de detecção de padrões de compra (source = 'suggested') não
// tem um usuário humano como autor. NULL = gerada pelo sistema; um id real
// continua significando "criado manualmente por este usuário" (CRUD normal
// de Cross-sell, Fase 8 Parte 4, inalterado). Ver
// backend/app/services/product-affinity.service.js e docs/STATUS.md.

module.exports = {
  async up(pool) {
    await pool.query(`ALTER TABLE complementary_products ALTER COLUMN created_by DROP NOT NULL;`);
  },
};
