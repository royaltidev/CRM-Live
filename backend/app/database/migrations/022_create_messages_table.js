// Tabela de mensagens (serve também como log de disparo).

module.exports = {
  async up(pool) {
    const sql = `
      CREATE TYPE message_direction AS ENUM (
        'outbound',
        'inbound'
      );

      CREATE TYPE message_status AS ENUM (
        'queued',
        'sent',
        'delivered',
        'read',
        'failed'
      );

      CREATE TYPE trigger_source AS ENUM (
        'automation',
        'campaign',
        'manual',
        'customer'
      );

      CREATE TABLE messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL,
        customer_id INTEGER NOT NULL,
        direction message_direction NOT NULL,
        body TEXT,
        template_id INTEGER,
        automation_rule_id INTEGER,
        campaign_id INTEGER,
        trigger_source trigger_source NOT NULL,
        status message_status NOT NULL DEFAULT 'queued',
        external_message_id VARCHAR(255),
        sent_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE RESTRICT,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
        FOREIGN KEY (template_id) REFERENCES message_templates(id) ON DELETE SET NULL,
        FOREIGN KEY (automation_rule_id) REFERENCES automation_rules(id) ON DELETE SET NULL,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
      );

      CREATE INDEX idx_messages_customer_id ON messages(customer_id);
      CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
      CREATE INDEX idx_messages_created_at ON messages(created_at);
      CREATE INDEX idx_messages_campaign_id ON messages(campaign_id);
      CREATE INDEX idx_messages_automation_rule_id ON messages(automation_rule_id);
      CREATE INDEX idx_messages_customer_created ON messages(customer_id, created_at);
    `;

    await pool.query(sql);
  },
};
