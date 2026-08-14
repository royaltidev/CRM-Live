// Métricas persistidas das sugestões de cross-sell (remodelagem da Venda
// Inteligente, 14/08/2026).
//
// Por que persistir: antes, o resultado da detecção de padrões só existia no
// diálogo que aparecia logo após clicar no botão — fechou, perdeu. Guardando
// co-ocorrência, confiança e lift na própria linha da sugestão, a lista
// detectada passa a ser revisitável a qualquer momento na tela de Cross-sell,
// e o usuário enxerga POR QUE cada par foi sugerido.
//
// Limpeza das sugestões antigas: as 1.163 linhas `suggested`/inativas
// existentes foram geradas pelo critério anterior (co-ocorrência mínima de 2
// vendas), que produzia justamente o ruído relatado pelo responsável do
// projeto — pares com 2 vendas em conjunto, iguais a centenas de outros, sem
// nenhum poder de recomendação. Elas nascem sem métrica e não têm como ser
// recalculadas linha a linha, então são removidas: são todas sugestões
// automáticas NUNCA revisadas (active = false), reproduzíveis a qualquer
// momento por uma nova detecção. Pares ativos e pares de origem `manual`
// ficam intactos.

module.exports = {
  async up(pool) {
    await pool.query(`
      ALTER TABLE complementary_products
        ADD COLUMN co_occurrence INTEGER,
        ADD COLUMN confidence NUMERIC(6, 4),
        ADD COLUMN lift NUMERIC(10, 4),
        ADD COLUMN detected_at TIMESTAMP;
    `);

    await pool.query(`
      DELETE FROM complementary_products
       WHERE source = 'suggested' AND active = false;
    `);
  },
};
