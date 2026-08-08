# Rotas de Vendedores (sellers)

Controller: `backend/app/controllers/sellers.controller.js`
Service: `backend/app/services/sellers.service.js`

Todas as rotas usam apenas `requireAuth` (sem `requireAdmin`) — tela editável
por Admin e Acesso limitado, FSD seção 8.5.

Adicionar em `main.js`, importando o controller:

```js
const sellersController = require('./controllers/sellers.controller');
```

E registrando as rotas (na seção de rotas protegidas):

```js
// ===== Rotas de Vendedores e Fila de Rodízio =====

// IMPORTANTE: /sellers/rotation/next deve ser registrada ANTES de
// /sellers/:id, senão o Express tentaria casar "rotation" como :id.
app.get('/sellers/rotation/next', requireAuth, sellersController.getNextInRotation);

app.get('/sellers', requireAuth, sellersController.listSellers);
app.get('/sellers/:id', requireAuth, sellersController.getSellerById);
app.post('/sellers', requireAuth, sellersController.createSeller);
app.patch('/sellers/:id', requireAuth, sellersController.updateSeller);
app.patch('/sellers/:id/toggle-active', requireAuth, sellersController.toggleSellerActive);
```

## Lista de rotas (método + path + função)

| Método | Path                          | Função do controller     |
|--------|-------------------------------|---------------------------|
| GET    | /sellers/rotation/next        | getNextInRotation         |
| GET    | /sellers                      | listSellers                |
| GET    | /sellers/:id                  | getSellerById               |
| POST   | /sellers                      | createSeller                |
| PATCH  | /sellers/:id                  | updateSeller                |
| PATCH  | /sellers/:id/toggle-active     | toggleSellerActive          |

## Observações

- `GET /sellers?includeInactive=true` inclui vendedores inativos na listagem
  (padrão: só ativos).
- `GET /sellers/rotation/next` é apenas consulta — não altera
  `rotation_last_assigned_at` nem efetiva nenhuma designação de lead. O
  motor de encaminhamento que efetivamente consome a fila é a Fase 9.
- `POST /sellers` e `PATCH /sellers/:id` retornam 400 com mensagem amigável
  em caso de erro de validação (nome vazio, WhatsApp em formato inválido).
- `PATCH /sellers/:id/toggle-active` espera `{ "active": true|false }` no
  corpo da requisição.
