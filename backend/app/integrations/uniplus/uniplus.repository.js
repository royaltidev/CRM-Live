// Repositório de leitura do banco do Uniplus (Fase 4).
//
// REGRA ABSOLUTA: este módulo executa APENAS `SELECT` no `uniplusPool`.
// Nenhum INSERT/UPDATE/DELETE/DDL, em nenhuma hipótese (docs/FSD.md, seção 1
// e seção 5.5). O usuário de banco configurado já é somente-leitura, mas a
// regra vale independentemente disso.
//
// Este módulo não faz NENHUMA transformação de negócio: devolve as linhas
// cruas do Uniplus, com os nomes de coluna originais. Toda tradução para o
// modelo do CRM Live acontece em `backend/app/services/sync.service.js`.
//
// Todas as colunas usadas aqui constam da lista fechada em
// `docs/uniplus-schema/04-colunas-confirmadas.md`. Nenhuma coluna fora
// daquela lista pode ser adicionada sem atualizar o documento antes.
//
// CONVENÇÃO DE FLAGS (docs/uniplus-schema/05-mapeamento-sincronizacao.md,
// seção "Convenção de flags no Uniplus"): as colunas de flag booleana do
// Uniplus são `smallint`, e a convenção ASSUMIDA (ainda NÃO validada contra
// dados reais) é `0` = falso, qualquer valor `<> 0` = verdadeiro. Antes de
// confiar nesses filtros em produção, rodar
// `SELECT <coluna>, COUNT(*) FROM <tabela> GROUP BY 1` para cada flag.

const { uniplusPool } = require('../../database/connection');

// ---------------------------------------------------------------------------
// Diagnóstico de conectividade
// ---------------------------------------------------------------------------

// Verifica se o banco do Uniplus está acessível. Usada pelo sync.service para
// distinguir "falha de conexão logo no início" (sync_runs.status = 'failed')
// de "erro em uma etapa específica" (status = 'partial_error').
async function pingUniplus() {
  await uniplusPool.query('SELECT 1 AS ok');
  return true;
}

// ---------------------------------------------------------------------------
// entidade (multi-papel: cliente, fornecedor, transportadora, representante)
// ---------------------------------------------------------------------------

// Implementa: 05-mapeamento-sincronizacao.md § "customers ← entidade".
// Filtro `cliente <> 0` conforme a convenção de flags smallint (ver cabeçalho).
async function fetchClientes() {
  const { rows } = await uniplusPool.query(`
    SELECT
      id,
      codigo,
      nome,
      razaosocial,
      tipopessoa,
      cnpjcpf,
      email,
      telefone,
      celular,
      whatsapp,
      nascimento,
      inativo,
      dataultcompra,
      datacadastro
    FROM entidade
    WHERE cliente <> 0
    ORDER BY id
  `);
  return rows;
}

// Implementa: 05-mapeamento-sincronizacao.md § "sellers ← entidade".
// O papel de vendedor no Uniplus é o flag de REPRESENTANTE ("representante
// comercial") — não existe tabela `vendedor` separada
// (02-regras-negocio-uniplus.md, seção 1).
async function fetchRepresentantes() {
  const { rows } = await uniplusPool.query(`
    SELECT
      id,
      codigo,
      nome,
      razaosocial,
      tipopessoa,
      cnpjcpf,
      email,
      telefone,
      celular,
      whatsapp,
      inativo
    FROM entidade
    WHERE representante <> 0
    ORDER BY id
  `);
  return rows;
}

// Implementa: 05-mapeamento-sincronizacao.md § "sales — três origens",
// item 3 (join por CÓDIGO, não por ID).
// `operacao_nfce_view.cliente` e `.vendedor` são `character varying(14)`, o
// mesmo tipo de `entidade.codigo` — o vínculo correto é
// `operacao_nfce_view.cliente → entidade.codigo → entidade.id`.
// Este índice (codigo -> id) é o elo que falta para chegar em
// `customers.uniplus_id` / `sellers.uniplus_seller_id`.
async function fetchEntidadeCodigoIndex() {
  const { rows } = await uniplusPool.query(`
    SELECT id, codigo
    FROM entidade
    WHERE codigo IS NOT NULL
  `);
  return rows;
}

// ---------------------------------------------------------------------------
// produto + hierarquia
// ---------------------------------------------------------------------------

// Implementa: 05-mapeamento-sincronizacao.md § "products ← produto + hierarquia".
// `category` vem de `hierarquia.nome` via `produto.idhierarquia` (LEFT JOIN —
// produto sem hierarquia fica com categoria nula). O alias `categoria_nome`
// evita colisão com a coluna `produto.hierarquia` (varchar), que é o código
// da hierarquia, não o nome.
async function fetchProdutos() {
  const { rows } = await uniplusPool.query(`
    SELECT
      p.id,
      p.codigo,
      p.ean,
      p.nome,
      p.preco,
      p.precocusto,
      p.customedio,
      p.inativo,
      p.idhierarquia,
      h.nome AS categoria_nome
    FROM produto p
    LEFT JOIN hierarquia h ON h.id = p.idhierarquia
    ORDER BY p.id
  `);
  return rows;
}

// ---------------------------------------------------------------------------
// saldoestoque
// ---------------------------------------------------------------------------

// Implementa: 05-mapeamento-sincronizacao.md § "stock_snapshots ← saldoestoque".
// `filialId` vem de `settings.uniplus.filialId` — parâmetro técnico, não
// configuração de negócio (o sistema atende a uma única loja).
// `saldoestoque.idfilial` é `bigint`: um valor não numérico (ex.: o
// placeholder `CHANGE_ME_uniplus_filial_id`) causaria um erro de cast
// obscuro no Postgres, então é rejeitado aqui com uma mensagem clara.
async function fetchSaldoEstoque(filialId) {
  const normalized = String(filialId === undefined || filialId === null ? '' : filialId).trim();

  if (!/^\d+$/.test(normalized)) {
    throw new Error(
      'settings.uniplus.filialId não está configurado com um id numérico de filial do Uniplus ' +
        `(valor atual: "${normalized}"). Ver docs/uniplus-schema/05-mapeamento-sincronizacao.md, ` +
        'seção "Parâmetros técnicos".'
    );
  }

  const { rows } = await uniplusPool.query(
    `
    SELECT
      id,
      idfilial,
      idproduto,
      quantidade,
      ultimaalteracao,
      codigoproduto,
      nomeproduto
    FROM saldoestoque
    WHERE idfilial = $1::bigint
    ORDER BY idproduto
  `,
    [normalized]
  );
  return rows;
}

// ---------------------------------------------------------------------------
// Vendas — origem 1: notafiscal (âncora)
// ---------------------------------------------------------------------------

// Implementa: 05-mapeamento-sincronizacao.md § "sales", origem 1
// (`source_type = 'nota_fiscal'`).
// Dedup contra `dav`: não se aplica aqui — é a `dav` que se exclui quando já
// virou nota (ver fetchDavsNaoFaturados).
// `cancelamento` é `timestamp` (não flag smallint): nota cancelada é
// `cancelamento IS NOT NULL` — EXCLUÍDA aqui (decisão de 10/08/2026: nota
// cancelada não é uma venda real, contá-la infla o faturamento — ver
// 05-mapeamento-sincronizacao.md). A coluna `status` não teve seus valores
// confirmados contra dados reais e permanece sem filtro (ver comentário no
// cabeçalho do arquivo sobre validação em produção).
async function fetchNotasFiscais() {
  const { rows } = await uniplusPool.query(`
    SELECT
      id,
      tipodocumento,
      idfilial,
      identidade,
      idrepresentante,
      numeronotafiscal,
      serie,
      modelo,
      chavenfe,
      emissao,
      datahoraemissao,
      valortotalnota,
      status,
      cancelamento,
      documentoorigem,
      datainclusao
    FROM notafiscal
    WHERE cancelamento IS NULL
    ORDER BY id
  `);
  return rows;
}

// Implementa: 05-mapeamento-sincronizacao.md § "sales", origem 1 (itens).
// Busca EM LOTE (`= ANY(...)`) em vez de uma query por venda, para evitar
// N+1 em bases com dezenas de milhares de notas.
async function fetchItensNotaFiscal(idsNotaFiscal) {
  if (!Array.isArray(idsNotaFiscal) || idsNotaFiscal.length === 0) {
    return [];
  }

  const { rows } = await uniplusPool.query(
    `
    SELECT
      id,
      idnotafiscal,
      idproduto,
      descricao,
      precounitario,
      quantidade,
      total,
      desconto,
      iddavitem
    FROM notafiscalitem
    WHERE idnotafiscal = ANY($1::bigint[])
  `,
    [idsNotaFiscal]
  );
  return rows;
}

// ---------------------------------------------------------------------------
// Vendas — origem 2: dav não faturado
// ---------------------------------------------------------------------------

// Implementa: 05-mapeamento-sincronizacao.md § "sales", origem 2
// (`source_type = 'dav'`) e 02-regras-negocio-uniplus.md, regra 4.
// Três filtros combinados:
// - `idnotafiscal IS NULL` — dedup: uma DAV que já virou nota fiscal é o
//   MESMO evento de venda da nota, e seria contada duas vezes se não fosse
//   excluída aqui.
// - `aprovado <> 0` — convenção de flag smallint (ver cabeçalho do arquivo):
//   DAV não aprovada é orçamento/rascunho, não uma venda concluída (decisão
//   de 10/08/2026, aplicando a convenção de flags já definida).
// - `datacancelamento IS NULL` — DAV cancelada não é uma venda real (mesma
//   decisão, por simetria com o filtro de `notafiscal.cancelamento`).
async function fetchDavsNaoFaturados() {
  const { rows } = await uniplusPool.query(`
    SELECT
      id,
      codigo,
      idfilial,
      idrepresentante,
      idcliente,
      status,
      valor,
      data,
      aprovado,
      datacancelamento,
      idnotafiscal,
      desconto,
      datainclusao
    FROM dav
    WHERE idnotafiscal IS NULL
      AND aprovado <> 0
      AND datacancelamento IS NULL
    ORDER BY id
  `);
  return rows;
}

// Implementa: 05-mapeamento-sincronizacao.md § "sales", origem 2 (itens).
// Busca em lote. `cancelado` é flag smallint (ver convenção no cabeçalho) e é
// trazida para que o service descarte itens cancelados.
async function fetchItensDav(idsDav) {
  if (!Array.isArray(idsDav) || idsDav.length === 0) {
    return [];
  }

  const { rows } = await uniplusPool.query(
    `
    SELECT
      id,
      iddav,
      idproduto,
      quantidade,
      preco,
      total,
      desconto,
      cancelado
    FROM davitem
    WHERE iddav = ANY($1::bigint[])
  `,
    [idsDav]
  );
  return rows;
}

// ---------------------------------------------------------------------------
// Vendas — origem 3: operacao_nfce_view (PDV / balcão)
// ---------------------------------------------------------------------------

// Implementa: 05-mapeamento-sincronizacao.md § "sales", origem 3
// (`source_type = 'pdv_nfce'`).
// `cliente` e `vendedor` são CÓDIGOS de entidade (varchar(14)), não ids —
// a resolução passa por fetchEntidadeCodigoIndex().
async function fetchOperacoesNfce() {
  const { rows } = await uniplusPool.query(`
    SELECT
      id,
      data,
      filial,
      tipo,
      pdv,
      valorbruto,
      valorliquido,
      numeronfce,
      cliente,
      consumidornome,
      consumidorcpfcnpj,
      vendedor,
      statusnfce
    FROM operacao_nfce_view
    ORDER BY id
  `);
  return rows;
}

// Implementa: 05-mapeamento-sincronizacao.md § "sales", origem 3 (itens).
// Busca em lote na tabela `item`.
//
// Atenção: `item.produto` é `character varying(20)` — é o CÓDIGO do produto
// (`produto.codigo`), não `produto.id`. Como `products.uniplus_id` do CRM Live
// guarda `produto.id`, o LEFT JOIN abaixo resolve o código para o id na
// própria origem, devolvendo a coluna já normalizada como `idproduto` (mesmo
// nome usado por `notafiscalitem`/`davitem`). Isso é resolução de chave
// estrangeira, não transformação de negócio.
async function fetchItensOperacaoNfce(idsOperacao) {
  if (!Array.isArray(idsOperacao) || idsOperacao.length === 0) {
    return [];
  }

  const { rows } = await uniplusPool.query(
    `
    SELECT
      i.id,
      i.idoperacao,
      i.produto AS codigoproduto,
      p.id AS idproduto,
      i.nomeproduto,
      i.quantidade,
      i.precounitario,
      i.precoliquido,
      i.cancelado
    FROM item i
    LEFT JOIN produto p ON p.codigo = i.produto
    WHERE i.idoperacao = ANY($1::bigint[])
  `,
    [idsOperacao]
  );
  return rows;
}

module.exports = {
  pingUniplus,
  fetchClientes,
  fetchRepresentantes,
  fetchEntidadeCodigoIndex,
  fetchProdutos,
  fetchSaldoEstoque,
  fetchNotasFiscais,
  fetchItensNotaFiscal,
  fetchDavsNaoFaturados,
  fetchItensDav,
  fetchOperacoesNfce,
  fetchItensOperacaoNfce,
};
