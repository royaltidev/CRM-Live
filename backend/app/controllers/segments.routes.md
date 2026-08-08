# Rotas — Segmentação de clientes (segments.controller.js)

Para integrar em `backend/app/main.js`, importar:

```js
const segmentsController = require('./controllers/segments.controller');
```

(o `requireAuth` e `requireAdmin` já são importados de `./middleware/auth.middleware`)

## Segmentos dinâmicos

| Método | Path                | Middleware              | Controller                              |
|--------|----------------------|--------------------------|------------------------------------------|
| GET    | /segments             | requireAuth              | segmentsController.listSegments          |
| GET    | /segments/:id         | requireAuth              | segmentsController.getSegmentById        |
| POST   | /segments             | requireAuth              | segmentsController.createSegment         |
| PATCH  | /segments/:id         | requireAuth              | segmentsController.updateSegment         |
| DELETE | /segments/:id         | requireAuth              | segmentsController.deleteSegment         |
| POST   | /segments/preview     | requireAuth              | segmentsController.previewSegmentCustomers |

Segmentação é editável por Admin E Acesso limitado (FSD seção 8.5) — por isso
todas as rotas de segmentos dinâmicos usam apenas `requireAuth`, sem `requireAdmin`.

## Critérios de classificação RFM

| Método | Path                     | Middleware                  | Controller                          |
|--------|---------------------------|-------------------------------|---------------------------------------|
| GET    | /segments/rfm/criteria     | requireAuth                   | segmentsController.getRfmCriteria    |
| PUT    | /segments/rfm/criteria     | requireAuth, requireAdmin ⚠️  | segmentsController.setRfmCriteria    |
| POST   | /segments/rfm/recalculate  | requireAuth                   | segmentsController.recalculateRfm    |

⚠️ **`PUT /segments/rfm/criteria` é a ÚNICA rota admin-only deste módulo** (FSD
seção 20: os critérios globais de classificação RFM só podem ser editados pelo
Administrador). Todas as demais rotas (inclusive o recálculo manual) usam
apenas `requireAuth`.

## Exemplo de registro em main.js

```js
const segmentsController = require('./controllers/segments.controller');

app.get('/segments', requireAuth, segmentsController.listSegments);
app.get('/segments/rfm/criteria', requireAuth, segmentsController.getRfmCriteria);
app.put('/segments/rfm/criteria', requireAuth, requireAdmin, segmentsController.setRfmCriteria);
app.post('/segments/rfm/recalculate', requireAuth, segmentsController.recalculateRfm);
app.post('/segments/preview', requireAuth, segmentsController.previewSegmentCustomers);
app.get('/segments/:id', requireAuth, segmentsController.getSegmentById);
app.post('/segments', requireAuth, segmentsController.createSegment);
app.patch('/segments/:id', requireAuth, segmentsController.updateSegment);
app.delete('/segments/:id', requireAuth, segmentsController.deleteSegment);
```

**Atenção à ordem das rotas:** `/segments/rfm/criteria`, `/segments/rfm/recalculate`
e `/segments/preview` devem ser registradas ANTES de `/segments/:id`, senão o
Express interpretaria "rfm" ou "preview" como um `:id`.

## Decisão temporária sobre o recálculo de RFM

Na versão completa do sistema (Fase 4), o recálculo de RFM roda automaticamente
após cada sincronização com o Uniplus. Como essa sincronização ainda não existe
nesta fase, o recálculo foi exposto como ação manual (`POST /segments/rfm/recalculate`),
disparável por **qualquer usuário autenticado** (não é admin-only — só a EDIÇÃO
dos critérios é admin-only). Quando o job de sincronização da Fase 4 for
implementado, ele deve chamar diretamente
`rfmService.recalculateRfmForAllCustomers()` (backend/app/services/rfm.service.js)
ao final de cada execução bem-sucedida.

## Formato de `filter_criteria` (dynamic_segments.filter_criteria / preview)

```json
{
  "productCategory": "string|null",
  "averageTicket": { "min": 0, "max": 500 },
  "purchaseDateRange": { "from": "2026-01-01", "to": "2026-08-08" },
  "tags": ["vip", "aniversariante"],
  "rfmSegment": "vip"
}
```

Todos os campos são opcionais e se combinam em AND (exceto dentro de `tags`,
que é OR — cliente precisa ter ao menos uma das tags listadas). Filtro de
bairro/cidade NÃO é suportado nesta fase: a tabela `customers` não tem essas
colunas no schema atual (Fase 2), então esse filtro é ignorado se enviado.

## Formato de `rfm_criteria` (system_settings.value, key = 'rfm_criteria')

```json
{
  "segments": [
    { "name": "vip", "label": "VIP", "maxDaysSinceLastPurchase": 30, "minPurchaseCount": 5, "minTotalSpent": 1000 },
    { "name": "fiel", "label": "Fiel", "maxDaysSinceLastPurchase": 60, "minPurchaseCount": 3, "minTotalSpent": 300 },
    { "name": "em_risco", "label": "Em risco", "maxDaysSinceLastPurchase": 120, "minPurchaseCount": 1, "minTotalSpent": 0 },
    { "name": "inativo", "label": "Inativo", "maxDaysSinceLastPurchase": null, "minPurchaseCount": 0, "minTotalSpent": 0 }
  ]
}
```

Os segmentos são avaliados NA ORDEM do array (mais exigente → mais frouxo); o
cliente recebe o primeiro segmento cujos 3 critérios (recência, frequência,
valor) ele satisfaz. O último item da lista deve ter `maxDaysSinceLastPurchase: null`
para funcionar como fallback "pega-tudo" (clientes sem nenhuma compra e
configurações incompletas caem nele). Enquanto essa chave não existir em
`system_settings`, `POST /segments/rfm/recalculate` retorna
`{ status: 'pending_configuration', updated: 0 }` sem escrever nenhum `rfm_segment`.
