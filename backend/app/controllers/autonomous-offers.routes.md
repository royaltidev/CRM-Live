# Rotas do Piloto Automático da Loja (autonomous_offers)

Controller: `backend/app/controllers/autonomous-offers.controller.js`
Service: `backend/app/services/autonomous-offers.service.js`

Rota usa apenas `requireAuth` (sem `requireAdmin`) — log operacional do
Piloto Automático, mesmo critério já aplicado a Log de Disparos (`/messages`)
e Sincronização Uniplus (`/sync/runs`): visível por Admin E Acesso Limitado
(FSD seção 8.5), diferente de Configurações/Caixa de Entrada.

Adicionar em `main.js`, importando o controller:

```js
const autonomousOffersController = require('./controllers/autonomous-offers.controller');
```

E registrando a rota (na seção de rotas protegidas):

```js
// ===== Rotas do Piloto Automático da Loja =====
app.get('/piloto-automatico/offers', requireAuth, autonomousOffersController.listOffers);
```

## Lista de rotas (método + path + função)

| Método | Path                     | Função do controller |
|--------|--------------------------|------------------------|
| GET    | /piloto-automatico/offers | listOffers              |

## Query params aceitos por GET /piloto-automatico/offers

Todos opcionais:

- `status` — um dos valores do CHECK de `autonomous_offers.status`:
  `queued`, `sent`, `delivered`, `read`, `failed`, `skipped`.
- `cascadeStep` — `etapa_1`, `etapa_2` ou `aviso_vendedor`.
- `recipientType` — `cliente` ou `vendedor`.
- `origin` — `operacao` ou `dav`.
- `startDate` / `endDate` — filtram por `created_at` (formato aceito pelo
  `new Date(...)`/Postgres, ex.: `2026-08-01`).
- `page` (padrão 1) / `pageSize` (padrão 50, máximo 200).

## Resposta

```json
{
  "offers": [
    {
      "id": 1,
      "origin": "operacao",
      "origin_id": "2204",
      "sale_uniplus_id": "nfce-2204",
      "sale_id": null,
      "customer_id": 10,
      "customer_name": "Cliente Exemplo",
      "seller_id": 3,
      "seller_name": "Vendedor Exemplo",
      "product_id": 55,
      "product_name": "Produto Exemplo",
      "recipient_type": "cliente",
      "recipient_phone": "5511999990000",
      "cascade_step": "etapa_1",
      "rule_reason": "complemento cadastrado de \"Produto X\"",
      "channel": "whatsapp",
      "status": "sent",
      "status_reason": null,
      "queued_at": "2026-08-24T12:00:00.000Z",
      "sent_at": "2026-08-24T12:00:05.000Z",
      "converted_at": null,
      "converted_sale_id": null,
      "created_at": "2026-08-24T12:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 50
}
```
