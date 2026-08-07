// Tabela de réguas de relacionamento (automações).

module.exports = {
  async up(pool) {
    const sql = `
      CREATE TYPE trigger_type AS ENUM (
        'sale_created',
        'days_without_purchase',
        'birthday',
        'stock_replenished',
        'nps_survey',
        'consumption_cycle',
        'first_identified_purchase'
      );

      CREATE TYPE action_type AS ENUM (
        'send_message'
      );

      CREATE TABLE automation_rules (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        trigger_type trigger_type NOT NULL,
        conditions JSONB NOT NULL DEFAULT '{}',
        action_type action_type NOT NULL,
        message_template_id INTEGER,
        cascade_step INTEGER,
        delay_minutes INTEGER,
        active BOOLEAN NOT NULL DEFAULT true,
        created_by INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
      );

      CREATE INDEX idx_automation_rules_active ON automation_rules(active);
      CREATE INDEX idx_automation_rules_trigger_type ON automation_rules(trigger_type);
      CREATE INDEX idx_automation_rules_created_by ON automation_rules(created_by);
    `;

    await pool.query(sql);
  },
};
