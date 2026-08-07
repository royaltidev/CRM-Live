// Tabela de conversas (agrupamento de mensagens com cliente).

module.exports = {
  async up(pool) {
    const sql = `
      CREATE TYPE conversation_status AS ENUM (
        'automated',
        'awaiting_human',
        'answered',
        'closed'
      );

      CREATE TABLE conversations (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL,
        status conversation_status NOT NULL DEFAULT 'automated',
        last_message_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
      );

      CREATE INDEX idx_conversations_customer_id ON conversations(customer_id);
      CREATE INDEX idx_conversations_status ON conversations(status);
    `;

    await pool.query(sql);
  },
};
