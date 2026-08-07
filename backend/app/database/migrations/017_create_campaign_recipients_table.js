// Tabela de destinatários de campanha (relação campanha–cliente).

module.exports = {
  async up(pool) {
    const sql = `
      CREATE TYPE recipient_status AS ENUM (
        'pending',
        'sent',
        'delivered',
        'responded',
        'failed',
        'suppressed'
      );

      CREATE TABLE campaign_recipients (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER NOT NULL,
        customer_id INTEGER NOT NULL,
        status recipient_status NOT NULL DEFAULT 'pending',
        sent_at TIMESTAMP,
        delivered_at TIMESTAMP,
        responded_at TIMESTAMP,
        UNIQUE (campaign_id, customer_id),
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE RESTRICT,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
      );

      CREATE INDEX idx_campaign_recipients_campaign_id ON campaign_recipients(campaign_id);
      CREATE INDEX idx_campaign_recipients_customer_id ON campaign_recipients(customer_id);
      CREATE INDEX idx_campaign_recipients_status ON campaign_recipients(status);
    `;

    await pool.query(sql);
  },
};
