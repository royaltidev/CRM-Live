// Adiciona 'cross_sell' ao enum trigger_type (FSD seções 6.4, 12.9, 13.4).
//
// A régua de cross-sell é criada pela MESMA tela genérica de Réguas (12.5),
// escolhendo este gatilho — não há criação automática/lazy de linha em
// `automation_rules`. A tela de Cross-sell (12.9) cuida só de
// `complementary_products` e do percentual de desconto; sem uma régua ativa
// com este gatilho, nenhuma oferta é enviada (mesmo padrão de "bloqueado até
// configurar" já usado no restante do sistema).

module.exports = {
  async up(pool) {
    await pool.query(`ALTER TYPE trigger_type ADD VALUE IF NOT EXISTS 'cross_sell';`);
  },
};
