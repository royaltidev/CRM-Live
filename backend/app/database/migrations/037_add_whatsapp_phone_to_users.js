// Adiciona whatsapp_phone à tabela users — não previsto no FSD original
// (seção 11.2 só tem google_subject/email/name/avatar_url/role/active).
//
// Escopo novo, pedido pelo responsável do projeto (Fase 10): alerta
// imediato ao Administrador quando uma nota de NPS baixa é recebida (FSD
// 6.8/12.12), via WhatsApp — mesmo canal já usado pra notificar vendedor de
// lead novo (Fase 9). Guardado na própria linha do usuário (não em
// system_settings) porque é um dado de contato de UM usuário específico,
// não um parâmetro de loja. Nullable: nem todo usuário precisa ter um
// WhatsApp cadastrado, e a ausência não bloqueia nada — só desativa o
// alerta pra esse usuário. Ver backend/app/services/nps.service.js e
// docs/STATUS.md, Fase 10.

module.exports = {
  async up(pool) {
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_phone VARCHAR(20);`);
  },
};
