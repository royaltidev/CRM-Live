// Tabela de vendedores (cadastro do CRM, vínculo ao Uniplus).

module.exports = {
  async up(pool) {
    const sql = `
      CREATE TABLE sellers (
        id SERIAL PRIMARY KEY,
        uniplus_seller_id VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        whatsapp_phone VARCHAR(20),
        active BOOLEAN NOT NULL DEFAULT true,
        rotation_last_assigned_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_sellers_active ON sellers(active);
      CREATE INDEX idx_sellers_rotation_last_assigned_at ON sellers(rotation_last_assigned_at);
      CREATE INDEX idx_sellers_uniplus_seller_id ON sellers(uniplus_seller_id);
    `;

    await pool.query(sql);
  },
};
