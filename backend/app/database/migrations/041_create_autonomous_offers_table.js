// Tabela de log do Piloto Automático da Loja — todo disparo autônomo
// (cliente ou vendedor) gerado a partir de uma venda em tempo real.
//
// origin + origin_id identificam a venda pela ORIGEM NO UNIPLUS (id de
// operacao ou de dav), não por sales.id — o disparo acontece via trigger +
// LISTEN/NOTIFY no banco do Uniplus, mais rápido que o sync de 15 min que
// cria a linha correspondente em sales. sale_uniplus_id já guarda o id no
// formato usado por sales.uniplus_id ("nfce-<id>" / "dav-<id>", ver
// docs/uniplus-schema/05-mapeamento-sincronizacao.md), então dá para casar
// com sales assim que o sync alcançar; sale_id fica nullable e é
// preenchido depois (backfill), não travando o registro do disparo.
//
// A restrição UNIQUE (origin, origin_id, cascade_step) é a rede de
// segurança no nível do banco contra disparo duplicado — complementa (não
// substitui) a checagem de deduplicação que o listener faz antes de agir,
// descrita no documento "Piloto Automático da Loja".
//
// converted_at/converted_sale_id ficam para quando o motor detectar uma
// venda subsequente do produto ofertado para o mesmo cliente — a regra
// exata de "o que conta como conversão" (janela de tempo, etc.) ainda não
// foi definida pelo dono; a coluna existe, o preenchimento é posterior.
module.exports = {
  async up(pool) {
    const sql = `
      CREATE TABLE autonomous_offers (
        id SERIAL PRIMARY KEY,
        origin VARCHAR(20) NOT NULL CHECK (origin IN ('operacao', 'dav')),
        origin_id BIGINT NOT NULL,
        sale_uniplus_id VARCHAR(255),
        sale_id INTEGER,
        customer_id INTEGER,
        seller_id INTEGER,
        product_id INTEGER NOT NULL,
        recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('cliente', 'vendedor')),
        recipient_phone VARCHAR(20),
        cascade_step VARCHAR(20) NOT NULL CHECK (cascade_step IN ('etapa_1', 'etapa_2', 'aviso_vendedor')),
        rule_reason TEXT,
        channel VARCHAR(20) NOT NULL DEFAULT 'whatsapp',
        status VARCHAR(20) NOT NULL DEFAULT 'queued'
          CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed', 'skipped')),
        queued_at TIMESTAMP NOT NULL DEFAULT NOW(),
        sent_at TIMESTAMP,
        converted_at TIMESTAMP,
        converted_sale_id INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
        FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE SET NULL,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
        FOREIGN KEY (converted_sale_id) REFERENCES sales(id) ON DELETE SET NULL,
        UNIQUE (origin, origin_id, cascade_step)
      );

      CREATE INDEX idx_autonomous_offers_origin ON autonomous_offers(origin, origin_id);
      CREATE INDEX idx_autonomous_offers_sale_id ON autonomous_offers(sale_id);
      CREATE INDEX idx_autonomous_offers_customer_id ON autonomous_offers(customer_id);
      CREATE INDEX idx_autonomous_offers_product_id ON autonomous_offers(product_id);
      CREATE INDEX idx_autonomous_offers_status ON autonomous_offers(status);
      CREATE INDEX idx_autonomous_offers_queued_at ON autonomous_offers(queued_at);
    `;

    await pool.query(sql);
  },
};
