// Mesmo caso da migration 032: FKs previstas no FSD (seção 11.2, tabela
// campaigns) que nunca foram criadas na migration 016 — `coupon_id` e
// `giftback_rule_id` eram colunas soltas, sem constraint.
//
// Necessário para a Fase 8 (CRUD de cupons/giftback): a exclusão de um
// cupom associado a uma campanha deve ser bloqueada pelo banco (RESTRICT),
// preservando o histórico — FSD seção 10 (sem soft delete) e 14.5.

module.exports = {
  async up(pool) {
    const sql = `
      ALTER TABLE campaigns
        ADD CONSTRAINT fk_campaigns_coupon
        FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE RESTRICT;

      ALTER TABLE campaigns
        ADD CONSTRAINT fk_campaigns_giftback_rule
        FOREIGN KEY (giftback_rule_id) REFERENCES giftback_credits(id) ON DELETE RESTRICT;
    `;

    await pool.query(sql);
  },
};
