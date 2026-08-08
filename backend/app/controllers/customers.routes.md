# Rotas — Módulo Clientes e Tags (Fase 5)

Todas as rotas abaixo exigem `requireAuth` (nenhuma é admin-only — Clientes e Tags são
editáveis por Admin **e** Acesso Limitado, conforme FSD seção 8.5).

## Clientes (`backend/app/controllers/customers.controller.js`)

> **IMPORTANTE — ordem de registro no Express:** a rota
> `GET /customers/reports/sales-without-customer` precisa ser registrada **antes** de
> `GET /customers/:id`, senão o Express vai interpretar `reports` como um `:id`.

| Método | Path                                         | Middleware    | Controller.função                                      |
|--------|----------------------------------------------|---------------|---------------------------------------------------------|
| GET    | `/customers`                                 | `requireAuth` | `customers.controller.listCustomers`                     |
| GET    | `/customers/reports/sales-without-customer`  | `requireAuth` | `customers.controller.getSalesWithoutCustomer`            |
| GET    | `/customers/:id`                             | `requireAuth` | `customers.controller.getCustomerById`                    |
| GET    | `/customers/:id/timeline`                    | `requireAuth` | `customers.controller.getCustomerTimeline`                |
| PATCH  | `/customers/:id`                             | `requireAuth` | `customers.controller.updateCustomerComplementaryFields`  |
| POST   | `/customers/:id/tags`                        | `requireAuth` | `customers.controller.addTagToCustomer`                   |
| DELETE | `/customers/:id/tags/:tagId`                 | `requireAuth` | `customers.controller.removeTagFromCustomer`               |

### Detalhes de query/body

- `GET /customers` — query params opcionais: `search` (nome/telefone), `tagId`, `rfmSegment`, `page` (default 1), `pageSize` (default 20, máx 100). Resposta: `{ customers: [...], total, page, pageSize, totalPages }`.
- `GET /customers/reports/sales-without-customer` — query params opcionais: `startDate`, `endDate` (filtram `sale_date`). Resposta: `{ sales: [...] }`, cada item com `items` (array de produtos via `sale_items`/`products`, pode ser vazio).
- `GET /customers/:id` — 404 se não existir. Resposta: `{ customer: { ...campos da tabela customers, tags: [{id, name}] } }`.
- `GET /customers/:id/timeline` — 404 se cliente não existir. Resposta: `{ timeline: [{ type: 'sale'|'message', date, data }] }`, ordenado por `date` desc.
- `PATCH /customers/:id` — body: `{ birthDate, preferences, preferredChannel }` (todos opcionais/nuláveis). Atualiza SOMENTE esses 3 campos + `updated_at`. Nunca altera `uniplus_id`, `name`, `phone_e164`, etc.
- `POST /customers/:id/tags` — body: `{ tagId }`. Idempotente (não duplica associação).
- `DELETE /customers/:id/tags/:tagId` — remove associação; 404 se não existir.

## Tags (`backend/app/controllers/tags.controller.js`)

| Método | Path        | Middleware    | Controller.função           |
|--------|-------------|---------------|-------------------------------|
| GET    | `/tags`     | `requireAuth` | `tags.controller.listTags`    |
| POST   | `/tags`     | `requireAuth` | `tags.controller.createTag`   |
| PATCH  | `/tags/:id` | `requireAuth` | `tags.controller.updateTag`   |
| DELETE | `/tags/:id` | `requireAuth` | `tags.controller.deleteTag`   |

### Detalhes de query/body

- `POST /tags` — body: `{ name }`. Retorna 400 com mensagem amigável se nome duplicado (unique constraint).
- `PATCH /tags/:id` — body: `{ name }`. Mesmas validações de duplicidade.
- `DELETE /tags/:id` — retorna 400 com mensagem amigável (não vaza detalhes internos do banco) se a tag estiver associada a algum cliente (`customer_tags` tem `ON DELETE RESTRICT`).

## Sugestão de integração no `main.js`

```js
const customersController = require('./app/controllers/customers.controller');
const tagsController = require('./app/controllers/tags.controller');
const { requireAuth } = require('./app/middleware/auth.middleware');

app.get('/customers', requireAuth, customersController.listCustomers);
app.get('/customers/reports/sales-without-customer', requireAuth, customersController.getSalesWithoutCustomer);
app.get('/customers/:id', requireAuth, customersController.getCustomerById);
app.get('/customers/:id/timeline', requireAuth, customersController.getCustomerTimeline);
app.patch('/customers/:id', requireAuth, customersController.updateCustomerComplementaryFields);
app.post('/customers/:id/tags', requireAuth, customersController.addTagToCustomer);
app.delete('/customers/:id/tags/:tagId', requireAuth, customersController.removeTagFromCustomer);

app.get('/tags', requireAuth, tagsController.listTags);
app.post('/tags', requireAuth, tagsController.createTag);
app.patch('/tags/:id', requireAuth, tagsController.updateTag);
app.delete('/tags/:id', requireAuth, tagsController.deleteTag);
```
