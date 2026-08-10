# checkNumberStatus — nota para o orquestrador / outros agentes

Implementado nesta rodada (escopo isolado, sem tocar em arquivos fora deste
diretório):

- `backend/app/integrations/whatsapp/index.js` — exporta `checkNumberStatus`,
  comentário de cabeçalho atualizado.
- `backend/app/integrations/whatsapp/providers/whatsapp-web-provider.js` —
  implementa `checkNumberStatus` usando `client.getNumberId`.

## Contrato final (confirmado, sem mudanças em relação ao plano)

```js
// Retorna { hasWhatsapp: boolean, waId: string|null }.
// Lança Error('whatsapp_not_connected') se a sessão não estiver pronta.
async function checkNumberStatus(phoneE164) { ... }
```

## Detalhe técnico confirmado (não ficou como suposição)

Fui conferir `backend/node_modules/whatsapp-web.js/src/Client.js` diretamente
(o pacote já estava instalado no ambiente). O método real da lib é:

```js
async getNumberId(number) {
    if (!number.endsWith('@c.us')) {
        number += '@c.us';
    }
    // ...
}
```

Ou seja, `getNumberId` aceita tanto o número "cru" quanto já com o sufixo
`@c.us` (adiciona automaticamente se ausente). Por isso reaproveitei a função
`formatChatId(phoneE164)` já existente no provider (que já monta
`"<digits>@c.us"`) diretamente, sem necessidade de uma variante "sem
sufixo". Não foi necessário nenhum `// TODO` de incerteza de formato — a
implementação está confirmada lendo o código-fonte real da lib, não apenas a
documentação.

O objeto de retorno da lib (`wid`) tem `_serialized` (confirmado via grep no
mesmo arquivo, usado do mesmo jeito em outros métodos como `sendMessage`).

## Testes rodados

1. `node -c backend/app/integrations/whatsapp/index.js` → OK.
2. `node -c backend/app/integrations/whatsapp/providers/whatsapp-web-provider.js` → OK.
3. A partir da raiz do repo:
   ```
   node -e "const wa = require('./backend/app/integrations/whatsapp'); \
     wa.checkNumberStatus('+5511999999999') \
       .then(r => console.log('Retorno inesperado (sem erro):', r)) \
       .catch(e => console.log('Erro esperado (sem sessão ativa):', e.message))"
   ```
   Saída: `Erro esperado (sem sessão ativa): whatsapp_not_connected` — exatamente
   o esperado (sem sessão real do WhatsApp neste sandbox, sem Chromium
   inicializado). Confirma que a função existe, está exportada corretamente
   pela camada de abstração e falha graciosamente.

`backend/node_modules` já estava instalado nesta sessão; não foi necessário
rodar `npm install`.

## Nenhuma incerteza pendente

Diferente do que o plano previa como possível (não conseguir confirmar o
formato esperado por `getNumberId`), consegui confirmar com certeza lendo o
código-fonte da lib no ambiente. Não há `// TODO` nem suposição não
verificada no código entregue.

## Para quem for implementar o job de sincronização (Fase 4, escopo de outro
agente)

Uso esperado, conforme `docs/uniplus-schema/05-mapeamento-sincronizacao.md`
("Validação de WhatsApp") e `02-regras-negocio-uniplus.md` (seção 2):

- Testar candidatos na ordem `whatsapp` → `celular` → `telefone` (colunas de
  `entidade`), normalizados para E.164.
- Chamar `checkNumberStatus` para cada candidato até achar o primeiro com
  `hasWhatsapp: true`; gravar esse número em `customers.phone_e164` /
  `sellers.whatsapp_phone` com `whatsapp_validated = true`.
- Se nenhum candidato validar, ou se `checkNumberStatus` lançar
  `Error('whatsapp_not_connected')`, gravar `whatsapp_validated = false` e
  **não falhar o job** — tentar de novo na próxima execução agendada
  (`settings.uniplus.syncIntervalMinutes`).
