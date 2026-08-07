// Tabela de tags (etiquetas aplicáveis a clientes).

module.exports = {
  async up(pool) {
    const sql = `
      CREATE TABLE tags (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;

    await pool.query(sql);
  },
};
