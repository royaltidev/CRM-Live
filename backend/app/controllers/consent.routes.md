# Rotas — Módulo Consentimento e LGPD (Fase 6)

Rota abaixo exige `requireAuth` (visível por Admin **e** Acesso Limitado, conforme
FSD seção 8.5 — matriz de permissões).

## Consentimento (`backend/app/controllers/consent.controller.js`)

| Método | Path              | Middleware    | Controller.função                       |
|--------|-------------------|---------------|-------------------------------------------|
| GET    | `/consent/report` | `requireAuth` | `consent.controller.getConsentReportHandler` |

### Detalhes de query

- `GET /consent/report` — query params opcionais:
  - `status`: `'opted_in' | 'opted_out' | 'never_contacted'` (filtra pelo status calculado).
  - `startDate`, `endDate`: filtram sobre `COALESCE(opted_in_at, opted_out_at)`.
  - Resposta: `{ report: [{ customer_id, name, phone_e164, status, opted_in_at, opted_out_at }] }`.

## Serviços relacionados (não expostos via rota HTTP)

- `backend/app/services/consent.service.js` — contrato usado internamente por outros
  módulos (fila de envio de mensagens, caixa de entrada WhatsApp — Fase 9). Funções
  exportadas: `OPT_OUT_KEYWORDS`, `getConsent`, `optIn`, `optOut`,
  `isCustomerEligibleForMessage`, `processInboundOptOutKeyword`. Não são rotas HTTP
  públicas — são chamadas diretamente por código de processamento de mensagens.

## Sugestão de integração no `main.js`

```js
const consentController = require('./app/controllers/consent.controller');
const { requireAuth } = require('./app/middleware/auth.middleware');

app.get('/consent/report', requireAuth, consentController.getConsentReportHandler);
```
