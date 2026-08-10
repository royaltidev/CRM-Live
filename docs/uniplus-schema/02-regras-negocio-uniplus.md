# Regras de negócio do schema Uniplus — relevantes para a Fase 4

Registrado em 08/08/2026, a partir de esclarecimentos do responsável do projeto
sobre a estrutura real do banco `unico` (Uniplus). Estas regras impactam
diretamente a lógica de sincronização (`backend/app/jobs/sync*`,
`backend/app/integrations/uniplus/`) a ser construída na Fase 4.

## 1. Tabela `entidade` é multi-papel

`entidade` armazena clientes, fornecedores, transportadoras e representantes
no mesmo registro — não são tabelas separadas. Existem flags (colunas
booleanas ou similares) que indicam quais papéis um registro assume;
um mesmo registro pode acumular mais de um papel ao mesmo tempo
(ex.: ser cliente e representante).

**Impacto para a sincronização:** ao popular `customers` a partir de
`entidade`, o filtro precisa considerar apenas registros com o flag de
cliente = verdadeiro. Os nomes exatos das colunas de flag serão confirmados
na etapa de levantamento de colunas (`schema-explorer.js columns entidade`).

**Resolvido:** o papel de vendedor é o flag de **representante** (do termo
"representante comercial"). Ou seja, `sellers` (Fase 5) e `sales.seller_id`
também são populados a partir de `entidade`, filtrando pelo flag de
representante — não existe tabela `vendedor` separada.

## 2. Telefones e validação de WhatsApp ficam em `entidade`

Os telefones do cliente estão na própria tabela `entidade`, em três colunas
possíveis: `telefone`, `celular`, `whatsapp` — não existe tabela de contatos
separada para esse fim. `entidade.tipowhatsapp` foi avaliado como fonte de
validação e **descartado** (decisão registrada em `04-colunas-confirmadas.md`).

**Decisão de validação (confirmada em 10/08/2026):** todas as três colunas de
telefone (`telefone`, `celular`, `whatsapp`) devem ser tratadas como
candidatas a contato WhatsApp — não apenas a coluna `whatsapp`. A
sincronização deve gravar em `customers.phone_e164` **apenas** um número que
tenha sido confirmado como possuindo conta WhatsApp ativa, via checagem ativa
contra o próprio WhatsApp (não por heurística de formato).

**Impacto para a sincronização/implementação:**
1. Uma função que coleta e normaliza (formato E.164) os candidatos a telefone
   de `entidade.telefone`, `entidade.celular` e `entidade.whatsapp` para cada
   registro com o flag de cliente = verdadeiro.
2. Uma nova capacidade na camada de abstração de mensageria
   (`backend/app/integrations/whatsapp/index.js` e no provider
   `whatsapp-web-provider.js`, construídos na Fase 6) para checar se um
   número possui conta WhatsApp válida — o `whatsapp-web.js` expõe
   `client.getNumberId(numero)` para isso (retorna `null` se não houver conta).
   Essa checagem só funciona com a sessão do WhatsApp conectada.
3. A sincronização testa os candidatos de um cliente em ordem
   (`whatsapp` → `celular` → `telefone`) e grava o primeiro que for
   confirmado como válido em `customers.phone_e164`, com
   `whatsapp_validated = true`. Se nenhum candidato for válido,
   `customers.phone_e164` fica nulo e `whatsapp_validated = false`
   (cliente não elegível para mensagens, ver `consent.service.js`).
4. Como a checagem depende da sessão do WhatsApp estar conectada, a
   sincronização deve tratar a indisponibilidade dessa checagem de forma
   graciosa (pular a validação daquele lote e tentar de novo na próxima
   execução), sem falhar o job inteiro.

## 3. Categoria de produto vem de `hierarquia`

A classificação comercial do produto (usada em segmentação e filtros, campo
`products.category`) não vem de uma tabela `categoria` dedicada — vem da
tabela `hierarquia`. A tabela `produto` tem a coluna `idhierarquia`,
convenção de chave estrangeira do Uniplus (prefixo `id` + nome da tabela
referenciada).

## 4. Relação entre `dav` e `notafiscal` — regra de deduplicação de vendas

Este é o ponto mais crítico para não contar a mesma venda duas vezes.

- `dav` é o documento gerado no momento da venda, **antes** de qualquer nota
  fiscal ser emitida. Um `dav` sozinho (sem nota fiscal vinculada) já conta
  como venda.
- `notafiscal` é o documento fiscal (ex.: NFC-e). Pode ou não ter um `dav`
  de origem.
- Vínculo: quando `dav.idnotafiscal` está preenchido, o `dav` e a
  `notafiscal` **são o mesmo evento de venda** — não podem ser contados como
  duas vendas distintas. (Correção de 10/08/2026: o levantamento bruto de
  colunas confirma que a FK está em `dav.idnotafiscal`, não em
  `notafiscal.iddav` — `notafiscal` não possui essa coluna.)

**Regra de contagem (exemplo dado pelo responsável):**
Se Total DAV = 100, Total NotaFiscal sem DAV = 100, Total NotaFiscal
originada de DAV = 20, então o total de vendas reais é 180: 80 vendas
"tipo DAV" (100 DAVs menos as 20 que já viraram nota) + 100 vendas
"tipo NotaFiscal" (as que não passaram por DAV).

**Impacto para a sincronização:** a tabela `sales` do CRM Live precisa de uma
regra de deduplicação na hora de popular a partir de `dav` + `notafiscal`:
- Sincronizar `notafiscal` normalmente, gravando `source_type = 'nota_fiscal'`.
- Sincronizar `dav` apenas quando `dav.idnotafiscal` estiver vazio/nulo
  (evita duplicidade), gravando `source_type = 'dav'`.
- **Decisão confirmada em 10/08/2026:** relatórios/dashboards devem poder
  segmentar vendas por origem (DAV vs. Nota Fiscal). A coluna
  `sales.source_type` (enum: `dav`, `nota_fiscal`) foi aprovada e será
  adicionada ao modelo de dados do CRM Live na Fase 4 (ver `docs/FSD.md`
  §11.2 e §27).

## Tabelas confirmadas para a Fase 4 (checklist de tabelas concluído em 08/08/2026)

`dav`, `davitem`, `entidade`, `filial`, `hierarquia`, `item`, `notafiscal`,
`notafiscalitem`, `operacao_nfce_view`, `produto`, `produtoean`,
`saldoestoque`.

**Resolvido em 10/08/2026 — tabela `item`:** colunas confirmadas em
`04-colunas-confirmadas.md`. `item` tem papel próprio (não é redundante com
`produto`) e contém colunas que referenciam tanto `dav` (`numerodav`) quanto
`notafiscal` (`numeronotafiscal`, `serienotafiscal`, `chaveacesso`) — indício
de que pode ser uma tabela denormalizada/de relatório que já une os itens de
venda das duas origens. **Ponto a decidir no desenho do job de sincronização
(não uma regra de negócio, uma escolha técnica de implementação):** usar
`item` como fonte única dos itens de venda (substituindo `davitem` +
`notafiscalitem`), ou usar `davitem`/`notafiscalitem` como fonte primária e
`item` apenas como apoio/validação cruzada. Avaliar qual das duas tem
cobertura mais completa (ex.: kits, itens cancelados) antes de decidir.

## Próximos passos

- Levantar colunas de cada tabela confirmada (`schema-explorer.js
  columns-batch <tabelas>`) para checklist de campos — próxima etapa.
