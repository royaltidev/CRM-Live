// Espelho de movimentoestoque (Uniplus) — ledger de movimentação de
// estoque (venda, compra, ajuste, saída de representante, estorno, etc.),
// base para os objetivos 1 (prevenção de perdas), 4 (ciclo atípico de
// venda) e 5 (compras anômalas vs. giro) do "Radar da Loja".
//
// Schema validado em produção (24/08/2026, dono do projeto, via pgAdmin em
// cópia de teste) — ver docs/uniplus-schema/04-colunas-confirmadas.md §
// movimentoestoque para o levantamento completo (distribuição de
// movement_type, amostras, confirmação de idoriginal/iditemoriginal =
// operacao.id/item.id para vendas, e de idproduto = produto.id direto).
//
// movement_type espelha movimentoestoque.tipodocumento CRU (inclusive
// valores negativos — são ajustes/estornos do sistema, não um erro de
// dado). Nenhuma interpretação de negócio acontece aqui: a tradução "isto é
// perda", "isto é compra", etc. é decisão de análise, feita depois, com o
// dono revisando cada tipo (mesmo princípio de uniplus.repository.js —
// sincronização não faz transformação de negócio, só espelha).
//
// source_operacao_uniplus_id/source_item_uniplus_id (movimentoestoque.
// idoriginal/iditemoriginal) são guardados CRUS, sem FK — confirmado que
// apontam para operacao.id/item.id quando movement_type = 1 (venda), mas
// o alvo pode variar por tipo (compra, devolução, ajuste) e isso não foi
// mapeado para todos os tipos ainda.
module.exports = {
  async up(pool) {
    const sql = `
      CREATE TABLE stock_movements (
        id SERIAL PRIMARY KEY,
        uniplus_id BIGINT NOT NULL,
        product_id INTEGER NOT NULL,
        movement_type SMALLINT NOT NULL,
        quantity_in NUMERIC(12, 2) NOT NULL DEFAULT 0,
        quantity_out NUMERIC(12, 2) NOT NULL DEFAULT 0,
        total_value NUMERIC(12, 2),
        unit_cost NUMERIC(12, 2),
        canceled BOOLEAN NOT NULL DEFAULT false,
        source_operacao_uniplus_id BIGINT,
        source_item_uniplus_id BIGINT,
        observacao TEXT,
        movement_date DATE,
        movement_datetime TIMESTAMP,
        synced_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
        UNIQUE (uniplus_id)
      );

      CREATE INDEX idx_stock_movements_product_id ON stock_movements(product_id);
      CREATE INDEX idx_stock_movements_movement_type ON stock_movements(movement_type);
      CREATE INDEX idx_stock_movements_movement_datetime ON stock_movements(movement_datetime);
      CREATE INDEX idx_stock_movements_uniplus_id ON stock_movements(uniplus_id);
    `;

    await pool.query(sql);
  },
};
