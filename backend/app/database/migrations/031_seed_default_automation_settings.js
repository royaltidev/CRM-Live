// Semeia os valores padrão de configuração das réguas de relacionamento
// (FSD seção 20, Fase 7). Idempotente: ON CONFLICT (key) DO NOTHING — nunca
// sobrescreve um valor que o Administrador já tenha alterado manualmente.
//
// Chaves semeadas por esta migration (TÊM valor padrão definido no FSD):
//   - nps_survey_delay_minutes: prazo de envio da pesquisa de satisfação
//     após a compra (FSD seção 20, "padrão: 30 minutos").
//   - nps_low_score_threshold: nota igual ou inferior é considerada baixa
//     (FSD seção 20, "padrão: 6, em escala de 0 a 10").
//
// `welcome_coupon_discount_percent` (percentual de desconto do cupom de
// incentivo ao cadastro, régua first_identified_purchase) NÃO tem valor
// padrão no FSD — mesmo padrão de fallback já usado em `rfm_criteria` e
// `message_cadence`: a régua fica bloqueada (pending_configuration) até o
// Administrador configurar. Por isso essa chave é intencionalmente deixada
// de fora desta migration.

module.exports = {
  async up(pool) {
    const sql = `
      INSERT INTO system_settings (key, value, description, updated_at)
      VALUES
        (
          'nps_survey_delay_minutes',
          '{"minutes": 30}'::jsonb,
          'Prazo de envio da pesquisa de satisfação (NPS) após o registro da venda (FSD seção 20, padrão: 30 minutos).',
          NOW()
        ),
        (
          'nps_low_score_threshold',
          '{"threshold": 6}'::jsonb,
          'Nota de NPS igual ou inferior a este valor é considerada baixa e gera alerta imediato (FSD seção 20, padrão: 6, escala 0-10).',
          NOW()
        )
      ON CONFLICT (key) DO NOTHING;
    `;

    await pool.query(sql);
  },
};
