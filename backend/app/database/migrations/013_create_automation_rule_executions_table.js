// Tabela de controle de execução de réguas (evita duplicidade).

module.exports = {
  async up(pool) {
    const sql = `
      CREATE TYPE rule_execution_status AS ENUM (
        'sent',
        'skipped_no_consent',
        'skipped_suppressed',
        'failed'
      );

      CREATE TABLE automation_rule_executions (
        id SERIAL PRIMARY KEY,
        automation_rule_id INTEGER NOT NULL,
        customer_id INTEGER NOT NULL,
        trigger_reference VARCHAR(255),
        executed_at TIMESTAMP NOT NULL DEFAULT NOW(),
        status rule_execution_status NOT NULL,
        UNIQUE (automation_rule_id, customer_id, trigger_reference),
        FOREIGN KEY (automation_rule_id) REFERENCES automation_rules(id) ON DELETE RESTRICT,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
      );

      CREATE INDEX idx_rule_executions_customer_id ON automation_rule_executions(customer_id);
      CREATE INDEX idx_rule_executions_executed_at ON automation_rule_executions(executed_at);
      CREATE INDEX idx_rule_executions_rule_customer ON automation_rule_executions(automation_rule_id, customer_id);
    `;

    await pool.query(sql);
  },
};
