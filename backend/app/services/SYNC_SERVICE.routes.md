# Sincronização com o Uniplus (Fase 4) — pontos de integração pendentes

Este documento existe porque a implementação da sincronização foi feita com
escopo de arquivos isolado: `main.js`, `App.jsx`, controllers e views **não**
foram tocados. Tudo que precisa ser ligado por fora está listado aqui.

Arquivos entregues nesta frente:

- `backend/app/integrations/uniplus/uniplus.repository.js` — todas as consultas
  `SELECT` ao banco do Uniplus.
- `backend/app/services/sync.service.js` — orquestração da sincronização.
- `backend/app/services/automation-trigger.service.js` — stub do hook de
  automações (motor real na Fase 7).
- `backend/app/jobs/uniplus-sync.job.js` — job periódico.
- `backend/app/database/migrations/030_add_source_type_to_sales.js`.
- `backend/app/config/settings.js` / `settings.example.js` — bloco `uniplus`.

## 1. Ligar o job no `main.js`

Mesmo padrão já usado por `message-queue.job.js`. O job **não** inicia sozinho
ao ser importado.

```js
const { startUniplusSyncJob } = require('./jobs/uniplus-sync.job');

app.listen(settings.port, () => {
  console.log(`Servidor rodando na porta ${settings.port}`);
  startMessageQueueJob();
  startUniplusSyncJob(); // <-- adicionar
});
```

Para shutdown gracioso, `stopUniplusSyncJob()` também é exportada.

## 2. Contrato consumido pelo controller do painel de status (FSD §12.14)

`backend/app/services/sync.service.js` exporta exatamente:

```js
// Inicia uma sincronização completa. Se já houver uma em andamento,
// NÃO inicia outra — retorna a Promise da run já em andamento.
// triggeredBy: 'scheduler' | 'manual'
// Resolve com o registro final de sync_runs (linha completa da tabela).
runSync({ triggeredBy })

// true se uma sincronização está em andamento neste momento.
isSyncRunning()
```

O botão "Sincronizar agora" do painel deve chamar
`runSync({ triggeredBy: 'manual' })`. Mesma regra de permissão da consulta
(Administrador e Acesso limitado).

## 3. Formato dos campos JSONB de `sync_runs` gravados por este serviço

`records_imported` — objeto de contadores simples:

```json
{
  "customers": 120,
  "sellers": 4,
  "products": 890,
  "stock_snapshots": 880,
  "stock_replenished": 3,
  "sales": 4210,
  "sales_new": 37,
  "sale_items": 9902,
  "sales_skipped": 2,
  "whatsapp_validated": 12,
  "customer_aggregates": 118,
  "rfm_updated": 120,
  "rfm_status": "pending_configuration"
}
```

Chaves ausentes significam que a etapa correspondente falhou nesta execução
(o motivo está em `errors`). `rfm_status` só aparece quando o Administrador
ainda não configurou os critérios de RFM — é estado normal, não erro.

`errors` — array de objetos (ou `null` quando não houve nada a registrar):

```json
[
  { "step": "stock_snapshots", "severity": "error", "message": "..." },
  { "step": "whatsapp_validation", "severity": "warning", "message": "..." }
]
```

Só entradas com `severity: "error"` influenciam o `status` da execução.
`warning` é usado para condições não fatais — a principal é a sessão do
WhatsApp fora do ar (`whatsapp_not_connected`), que adia a validação de
números para a próxima execução sem marcar a sincronização como falha.

`status`:
- `failed` — falha de conexão com o Uniplus logo no início (nada sincronizado).
- `partial_error` — alguma etapa falhou, outras tiveram sucesso.
- `success` — nenhuma etapa falhou (avisos não contam).

## 4. Configuração obrigatória antes do primeiro uso em produção

`settings.uniplus.filialId` está com o placeholder
`CHANGE_ME_uniplus_filial_id`. Enquanto não for substituído pelo id **numérico**
real da filial no Uniplus, a etapa de estoque falha com mensagem explícita e a
execução termina como `partial_error` (as demais etapas rodam normalmente).

## 5. Dependência da camada de mensageria

`sync.service.js` consome `require('../integrations/whatsapp').checkNumberStatus(phoneE164)`
(contrato em `docs/uniplus-schema/05-mapeamento-sincronizacao.md`, § "Validação
de WhatsApp"). Se o módulo não puder ser carregado ou a função não existir, a
etapa é pulada com um aviso não fatal — nenhuma alteração é necessária no
módulo de mensageria por parte desta frente.
