# Integração pendente — Status de Sincronização (Fase 4)

Este arquivo documenta exatamente o que precisa ser adicionado nos arquivos
compartilhados (`frontend/src/App.jsx`, `frontend/src/components/AppLayout.jsx`,
`backend/app/main.js`), que **não foram editados por este agente** (escopo
isolado — ver instruções da Fase 4). O orquestrador deve aplicar as
alterações abaixo manualmente.

## 1. Frontend — rota em `App.jsx`

Import a adicionar junto aos demais imports de views (ex.: perto do import de
`LogDisparos`):

```js
import StatusSincronizacao from './views/StatusSincronizacao/StatusSincronizacao';
```

Rota a adicionar dentro do grupo de rotas autenticadas (`<AppLayout>`),
junto das demais `<Route>` internas (ex.: logo após a rota
`/log-disparos`):

```jsx
<Route path="/status-sincronizacao" element={<StatusSincronizacao />} />
```

## 2. Frontend — item de menu em `AppLayout.jsx`

Import de ícone a adicionar junto aos demais imports de `@mui/icons-material`:

```js
import SyncOutlinedIcon from '@mui/icons-material/SyncOutlined';
```

Item a adicionar no array `MENU_ITEMS` (sem `adminOnly`, pois a tela é
visível por Administrador e Acesso Limitado — FSD 12.14/13.10). Sugestão de
posição: logo após "Log de Disparos", antes de "Gestão de Usuários":

```js
{ label: 'Sincronização Uniplus', path: '/status-sincronizacao', icon: SyncOutlinedIcon },
```

## 3. Backend — rotas em `main.js`

Import do controller a adicionar junto aos demais `require('./controllers/...')`:

```js
const syncController = require('./controllers/sync.controller');
```

Rotas a registrar (mesmo padrão de `messages.controller.js` — apenas
`requireAuth`, sem `requireAdmin`, pois a tela é acessível por Administrador
E Acesso Limitado):

```js
app.get('/sync/runs', requireAuth, syncController.listSyncRunsHandler);
app.post('/sync/run', requireAuth, syncController.triggerManualSyncHandler);
```

Nomes exatos exportados por `backend/app/controllers/sync.controller.js`:
- `listSyncRunsHandler`
- `triggerManualSyncHandler`

## 4. Backend — lembrete: iniciar o job periódico

`main.js` também precisa, no callback de `app.listen(...)`, chamar
`startUniplusSyncJob()`, exportado por
`backend/app/jobs/uniplus-sync.job.js` (construído por outro agente em
paralelo, escopo fora deste agente). Este arquivo apenas menciona o
lembrete — a implementação do job e sua chamada em `main.js` não fazem parte
deste escopo.

Exemplo de como isso normalmente se encaixa (confirmar assinatura exata com
quem implementou `uniplus-sync.job.js`):

```js
const { startUniplusSyncJob } = require('./jobs/uniplus-sync.job');

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  startUniplusSyncJob();
});
```
