// Adiciona autonomous_offers.status_reason — motivo textual de 'failed'/
// 'skipped', hoje recebido por markOfferFailed/markOfferSkipped mas
// descartado (a tabela não tinha coluna pra guardar). Sem isso, em produção
// não dá pra saber por que um disparo não saiu (revisão de código externa,
// 24/08/2026, apontou o problema).
module.exports = {
  async up(pool) {
    const sql = `
      ALTER TABLE autonomous_offers ADD COLUMN IF NOT EXISTS status_reason TEXT;
    `;

    await pool.query(sql);
  },
};
