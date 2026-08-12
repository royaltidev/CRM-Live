// Corrige duas foreign keys que faltavam desde a Fase 2 (migrations 012 e
// 014): as colunas existiam e eram usadas como referência lógica, mas nunca
// tiveram constraint real no banco — provavelmente porque, na ordem de
// criação das tabelas, `attachments` (015) e `automation_rules` (012) foram
// criadas antes ou sem revisitar essa referência.
//
// Necessário para a Fase 8 (CRUD de templates): a exclusão de um template
// em uso por uma régua depende de ON DELETE RESTRICT bloqueando no banco,
// não só de checagem manual na aplicação.

module.exports = {
  async up(pool) {
    const sql = `
      ALTER TABLE message_templates
        ADD CONSTRAINT fk_message_templates_image_attachment
        FOREIGN KEY (image_attachment_id) REFERENCES attachments(id) ON DELETE SET NULL;

      ALTER TABLE automation_rules
        ADD CONSTRAINT fk_automation_rules_message_template
        FOREIGN KEY (message_template_id) REFERENCES message_templates(id) ON DELETE RESTRICT;
    `;

    await pool.query(sql);
  },
};
