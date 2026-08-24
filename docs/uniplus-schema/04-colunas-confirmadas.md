# Colunas confirmadas para a Fase 4 — mapeamento do schema Uniplus

Confirmado pelo responsável em 08/08/2026, via checklist interativo, a partir
da lista curada proposta em cima do levantamento bruto de
`03-colunas-tabelas-selecionadas.md`.

## entidade
`id`, `codigo`, `cliente`, `fornecedor`, `representante`, `nome`, `razaosocial`,
`tipopessoa`, `cnpjcpf`, `email`, `telefone`, `celular`, `whatsapp`,
`tipowhatsapp`, `nascimento`, `datacadastro`, `datahorainclusao`, `inativo`,
`dataultcompra`, `idcategoriacliente`, `idfilialcadastro`

## filial
`id`, `codigo`, `nome`, `razaosocial`, `cnpj`, `cidade`, `estado`, `inativo`

## hierarquia
`id`, `codigo`, `nome`, `classe`

## produto
`id`, `codigo`, `ean`, `nome`, `preco`, `inativo`, `idhierarquia`,
`hierarquia`, `datacadastro`, `dataalteracao`, `idmarca`

## produtoean
`id`, `idproduto`, `ean`, `variacao`, `descricaovariacao`, `inativo`

## saldoestoque
`id`, `idfilial`, `idproduto`, `quantidade`, `ultimaalteracao`,
`codigoproduto`, `nomeproduto`

## dav
`id`, `codigo`, `idfilial`, `idrepresentante`, `idcliente`, `status`, `valor`,
`data`, `aprovado`, `datacancelamento`, `idnotafiscal`, `desconto`,
`datainclusao`, `tipodocumento`

**`tipodocumento`** confirmado em produção (16/08/2026, dono do projeto):
valores existentes na base são `1` (Pré-venda), `2` (Orçamento), `4` (Pedido
de Venda), `6` (Pedido de Faturamento), `7` (Orçamento de Faturamento) —
`SELECT tipodocumento, COUNT(*) FROM dav GROUP BY tipodocumento` não
retornou nenhum outro valor. É este campo, não `aprovado`, que determina se
um `dav` conta como venda (ver `system_settings` chave
`piloto_automatico.dav_tipos_considerados_venda`) — `aprovado` é fluxo de
aprovação, conceito diferente.

## davitem
`id`, `iddav`, `idproduto`, `quantidade`, `preco`, `total`, `desconto`,
`cancelado`

## item
`id`, `idoperacao`, `produto`, `quantidade`, `precounitario`, `precoliquido`,
`vendedor`, `cancelado`, `data`, `nomeproduto`, `numerodav`,
`numeronotafiscal`, `serienotafiscal`, `chaveacesso`, `tipodocumento`

**Observação:** esta tabela tem colunas que apontam tanto para `dav`
(`numerodav`) quanto para `notafiscal` (`numeronotafiscal`, `serienotafiscal`,
`chaveacesso`) — pode ser uma tabela denormalizada/de relatório que já
unifica os itens de venda das duas origens. Vale avaliar, no desenho da
sincronização da Fase 4, se `item` pode substituir a necessidade de
sincronizar `davitem` e `notafiscalitem` separadamente, ou se são fontes
complementares.

## notafiscal
`id`, `tipodocumento`, `idfilial`, `identidade`, `idrepresentante`,
`numeronotafiscal`, `serie`, `modelo`, `chavenfe`, `emissao`,
`datahoraemissao`, `valortotalnota`, `status`, `cancelamento`,
`documentoorigem`, `datainclusao`

## notafiscalitem
`id`, `idnotafiscal`, `idproduto`, `descricao`, `precounitario`, `quantidade`,
`total`, `desconto`, `iddavitem`

## operacao_nfce_view
`id`, `data`, `filial`, `tipo`, `pdv`, `valorbruto`, `valorliquido`,
`numeronfce`, `cliente`, `consumidornome`, `consumidorcpfcnpj`, `vendedor`,
`statusnfce`

## operacao
Tabela-base por trás de `operacao_nfce_view` (confirmado via `pg_get_viewdef`,
16/08/2026) — a trigger de tempo real do Piloto Automático da Loja e a
consulta pontual por id (`fetchOperacaoNfceById`) usam a tabela diretamente,
não a view. Colunas confirmadas em uso:
`id`, `data`, `filial`, `tipo`, `pdv`, `valorliquido`, `modelonfce`,
`cliente`, `consumidornome`, `consumidorcpfcnpj`, `cancelado`,
`vendaabortada`, `erroprocessamento`, `chaveacessonfce`

**Sinal de venda confirmada:** `tipo > 0 AND modelonfce = '65' AND cancelado
= 0 AND vendaabortada = 0 AND erroprocessamento = 0 AND chaveacessonfce IS
NOT NULL` — validado contra dado real (16/08/2026): as combinações de
`statusnfce`/`statusprocessamento` que são 100% canceladas ficam corretamente
fora desse filtro só por causa de `cancelado`, sem precisar decodificar o
significado numérico de `statusnfce`/`statusprocessamento`.

## movimentoestoque
`id`, `idfilial`, `data`, `datahora`, `idproduto`, `variacao`,
`tipodocumento`, `quantidadeentrada`, `quantidadesaida`, `valortotal`,
`cancelado`, `idoriginal`, `iditemoriginal`, `observacao`, `precocusto`,
`customedio`, `currenttimemillis`, `idlocalestoque`, `idlote`, `idcme`,
`custototal`, `precoultimacompra`, `custoaquisicao`, `pontoequilibrio`

Ledger de movimentação de estoque (append-only) — base do objetivo 1
(perdas), 4 (ciclo atípico) e 5 (compras anômalas vs. giro) do Radar da
Loja. Validado em produção (24/08/2026, dono do projeto, via cópia de
teste).

**`idproduto`** confirmado como `produto.id` direto (não código) —
validado com 8 ids reais de `movimentoestoque.idproduto` das amostras
acima (`10899, 11139, 11255, 11258, 11284, 11372, 11373, 11375`), todos
batendo com produtos reais e coerentes com os valores das vendas (ex.:
`11255` = "CARTEIRA CLASSE COURO FEM F3942", bate com o `valortotal` de
R$157,90 da venda `19869`). Mesma convenção já confirmada para
`saldoestoque.idproduto`/`dav.idcliente`/`dav.idrepresentante` (colunas
com prefixo `id`, diferente de `operacao.cliente`/`item.vendedor`/
`item.produto`, que são código).

**`idoriginal`/`iditemoriginal`** confirmados como `operacao.id`/`item.id`
quando `tipodocumento = 1` (venda) — testado com ids reais: 5 `idoriginal`
distintos bateram exatamente com 5 `operacao.id`, e os `iditemoriginal`
correspondentes bateram exatamente com os `item.id` daquelas operações
(zero linhas via `dav`/`davitem` para os mesmos ids, como esperado). Para
os demais `tipodocumento`, o alvo de `idoriginal` não foi mapeado — pode
não ser `operacao`/`item`.

**`cancelado`** é flag `0`/`1` literal (confirmado: `17500` linhas com `0`,
`1795` com `1` — não há outros valores), diferente da convenção "`0` = falso,
`<>0` = verdadeiro" assumida (ainda não validada) para outras tabelas.

**`tipodocumento`** — distribuição real (volume total 19.295 linhas,
30/09/2020 a 20/01/2026):

| tipodocumento | qtd | Significado |
|---|---|---|
| `1` | 11.427 | Venda (saída) — confirmado via `operacao`/`item`. |
| `2` | 6.329 | Majoritariamente entrada (compra?) — não confirmado com o dono, tem uma parcela de saída (~4%) ainda não explicada. |
| `3` | 279 | "Estorno do movimento anterior da devolução N" (texto em `observacao`) — reversão de um movimento de devolução; a devolução original não foi localizada com esse `tipodocumento` explicitamente. |
| `52` | 61 | "PRODUTOS QUE FORAM LEVADOS PELO REPRESENTANTE" — saída, `valortotal = 0` (produto sai do estoque sem virar receita registrada; candidato a sinal de perda/objetivo 1, não é venda). |
| `-15` | 1.189 | "ACERTO DE ESTOQUE POR IMPORTAÇÃO DE DADOS" — carga inicial da migração para o Uniplus, evento único em 30/09/2020. **Excluir de qualquer análise de padrão comercial** (não é evento de negócio real). |
| `-6` | 3 | "PRODUTO COM ESTOQUE NEGATIVO" / "SAIDA DUPLICADA ESTOQUE NEGATIVO" — correção manual/automática de falha de controle de estoque. Sinal de interesse para objetivo 1, não é movimento comercial normal. |
| `-3` | 7 | "estoque zerado" / "SEM ESTOQUE" — mesma natureza de `-6`. |

**Pendência aberta:** o que exatamente é `tipodocumento = 2` (entrada
majoritária — provável compra, mas não confirmado) e onde fica a
devolução original que o `tipodocumento = 3` estorna. Não bloqueia a
sincronização (que grava tudo cru, sem interpretar), mas bloqueia a
camada de análise que for consumir `stock_movements` depois — precisa de
mais uma rodada de validação com o dono antes de, por exemplo, tratar
`tipodocumento = 2` como "compra" em qualquer cálculo de objetivo 5.

## Pendências — resolvidas em 08/08/2026

1. **Direção do vínculo DAV × Nota Fiscal — confirmado.** A regra de
   deduplicação (ver `02-regras-negocio-uniplus.md`, seção 4) usa
   `dav.idnotafiscal IS NOT NULL` como critério de "esta DAV já virou nota,
   não contar separado".
2. **Significado de `entidade.tipowhatsapp` — descartado por decisão do
   responsável.** Não será investigado nem usado por enquanto; a função de
   validação de WhatsApp mencionada em `02-regras-negocio-uniplus.md`,
   seção 2, precisará de outra abordagem (a definir na implementação da
   Fase 4, sem depender desse campo).

## Próximos passos

- Mapeamento de tabelas e colunas está fechado. A Fase 4 deixa de estar
  bloqueada (ver `docs/STATUS.md` e `docs/PLANO.md`) — falta decidir se
  quer que eu já atualize esses dois documentos para refletir o
  desbloqueio.
