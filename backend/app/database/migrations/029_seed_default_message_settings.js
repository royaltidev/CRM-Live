// Semeia os valores padrão de configuração da fila de envio de mensagens
// (FSD seção 20). Idempotente: usa ON CONFLICT (key) DO NOTHING, então NUNCA
// sobrescreve um valor que o Administrador já tenha alterado manualmente.
//
// Chaves semeadas por esta migration (ambas TÊM valor padrão definido no FSD):
//   - message_monthly_limit_per_customer: limite de mensagens por cliente/mês
//     (FSD seção 20, "valor de referência: 20").
//   - message_send_window: janela de horário permitida para envio
//     (FSD seção 20, "padrão: 8h às 18h").
//
// A chave `message_cadence` (intervalo entre envios + limite diário) NÃO tem
// valor padrão definido no FSD (seção 20 é explícita: parâmetros sem padrão
// ficam bloqueados/pausados até o Admin configurar — ver
// backend/app/services/rfm.service.js para o mesmo padrão aplicado a
// `rfm_criteria`). Por isso, essa chave é INTENCIONALMENTE deixada ausente
// aqui; o processador da fila (message-queue.service.js) trata a ausência
// dela retornando status "pending_configuration", sem assumir nenhum valor.

module.exports = {
  async up(pool) {
    const sql = `
      INSERT INTO system_settings (key, value, description, updated_at)
      VALUES
        (
          'message_monthly_limit_per_customer',
          '{"limit": 20}'::jsonb,
          'Limite de mensagens outbound (sent/delivered/read) por cliente a cada 30 dias corridos (FSD seção 20, valor de referência: 20).',
          NOW()
        ),
        (
          'message_send_window',
          '{"startHour": 8, "endHour": 18}'::jsonb,
          'Janela de horário permitida para envio de mensagens outbound (FSD seção 20, padrão: 8h às 18h).',
          NOW()
        )
      ON CONFLICT (key) DO NOTHING;
    `;

    await pool.query(sql);
  },
};
