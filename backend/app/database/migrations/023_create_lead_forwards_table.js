// Tabela de encaminhamento de lead ao vendedor.

module.exports = {
  async up(pool) {
    const sql = `
      CREATE TYPE forward_reason AS ENUM (
        'purchase_intent',
        'doubt'
      );

      CREATE TYPE routing_method AS ENUM (
        'last_sale_seller',
        'rotation_queue'
      );

      CREATE TABLE lead_forwards (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL,
        customer_id INTEGER NOT NULL,
        seller_id INTEGER,
        reason forward_reason NOT NULL,
        routing_method routing_method NOT NULL,
        forwarded_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE RESTRICT,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
        FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE SET NULL
      );

      CREATE INDEX idx_lead_forwards_customer_id ON lead_forwards(customer_id);
      CREATE INDEX idx_lead_forwards_seller_id ON lead_forwards(seller_id);
      CREATE INDEX idx_lead_forwards_forwarded_at ON lead_forwards(forwarded_at);
    `;

    await pool.query(sql);
  },
};
