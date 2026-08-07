// Tabela de clientes (espelho + campos complementares).
// Todos os clientes vêm do Uniplus; campos complementares são do CRM Live.

module.exports = {
  async up(pool) {
    const sql = `
      CREATE TABLE customers (
        id SERIAL PRIMARY KEY,
        uniplus_id VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone_e164 VARCHAR(20),
        whatsapp_validated BOOLEAN NOT NULL DEFAULT false,
        document VARCHAR(20),
        email VARCHAR(255),
        first_purchase_at TIMESTAMP,
        last_purchase_at TIMESTAMP,
        average_ticket NUMERIC(12, 2),
        purchase_frequency_days INTEGER,
        rfm_segment VARCHAR(50),
        birth_date DATE,
        preferences JSONB DEFAULT '{}',
        preferred_channel VARCHAR(50),
        synced_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_customers_uniplus_id ON customers(uniplus_id);
      CREATE INDEX idx_customers_name ON customers USING GIN(to_tsvector('portuguese', name));
      CREATE INDEX idx_customers_phone_e164 ON customers(phone_e164);
      CREATE INDEX idx_customers_last_purchase_at ON customers(last_purchase_at);
      CREATE INDEX idx_customers_rfm_segment ON customers(rfm_segment);
      CREATE INDEX idx_customers_email ON customers(email);
    `;

    await pool.query(sql);
  },
};
