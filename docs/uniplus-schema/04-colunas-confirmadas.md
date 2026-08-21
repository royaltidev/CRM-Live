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
