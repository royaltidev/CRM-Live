// Parâmetros de giftback em massa para campanhas (FSD seções 6.4, 12.6, 13.6).
//
// `campaigns.giftback_rule_id` (FK -> giftback_credits, migration 033) aponta
// para UMA linha existente, mas giftback_credits.customer_id é NOT NULL — ou
// seja, seria o crédito de um cliente específico, não um template
// reaproveitável pros N destinatários da campanha. Isso não bate com
// "emissão em massa" (nota do próprio FSD, seção 11.2, ao lado dessa coluna).
//
// Decisão (confirmada com o responsável do projeto): a campanha guarda os
// PARÂMETROS do crédito (percentual OU valor, validade) diretamente nestas
// colunas novas. No disparo, o sistema cria uma linha nova em
// giftback_credits POR destinatário elegível, usando a relação que já existe
// e já funciona desde a Parte 3: giftback_credits.campaign_id. A coluna
// giftback_rule_id fica sem uso a partir desta parte (não é removida — sem
// migration destrutiva).

module.exports = {
  async up(pool) {
    const sql = `
      ALTER TABLE campaigns
        ADD COLUMN giftback_credit_percent NUMERIC(5, 2),
        ADD COLUMN giftback_credit_value NUMERIC(12, 2),
        ADD COLUMN giftback_valid_until TIMESTAMP;
    `;

    await pool.query(sql);
  },
};
