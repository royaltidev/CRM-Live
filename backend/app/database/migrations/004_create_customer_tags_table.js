// Associação cliente–tag.

module.exports = {
  async up(pool) {
    const sql = `
      CREATE TABLE customer_tags (
        customer_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (customer_id, tag_id),
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE RESTRICT
      );

      CREATE INDEX idx_customer_tags_tag_id ON customer_tags(tag_id);
    `;

    await pool.query(sql);
  },
};
