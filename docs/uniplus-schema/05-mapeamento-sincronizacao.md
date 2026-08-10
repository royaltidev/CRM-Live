# Mapeamento de sincronização — Fase 4

Documento de referência técnica para a implementação do job de sincronização
(`backend/app/jobs/uniplus-sync.job.js` e `backend/app/services/sync.service.js`).
Consolida todas as decisões tomadas em `01` a `04` e nas conversas de
10/08/2026, já traduzidas em queries/regras concretas. Este arquivo é a
fonte de verdade para a implementação — não repetir/redecidir o que já
está aqui.

## Convenção de flags no Uniplus

Todas as colunas de flag booleana no schema do Uniplus são `smallint`, não
`boolean` (confirmado no levantamento bruto, `03-colunas-tabelas-selecionadas.md`):
`entidade.cliente`, `entidade.fornecedor`, `entidade.representante`,
`entidade.inativo`, `produto.inativo`, `produtoean.inativo`, `filial.inativo`,
`dav.aprovado`, `davitem.cancelado`, `item.cancelado`, `notafiscal.status`.

**Convenção assumida (padrão comum em bancos legados/Firebird-like): `0` =
falso, qualquer valor `<> 0` = verdadeiro.** Isso ainda não foi validado
contra dados reais (não há acesso ao banco real do Uniplus neste ambiente de
desenvolvimento). **Antes de confiar cegamente nesses filtros em produção**,
rodar uma query `SELECT DISTINCT coluna, COUNT(*) FROM tabela GROUP BY
coluna` para cada uma dessas colunas no ambiente real e confirmar. O código
deve ter um comentário marcando essa suposição em cada uso.

`notafiscal.cancelamento` é `timestamp`, não `smallint` — nota cancelada é
`cancelamento IS NOT NULL`.

## customers ← entidade

```sql
WHERE entidade.cliente <> 0
```
- `uniplus_id` = `entidade.id::text`
- `name` = `entidade.razaosocial` se `entidade.tipopessoa` indicar pessoa
  jurídica **e** `razaosocial` estiver preenchido; senão `entidade.nome`.
  (Os valores exatos de `tipopessoa` para pessoa física/jurídica não foram
  confirmados — validar no ambiente real antes de confiar; se incerto, usar
  sempre `nome` como fallback seguro.)
- `document` = `entidade.cnpjcpf`
- `email` = `entidade.email`
- `birth_date` = `entidade.nascimento`
- `phone_e164` / `whatsapp_validated` = ver seção "Validação de WhatsApp" abaixo
- `first_purchase_at`, `last_purchase_at`, `average_ticket`,
  `purchase_frequency_days` = **não vêm de `entidade`** — são calculados a
  partir da tabela `sales` já sincronizada do CRM Live, em um passo
  posterior à sincronização de vendas (agregação por `customer_id`).

## sellers ← entidade

```sql
WHERE entidade.representante <> 0
```
- `uniplus_seller_id` = `entidade.id::text`
- `name` = `entidade.nome`
- `whatsapp_phone` = ver seção "Validação de WhatsApp" abaixo (só grava se
  validado; senão fica `null`)

## products ← produto + hierarquia

- `uniplus_id` = `produto.id::text`
- `name` = `produto.nome`
- `category` = `hierarquia.nome`, via `produto.idhierarquia = hierarquia.id`
  (LEFT JOIN — produto sem hierarquia fica com `category = null`)
- `price` = `produto.preco`
- `active` = `produto.inativo = 0`

## stock_snapshots ← saldoestoque

```sql
WHERE saldoestoque.idfilial = :uniplusFilialId
```
- `:uniplusFilialId` é um novo parâmetro técnico em `settings.js`
  (`settings.uniplus.filialId`), não uma configuração de negócio — o sistema
  atende a uma única loja (FSD, contexto de uso). Valor placeholder
  `CHANGE_ME_uniplus_filial_id` até o responsável confirmar o `id` real da
  filial no ambiente de produção.
- `product_id` resolvido via `products.uniplus_id = saldoestoque.idproduto::text`
- `quantity` = `saldoestoque.quantidade`

## sales — três origens, sem sobreposição entre elas

Decisão confirmada em 10/08/2026: `notafiscal`, `dav` (não convertido em
nota) e `operacao_nfce_view` (vendas de PDV/balcão) são **três origens de
venda distintas e não sobrepostas** — nenhuma reconciliação cruzada entre
elas é necessária além da já existente entre `dav` e `notafiscal`.

`sales.source_type` (enum, migration `030`): `'dav'`, `'nota_fiscal'`,
`'pdv_nfce'`.

`sales.uniplus_id` é prefixado por origem para evitar colisão de ID entre as
três tabelas de origem (todas usam sequências próprias começando em 1):
- `nota_fiscal` → `nf-<notafiscal.id>`
- `dav` → `dav-<dav.id>`
- `pdv_nfce` → `nfce-<operacao_nfce_view.id>`

### 1. `source_type = 'nota_fiscal'` ← notafiscal
- Sincronizar as linhas de `notafiscal` (sem filtro de dedup contra `dav` — é
  a origem "âncora"), **exceto notas canceladas** (`cancelamento IS NOT
  NULL` — decisão de 10/08/2026: nota cancelada não é venda real). A coluna
  `status` não teve seus valores confirmados e não é filtrada.
- `sale_date` = `notafiscal.datahoraemissao`
- `total_amount` = `notafiscal.valortotalnota`
- `customer_id` resolvido via `notafiscal.identidade → entidade.id →
  customers.uniplus_id`
- `seller_id` resolvido via `notafiscal.idrepresentante → entidade.id →
  sellers.uniplus_seller_id`
- Itens: `notafiscalitem WHERE idnotafiscal = notafiscal.id`

### 2. `source_type = 'dav'` ← dav
```sql
WHERE dav.idnotafiscal IS NULL
  AND dav.aprovado <> 0
  AND dav.datacancelamento IS NULL
```
- `idnotafiscal IS NULL` evita duplicar venda já contada via `notafiscal`
  (ver `02-regras-negocio-uniplus.md`, regra 4).
- `aprovado <> 0` e `datacancelamento IS NULL` — decisão de 10/08/2026,
  aplicando a mesma convenção de flags smallint já definida: DAV não
  aprovada (orçamento/rascunho) ou cancelada não é venda concluída.
- `sale_date` = `dav.data` (ou `dav.datainclusao` se `data` vier nula)
- `total_amount` = `dav.valor`
- `customer_id` via `dav.idcliente → entidade.id → customers.uniplus_id`
- `seller_id` via `dav.idrepresentante → entidade.id → sellers.uniplus_seller_id`
- Itens: `davitem WHERE iddav = dav.id`

### 3. `source_type = 'pdv_nfce'` ← operacao_nfce_view
- Sincronizar todas as linhas.
- `sale_date` = `operacao_nfce_view.data`
- `total_amount` = `operacao_nfce_view.valorliquido`
- **Atenção — join por código, não por ID:** `operacao_nfce_view.cliente` e
  `.vendedor` são `character varying(14)`, o mesmo tipo de
  `entidade.codigo` (também `varchar(14)`) — **não** o mesmo tipo de
  `entidade.id` (`bigint`). O vínculo correto é:
  `operacao_nfce_view.cliente → entidade.codigo → entidade.id →
  customers.uniplus_id` (mesma lógica para `.vendedor` → `sellers`).
  Se `cliente` vier vazio, a venda fica sem `customer_id` (consumidor não
  identificado — `operacao_nfce_view.consumidornome`/`consumidorcpfcnpj`/
  `consumidortelefone` guardam o dado avulso do consumidor, mas o FSD não
  prevê cadastro automático de cliente a partir disso; a venda entra no
  relatório de "vendas sem cliente identificado", FSD §12.16, já
  especificado mas ainda não planejado para nenhuma fase — avaliar depois).
- Itens: `item WHERE idoperacao = operacao_nfce_view.id`. **Descoberta na
  implementação (10/08/2026):** `item.produto` é `character varying(20)` —
  é o CÓDIGO do produto (`produto.codigo`), não `produto.id`. A resolução
  para `products.uniplus_id` (que guarda `produto.id`) é feita com
  `LEFT JOIN produto p ON p.codigo = i.produto` na própria consulta de
  itens — diferente de `notafiscalitem`/`davitem`, que já trazem
  `idproduto` como `bigint` direto.

## Status de implementação

Implementado em 10/08/2026 (backend completo + painel de status). Ver
`docs/PLANO.md`, Fase 4, para o checklist atualizado.

## Validação de WhatsApp (regra de negócio, ver `02-regras-negocio-uniplus.md` §2)

Nova função na camada de mensageria (Fase 6): `checkNumberStatus(phoneE164)`
em `backend/app/integrations/whatsapp/index.js`, implementada no provider
`whatsapp-web-provider.js` via `client.getNumberId(numero)` (retorna `null`
se o número não tiver conta WhatsApp).

**Contrato exato** (para permitir implementação em paralelo por outro
agente):
```js
// Retorna { hasWhatsapp: boolean, waId: string|null }.
// Lança Error('whatsapp_not_connected') se a sessão não estiver pronta —
// quem chama deve tratar esse erro adiando a validação, nunca falhando
// o processo inteiro.
async function checkNumberStatus(phoneE164) { ... }
```

Uso na sincronização: para cada candidato de `entidade` (nessa ordem —
`whatsapp`, `celular`, `telefone`), normalizar para E.164 e chamar
`checkNumberStatus`. Usa o primeiro que retornar `hasWhatsapp: true`. Grava
esse número em `customers.phone_e164`/`sellers.whatsapp_phone` com
`whatsapp_validated = true`. Se nenhum candidato for válido (ou a sessão do
WhatsApp estiver indisponível), grava `whatsapp_validated = false` e tenta
de novo na próxima execução do job (não é um estado permanente).

**Tratamento de erro por candidato (correção de 10/08/2026, pós-implementação):**
`checkNumberStatus` pode lançar `Error('whatsapp_not_connected')` (sessão
inteira fora do ar — aborta a validação da execução inteira, comportamento
já descrito acima) ou, em tese, qualquer outro erro pontual (número
malformado, falha transitória do Puppeteer para aquele número específico).
Esse segundo caso **não** pode abortar a validação inteira: como a consulta
de pendentes é `ORDER BY id`, um único registro problemático travaria a
validação de todos os que vêm depois dele em **toda execução futura**
(efeito "cabeça de fila travada", já que o mesmo registro continuaria sendo
o primeiro pendente sempre). A implementação trata qualquer erro que não
seja `whatsapp_not_connected` como falha do candidato específico (conta em
`whatsapp_candidate_errors`, registrado como aviso não-fatal em
`sync_runs.errors`) e segue para o próximo candidato/cliente normalmente.

## Parâmetros técnicos (settings.js — não são configuração de negócio)

- `settings.uniplus.filialId` — id da filial única desta loja no Uniplus
  (placeholder `CHANGE_ME` até o responsável confirmar em produção).
- `settings.uniplus.syncIntervalMinutes` — `15` (decidido em 10/08/2026).

## Painel de status (FSD 12.14) + gatilho manual

Além do que o FSD pede (consulta a última execução, histórico, erros),
decidido em 10/08/2026: adicionar botão "Sincronizar agora" (gatilho manual),
usando o valor `triggered_by = 'manual'` já previsto em `sync_runs`. Mesma
regra de permissão da consulta (Administrador e Acesso limitado).
