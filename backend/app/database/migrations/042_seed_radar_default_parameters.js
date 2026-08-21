// Semeia o único parâmetro do Radar da Loja / Piloto Automático que TEM
// valor padrão definido pelo dono. Idempotente: ON CONFLICT (key) DO
// NOTHING, nunca sobrescreve um valor já alterado manualmente — mesmo
// padrão de 029_seed_default_message_settings.js.
//
//   - radar.default_lead_time_days: usado no objetivo 3 (assistente de
//     compras) para disparar o alerta de sazonalidade com antecedência —
//     "pelo menos um mês", valor de referência explícito do dono (16/08/2026).
//     Serve de fallback enquanto o lead time real por produto (mensurável
//     via objetivo 5, data do pedido até refletir em movimentoestoque) não
//     está calculado.
//
// As demais chaves identificadas na pesquisa NÃO têm valor padrão definido
// e são INTENCIONALMENTE deixadas ausentes — o recurso correspondente fica
// pausado/bloqueado até o dono configurar, mesmo padrão já aplicado a
// message_cadence e rfm_criteria:
//   - radar.loss_prevention_max_discount_percent (objetivo 1 — limite de
//     desconto por vendedor)
//   - radar.payment_mix_normal_range (objetivo 1 — faixa normal do mix de
//     forma de pagamento, para o CUSUM)
//   - radar.autonomous_offer_conversion_window_days (o que conta como
//     "conversão" de uma oferta autônoma)
//   - piloto_automatico.whatsapp_min_interval_seconds (intervalo mínimo
//     entre disparos, protege o número contra bloqueio)
//   - piloto_automatico.dav_tipos_considerados_venda (lista de
//     dav.tipodocumento tratados como venda — valores confirmados em
//     produção: 1 Pré-venda, 2 Orçamento, 4 Pedido de Venda, 6 Pedido de
//     Faturamento, 7 Orçamento de Faturamento; NENHUM pré-selecionado —
//     é decisão do dono, não um palpite deste sistema)
module.exports = {
  async up(pool) {
    const sql = `
      INSERT INTO system_settings (key, value, description, updated_at)
      VALUES
        (
          'radar.default_lead_time_days',
          '{"days": 30}'::jsonb,
          'Antecedência mínima, em dias, para o alerta de compra sazonal (objetivo 3 do Radar da Loja) — usado como fallback até o lead time real por produto/categoria estar calculado.',
          NOW()
        )
      ON CONFLICT (key) DO NOTHING;
    `;

    await pool.query(sql);
  },
};
