// Adiciona 'canceled' ao enum message_status (FSD seção 13.7, passo 2).
//
// Necessário pra Fase 9: quando um cliente responde, o sistema interrompe
// qualquer automação (régua) em andamento pra ele — mensagens já
// enfileiradas (status='queued', trigger_source='automation') deixam de ser
// enviadas. Reaproveitar 'failed' pra isso confundiria com uma falha real de
// envio no Log de Disparos; 'canceled' é um estado distinto e intencional
// (mesmo padrão já usado em campaigns.status, que também tem 'canceled').

module.exports = {
  async up(pool) {
    await pool.query(`ALTER TYPE message_status ADD VALUE IF NOT EXISTS 'canceled';`);
  },
};
