# Integração — Réguas de Relacionamento (Fase 7)

Este documento descreve o que precisa ser adicionado em `App.jsx`,
`AppLayout.jsx` e `backend/app/main.js` para ligar as telas e rotas desta
Fase. Nenhum desses três arquivos foi editado por este agente (escopo
isolado) — quem orquestra a integração final deve aplicar as mudanças
abaixo.

## 1. `frontend/src/App.jsx`

Import, junto dos demais imports de views:

```js
import Reguas from './views/Reguas/Reguas';
import ReguasWinbackElegiveis from './views/Reguas/ReguasWinbackElegiveis';
```

Rotas, dentro do grupo autenticado (mesmo bloco `<Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>` onde já estão `/segmentacao`, `/vendedores` etc.). Não são exclusivas de Administrador (FSD 8.5: Administrador e Acesso limitado podem gerenciar réguas), então **não** usar `AdminRoute`:

```jsx
<Route path="/reguas" element={<Reguas />} />
<Route path="/reguas/winback/:ruleId" element={<ReguasWinbackElegiveis />} />
```

Sugestão de posição: logo após o bloco de `/segmentacao` (elas são
conceitualmente vizinhas — ambas usadas para configurar quem recebe
mensagens).

## 2. `frontend/src/components/AppLayout.jsx`

Import de ícone, junto dos demais imports de `@mui/icons-material` (verificado que nenhum destes dois já está em uso no arquivo):

```js
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
```

(Alternativa equivalente, caso prefiram um ícone com identidade mais "automação": `AutoAwesomeOutlined`. `CampaignOutlined` foi a escolha sugerida por remeter mais a "disparo/mensageria automatizada", consistente com o restante do menu — `ForumIcon` para Log de Disparos, `SyncOutlinedIcon` para sincronização.)

Item novo em `MENU_ITEMS` (sem `adminOnly` — FSD 8.5 permite tanto
Administrador quanto Acesso limitado gerenciarem réguas):

```js
{ label: 'Réguas de Relacionamento', path: '/reguas', icon: CampaignOutlinedIcon },
```

Sugestão de posição: logo após o item "Log de Disparos" (`/log-disparos`) e
antes de "Sincronização Uniplus", mantendo o agrupamento de telas de
mensageria/automação próximas no menu.

## 3. `backend/app/main.js`

Imports dos controllers (junto dos demais `require('./controllers/...')`):

```js
const automationRulesController = require('./controllers/automation-rules.controller');
const winbackController = require('./controllers/winback.controller');
```

Registro de rotas — **atenção à ordem**: `/automation-rules/templates/active`
precisa vir ANTES de `/automation-rules/:id`, senão o Express interpretaria
"templates" como um `:id` (mesmo problema já documentado em
`backend/app/controllers/segments.routes.md`, para `/segments/rfm/criteria`
antes de `/segments/:id`, e em `customers.routes.md`, para
`/customers/reports/...` antes de `/customers/:id`):

```js
app.get('/automation-rules', requireAuth, automationRulesController.listRules);
app.get('/automation-rules/templates/active', requireAuth, automationRulesController.listActiveTemplates);
app.get('/automation-rules/:id', requireAuth, automationRulesController.getRuleById);
app.post('/automation-rules', requireAuth, automationRulesController.createRule);
app.patch('/automation-rules/:id', requireAuth, automationRulesController.updateRule);
app.patch('/automation-rules/:id/toggle-active', requireAuth, automationRulesController.toggleRuleActive);

app.get('/winback/eligible', requireAuth, winbackController.listEligible);
app.post('/winback/resend', requireAuth, winbackController.resend);
```

Nenhuma dessas rotas é `requireAdmin` — Administrador e Acesso limitado
gerenciam réguas igualmente (FSD 8.5).

### Lembrete — job de automação (não implementado por este agente)

`main.js` também precisa chamar `startAutomationRulesJob()` (de
`backend/app/jobs/automation-rules.job.js`, construído por outro agente em
paralelo) dentro do callback de `app.listen(...)`, no mesmo padrão já usado
para `startMessageQueueJob()` e `startUniplusSyncJob()`:

```js
app.listen(settings.port, () => {
  // ...
  startMessageQueueJob();
  startUniplusSyncJob();
  startAutomationRulesJob(); // <- adicionar
});
```

Este agente não implementa `automation-rules.job.js` nem o import
correspondente — apenas registra o lembrete para quem for aplicar a
integração final.

## Contratos consumidos pelo frontend desta Fase (referência rápida)

- `GET /automation-rules?triggerType=&active=` → `{ rules: Rule[] }`
- `GET /automation-rules/templates/active` → `{ templates: [{ id, name, bodyText }] }`
- `POST /automation-rules` (body: `{ name, triggerType, conditions?, messageTemplateId?, cascadeStep?, delayMinutes? }`) → `{ rule }`
- `PATCH /automation-rules/:id` (body parcial, sem `triggerType` — o frontend não envia esse campo em edição pois o backend o ignora) → `{ rule }`
- `PATCH /automation-rules/:id/toggle-active` (body: `{ active }`) → `{ rule }` ou 409 `{ error }` se faltar modelo de mensagem
- `GET /winback/eligible?ruleId=X` → `{ customers: [{ customerId, customerName, lastPurchaseAt, daysSincePurchase, alreadyNotifiedThisCycle }] }`
- `POST /winback/resend` (body: `{ ruleId, customerId }`) → `{ result: { status, executionId, messageId } }`
