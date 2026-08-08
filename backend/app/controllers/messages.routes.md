# Rotas de Mensagens / Log de Disparos (messages)

Controller: `backend/app/controllers/messages.controller.js`
Service: `backend/app/services/message-queue.service.js`

Rota usa apenas `requireAuth` (sem `requireAdmin`) — o log de disparos é
visível por Admin E Acesso Limitado (FSD seção 8.5).

Adicionar em `main.js`, importando o controller:

```js
const messagesController = require('./controllers/messages.controller');
```

E registrando a rota (na seção de rotas protegidas):

```js
// ===== Rotas de Mensagens / Log de Disparos =====
app.get('/messages', requireAuth, messagesController.listMessages);
```

## Lista de rotas (método + path + função)

| Método | Path      | Função do controller |
|--------|-----------|------------------------|
| GET    | /messages | listMessages            |

## Query params aceitos por GET /messages

Todos opcionais:

- `customerId` — filtra por cliente.
- `campaignId` — filtra por campanha.
- `automationRuleId` — filtra por régua de automação.
- `status` — um dos valores do ENUM `message_status`: `queued`, `sent`,
  `delivered`, `read`, `failed`.
- `startDate` / `endDate` — filtram por `created_at` (formato aceito pelo
  `new Date(...)`/Postgres, ex.: `2026-08-01`).
- `page` (padrão 1) / `pageSize` (padrão 50, máximo 200).

## Resposta

```json
{
  "messages": [
    {
      "id": 1,
      "customer_id": 42,
      "customer_name": "Fulano de Tal",
      "conversation_id": 10,
      "direction": "outbound",
      "body": "...",
      "template_id": null,
      "automation_rule_id": 3,
      "campaign_id": null,
      "trigger_source": "automation",
      "status": "sent",
      "external_message_id": "abc123",
      "sent_at": "2026-08-08T12:00:00.000Z",
      "created_at": "2026-08-08T11:59:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 50
}
```

---

# Integração do job de processamento da fila de envio

Job: `backend/app/jobs/message-queue.job.js`

Este job NÃO inicia sozinho ao ser importado — precisa ser chamado
explicitamente em `main.js`, de preferência logo após `app.listen(...)`:

```js
const { startMessageQueueJob } = require('./jobs/message-queue.job');

app.listen(settings.port, () => {
  console.log(`Servidor rodando na porta ${settings.port}`);
  startMessageQueueJob();
});
```

`startMessageQueueJob()` roda `processQueueBatch()` (de
`message-queue.service.js`) imediatamente ao iniciar e depois a cada 60
segundos (`setInterval`), logando o resultado de cada execução no console.
É idempotente — chamadas repetidas não criam múltiplos intervalos.

## Inicialização da camada de WhatsApp

A camada de abstração (`backend/app/integrations/whatsapp/index.js`) também
precisa ser inicializada uma vez no boot da aplicação, antes (ou
paralelamente a) `startMessageQueueJob()`, para que o cliente do
WhatsApp Web efetivamente conecte e, no primeiro pareamento, exiba o QR
Code no console:

```js
const whatsapp = require('./integrations/whatsapp');

app.listen(settings.port, () => {
  console.log(`Servidor rodando na porta ${settings.port}`);
  whatsapp.initialize();
  startMessageQueueJob();
});
```

**Limitação operacional desta fase:** não há tela no frontend para exibir o
QR Code de pareamento. Ele é impresso apenas no console/terminal onde o
processo Node está rodando (via `qrcode-terminal`), e precisa ser escaneado
manualmente no WhatsApp do celular vinculado à loja, no PC onde o backend
está sendo executado. Isso só é necessário no primeiro pareamento (ou se a
sessão local, persistida em `settings.whatsapp.sessionStoragePath`, for
invalidada/desconectada).
