// Tabela de campanhas manuais.

module.exports = {
  async up(pool) {
    const sql = `
      CREATE TYPE campaign_status AS ENUM (
        'draft',
        'scheduled',
        'sending',
        'sent',
        'canceled'
      );

      CREATE TABLE campaigns (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        segment_id INTEGER,
        segment_filter JSONB NOT NULL DEFAULT '{}',
        message_template_id INTEGER NOT NULL,
        coupon_id INTEGER,
        giftback_rule_id INTEGER,
        scheduled_at TIMESTAMP,
        status campaign_status NOT NULL DEFAULT 'draft',
        created_by INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        sent_at TIMESTAMP,
        FOREIGN KEY (segment_id) REFERENCES dynamic_segments(id) ON DELETE SET NULL,
        FOREIGN KEY (message_template_id) REFERENCES message_templates(id) ON DELETE RESTRICT,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
      );

      CREATE INDEX idx_campaigns_status ON campaigns(status);
      CREATE INDEX idx_campaigns_scheduled_at ON campaigns(scheduled_at);
      CREATE INDEX idx_campaigns_segment_id ON campaigns(segment_id);
      CREATE INDEX idx_campaigns_created_by ON campaigns(created_by);
    `;

    await pool.query(sql);
  },
};
