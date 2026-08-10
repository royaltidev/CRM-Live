// Adiciona a coluna sales.source_type — origem da venda no Uniplus.
//
// Ver docs/uniplus-schema/05-mapeamento-sincronizacao.md, seção
// "sales — três origens, sem sobreposição entre elas" e
// docs/uniplus-schema/02-regras-negocio-uniplus.md, seção 4:
// as vendas do CRM Live vêm de três tabelas de origem distintas e não
// sobrepostas do Uniplus (`notafiscal`, `dav` não faturado e
// `operacao_nfce_view`), e relatórios/dashboards precisam poder segmentar
// por essa origem.
//
// Decisão de implementação: o DEFAULT 'nota_fiscal' é MANTIDO após a
// criação da coluna (o enunciado permitia removê-lo). Motivos:
// 1. As vendas de demonstração da Fase 5 já existentes no banco recebem um
//    valor válido sem precisar de UPDATE.
// 2. Qualquer INSERT em `sales` que não informe a coluna (ex.: scripts de
//    apoio) continua funcionando, em vez de quebrar com violação de NOT NULL.
// A sincronização real (backend/app/services/sync.service.js) SEMPRE informa
// `source_type` explicitamente, então o default nunca é exercitado no fluxo
// de produção.

module.exports = {
  async up(pool) {
    const sql = `
      CREATE TYPE sale_source_type AS ENUM (
        'dav',
        'nota_fiscal',
        'pdv_nfce'
      );

      ALTER TABLE sales
        ADD COLUMN source_type sale_source_type NOT NULL DEFAULT 'nota_fiscal';

      CREATE INDEX idx_sales_source_type ON sales(source_type);
    `;

    await pool.query(sql);
  },
};
