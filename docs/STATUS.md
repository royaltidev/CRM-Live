# Status do Projeto — CRM Live

**Última atualização:** 13/08/2026
**Atualizado por:** Fase 10 — Parte 1 (captura de resposta de NPS) implementada e testada; Fase 9 (Caixa de entrada, atendimento e encaminhamento de lead) implementada e testada, Fase 9 concluída; Fase 8 — Parte 5 (Campanhas) implementada e testada, Fase 8 concluída; Parte 4 (Cross-sell) implementada e testada; Parte 1 (Templates) implementada e testada; validação da Fase 7 em ambiente real

## Fase 10 — Parte 1: Captura de resposta de NPS — 13/08/2026

**Objetivo (FSD seções 6.8, 12.12, 13.9):** capturar a nota que o cliente
responde à pesquisa de satisfação (já disparada pela régua `nps_survey`
desde a Fase 7) e sinalizar nota baixa para tratamento. A Fase 10 está
sendo construída em 3 partes, com checkpoint de autorização do responsável
entre cada uma: (1) Captura da resposta + alerta, (2) Tela de gestão de
NPS, (3) Ações de tratamento. **Parte 1 concluída e testada.**

### Decisões de design (ambiguidades do FSD resolvidas nesta parte)

- **Formato aceito para a resposta:** o FSD não define nenhum formato.
  Decisão: só é reconhecida como nota de NPS uma mensagem cujo conteúdo
  INTEIRO seja um número de 0 a 10 (com "nota" opcional na frente ou "/10"
  no final — ex.: "9", "nota 9", "9/10") — nunca um número embutido em
  frase livre (ex.: "entreguei em 9 dias" não vira nota 9, pra não gerar
  falso positivo numa nota real de satisfação). Mensagem que não bate nesse
  formato não é tratada como resposta de NPS e segue o fluxo normal da
  caixa de entrada (Fase 9). Ver `backend/app/services/nps.service.js`.
- **Prioridade da nota de NPS sobre o fluxo de lead da Fase 9:** uma
  pesquisa pendente é checada logo após o opt-out, ANTES do gate de
  consentimento e da classificação de intenção — se a mensagem for
  reconhecida como nota, o restante do pipeline (consentimento/IA/
  encaminhamento) é pulado. Justificativa: o cliente só recebe a pesquisa
  depois de já ter consentimento válido (a fila de envio garante isso), e
  uma nota numérica não é uma mensagem de lead — mandá-la pro classificador
  de intenção geraria um encaminhamento indevido a vendedor. Ver
  `backend/app/services/inbox.service.js#processInboundMessage`.
- **"Alerta imediato ao Administrador" (6.8/12.12):** não existe nenhum
  canal de notificação push/e-mail/WhatsApp para o Administrador em
  nenhuma outra parte do sistema (a tabela `users` nem tem telefone
  cadastrado — só conta Google). Resolvido como o "alerta destacado"
  citado literalmente em 12.12: a captura já grava
  `nps_responses.status = 'low_score_open'` imediatamente quando a nota é
  ≤ limite configurado; a tela de gestão de NPS (Parte 2) é quem vai
  destacar isso visualmente. Sem inventar um canal de notificação externo
  que não existe em nenhum outro lugar do sistema.

### Implementação

- `backend/app/services/nps.service.js` (novo) — `parseNpsScore` (parser
  estrito, ver decisão acima), `findPendingNpsResponse`,
  `captureNpsResponse` (usa `automation-settings.service.js#getNpsLowScoreThreshold`,
  já existente desde a Fase 7, com padrão 6 do FSD).
- `backend/app/services/inbox.service.js#processInboundMessage` — chama
  `npsService.captureNpsResponse` logo após o opt-out; quando captura,
  pula o gate de consentimento e a classificação de intenção (ver decisão
  acima). Retorno da função ganhou o campo `npsResponse`.

### Testes realizados

- `node -c` nos arquivos novo/alterado.
- 13 casos de `parseNpsScore` isolados (números simples, "nota N", "N/10",
  espaços/pontuação, número embutido em frase livre, fora da faixa 0–10,
  string vazia) — todos corretos.
- Testes diretos contra o Postgres real (via `docker compose exec backend
  node -e`), cliente de teste real com consentimento válido (Thiago
  Batista): nota alta → `answered`; nota baixa → `low_score_open`; nota no
  limite exato (6) → `low_score_open` (`<=`, não `<`); mensagem não
  numérica com pesquisa pendente → não captura, linha continua `pending`;
  sem pesquisa pendente → não captura; `processInboundMessage` completo com
  pesquisa pendente → nota capturada corretamente E confirmado que não
  classificou intenção, não encaminhou lead e não acionou o gate de
  consentimento (short-circuit funcionando). Nenhum `lead_forwards` criado
  indevidamente. Backend reiniciado antes do teste (`docker compose restart
  backend`), sem erros no log.
- Todo dado de teste (linhas de `nps_responses`, mensagens inseridas na
  conversa de teste) limpo ao final; status e `last_message_at` da conversa
  do cliente de teste restaurados ao valor original — conferido por query
  após a limpeza.

### Pendências desta parte (cobertas nas próximas)

- Nenhuma tela ainda consome `nps_responses`/`low_score_open` — a captura
  funciona, mas o Administrador só vai "ver" o alerta destacado na Parte 2
  (Tela de gestão de NPS).
- Ações de tratamento (`nps_treatments`) ficam pra Parte 3.

## Fase 9 — Caixa de entrada, atendimento e encaminhamento de lead — 13/08/2026

**Objetivo (FSD seções 6.5, 12.10, 13.7):** centralizar as respostas dos
clientes numa caixa de entrada única, interromper automações quando o
cliente responde, classificar a resposta (intenção de compra / dúvida) e
encaminhar o lead ao vendedor certo — última venda ou fila de rodízio.

### Decisões de design (ambiguidades do FSD resolvidas com o responsável do projeto)

- **Critério de "demonstra intenção de compra ou dúvida":** o FSD não define
  nenhum critério objetivo. Decisão: usar uma IA (DeepSeek) pra classificar
  a mensagem recebida em `purchase_intent | doubt | none`, em vez de uma
  lista de palavras-chave fixa no código.
- **Camada de abstração de IA** (`backend/app/integrations/ai/`, mesmo
  padrão arquitetural da mensageria): nenhum outro módulo importa o SDK/API
  do DeepSeek diretamente, tudo passa por `classifyLeadIntent({ messageBody
  })`. `ai.provider` em `settings.js` decide o provedor (só `deepseek` por
  enquanto).
- **Flag de ativação + fallback por palavra-chave (pedido do responsável,
  13/08):** o Administrador pode desativar a IA na tela de Configurações
  (`ai_deepseek_enabled`, default ativado) — quando desativada, a
  classificação usa exclusivamente as palavras-chave configuradas na mesma
  tela (`lead_intent_keywords`, sem valor padrão). Mesmo com a IA ativada,
  uma falha da chamada (rede, timeout, sem crédito etc.) cai automaticamente
  pra classificação por palavra-chave antes de desistir; se nem isso
  classificar, assume `purchase_intent` por segurança (fail-open — nunca
  perder um lead real por falha técnica). Ver
  `backend/app/services/lead-intent.service.js`.
- **Captura real de consentimento (pedido do responsável, 13/08):** não
  existia NENHUM fluxo real de opt-in no sistema até aqui (só o serviço,
  sem consumidor — `consent.service.js#optIn` nunca era chamado). Resolvido
  para a caixa de entrada: na primeira mensagem de um cliente (nenhuma linha
  em `consents` ainda), o sistema pergunta "Aceita receber novas mensagens
  nesta conversa?" e PARA — nada é mandado pro DeepSeek antes disso. A
  próxima mensagem é interpretada como resposta (palavra-chave simples,
  nunca IA: sim/aceito/quero/pode/claro/ok/certo/concordo → opt-in; não/n/
  negativo/nunca → opt-out; qualquer outra coisa fica pendente, pergunta não
  se repete). Isso resolve a captura de consentimento SÓ para quem inicia
  contato respondendo uma mensagem — capturar consentimento para o primeiro
  disparo automático (ex.: agradecimento pós-venda a um cliente que nunca
  respondeu nada) continua em aberto, fora do escopo desta parte.
- **Saudação por horário (pedido do responsável, 13/08):** troca de um "Olá"
  fixo nos templates por `{{saudacao}}`, variável sempre disponível em
  `rules-engine.service.js#renderTemplate` (Bom dia/Boa tarde/Boa noite,
  calculado no horário de Brasília explicitamente — o container roda em
  UTC). Template demo de agradecimento pós-venda atualizado para usá-la.
- **"Interrompe automação em andamento" (13.7, passo 2):** o FSD usa
  "automação" especificamente pra réguas de relacionamento — só mensagens
  `queued` com `trigger_source='automation'` são canceladas ao receber uma
  resposta (novo status `canceled` em `message_status`, migration 036;
  reaproveitar `failed` confundiria com falha real de envio no Log de
  Disparos). Campanhas manuais não são tocadas.
- **Vendedor da última venda:** só conta quando `sales.seller_id` não é
  nulo; sem venda anterior (ou sem vendedor vinculado), cai pra fila de
  rodízio — leitura literal do FSD, sem inventar fallback pra vendedor
  inativo.
- **Notificação ao vendedor:** alerta operacional interno, enviado via
  `whatsapp.sendText` diretamente (fora da fila de envio) — a fila existe
  pra proteger CLIENTES de spam (consentimento/cadência/janela), regras que
  não fazem sentido pra um aviso pontual a um vendedor da própria loja.
- **Resposta manual do Administrador:** enviada IMEDIATAMENTE (fora da fila,
  sem cadência/janela — faz sentido só pra disparo automático em volume),
  mas consentimento continua checado (`isCustomerEligibleForMessage`,
  contrato de `consent.service.js`, FSD 6.6 é categórico: "automática ou
  manual").

### Implementação

- `backend/app/database/migrations/036_add_canceled_message_status.js` —
  novo valor `canceled` em `message_status`.
- `backend/app/integrations/ai/index.js`, `.../providers/deepseek-provider.js`
  — camada de abstração de IA + provedor DeepSeek (HTTP `fetch` nativo,
  compatível com OpenAI Chat Completions, JSON mode, timeout 10s).
- `backend/app/services/lead-intent.service.js` — orquestra IA vs.
  palavra-chave, com fallback em cascata (ver decisões acima).
- `backend/app/services/automation-settings.service.js` — novas chaves
  `ai_deepseek_enabled`/`getAiDeepseekEnabled`/`setAiDeepseekEnabled` e
  `lead_intent_keywords`/`getLeadIntentKeywords`/`setLeadIntentKeywords`.
- `backend/app/controllers/settings.controller.js` (novo) + rotas
  `GET/PUT /settings/lead-intent-classification` (Admin-exclusivo) — tela de
  Configurações (FSD 12.13), primeira vez que essa tela existe no sistema.
- `frontend/src/views/Configuracoes/Configuracoes.jsx` (novo) — toggle IA +
  chips de palavras-chave (intenção de compra / dúvida).
- `backend/app/integrations/whatsapp/providers/whatsapp-web-provider.js` —
  `client.on('message', ...)` + `onMessageReceived(callback)` (ignora
  mensagens de grupo e as enviadas pela própria loja, já filtradas pela lib
  antes do evento `message`). **Bug real encontrado e corrigido nesta
  parte:** `sendText`/`sendImage`/`checkNumberStatus` checavam `initialized`
  (true assim que o navegador sobe) em vez de `connectionState.connected`
  (true só após o evento `ready`) — com sessão aguardando QR Code, uma
  chamada de envio passava pelo guard e travava indefinidamente em
  `client.getNumberId` (sem erro, sem timeout). Corrigido pra checar
  `connected` nos três lugares — agora falha rápido e com mensagem clara.
- `backend/app/services/customers.service.js` — `getCustomerByPhone`.
- `backend/app/services/sellers.service.js` — `assignRotation` (designa E
  avança a fila numa query atômica `FOR UPDATE SKIP LOCKED`, pra dois leads
  simultâneos não caírem no mesmo vendedor).
- `backend/app/services/conversations.service.js` — `setConversationStatus`.
- `backend/app/services/consent.service.js` — `markConsentRequested`
  (função nova, aditiva — não altera o contrato público protegido
  `isCustomerEligibleForMessage`/`processInboundOptOutKeyword`).
- `backend/app/services/rules-engine.service.js` — variável `{{saudacao}}`
  automática em `renderTemplate`.
- `backend/app/services/inbox.service.js` (novo) — `processInboundMessage`
  (fluxo completo: opt-out → interrompe automação → loga mensagem → marca
  `awaiting_human` → gate de consentimento → classificação → encaminhamento),
  `sendManualReply`, `listConversations`, `getConversationById`,
  `getConversationMessages`.
- `backend/app/controllers/inbox.controller.js` (novo) + rotas
  `GET /inbox/conversations`, `GET /inbox/conversations/:id`,
  `POST /inbox/conversations/:id/reply` (Admin-exclusivo).
- `backend/app/main.js` — `whatsapp.onMessageReceived(...)` conectado no
  boot, com `.catch()` próprio (o try/catch do provider só cobre erro
  síncrono, não a Promise do callback).
- `frontend/src/views/CaixaEntrada/CaixaEntrada.jsx` (novo) — lista de
  conversas (prioriza aguardando atendimento) + thread + resposta manual,
  rota `/caixa-entrada` e item de menu exclusivos do Administrador.

### Testes realizados

- `node -c` em todos os arquivos novos/alterados.
- Testes diretos contra o Postgres real (via `docker compose exec backend
  node -e`), com `whatsapp.sendText` mockado quando necessário pra nunca
  disparar mensagem real: `classifyLeadIntent` (IA real com chave do
  DeepSeek configurada pelo responsável, + fallback por palavra-chave, +
  fail-open), `assignRotation` (avança e cicla entre 3 vendedores reais,
  revertido depois), `processInboundMessage` (intenção de compra →
  rodízio; régua em andamento cancelada; venda anterior → último vendedor;
  opt-out não classifica; número desconhecido; gate de consentimento nos 5
  estados: primeiro contato, resposta ambígua, "sim", já consentido,
  "não"), `sendManualReply` (bloqueio sem consentimento, envio com
  consentimento, status da conversa muda pra `answered`).
- Teste real de UI (extensão Chrome, sessão autenticada): tela de
  Configurações (toggle + chips, salva e persiste após F5) e tela de Caixa
  de Entrada (lista, abre conversa, thread renderiza mensagens reais,
  bloqueio por falta de consentimento aparece corretamente, falha de envio
  real — sessão do WhatsApp ainda não pareada neste ambiente — aparece
  rápido e com mensagem clara após a correção do bug de `connected`).
- Todo dado de teste (clientes, vendedores, mensagens, consents,
  conversations, system_settings, e o `rotation_last_assigned_at` de
  vendedores reais tocado incidentalmente por testes de rodízio) foi
  limpo/revertido ao final de cada rodada.

### Pendências conhecidas (fora do escopo desta parte)

- Sessão do WhatsApp Web deste ambiente ainda não está pareada (aguardando
  QR Code) — nenhum envio real foi testado de ponta a ponta, só o caminho de
  falha (agora rápido, graças à correção do bug de `connected`).
- Captura de consentimento só cobre quem RESPONDE uma mensagem. Não resolve
  como conseguir opt-in pro primeiro disparo automático (ex.: agradecimento
  pós-venda) de um cliente que nunca escreveu nada — segue em aberto.
- `campaign_attribution_days`, `welcome_coupon_discount_percent` e outros
  parâmetros globais (FSD 20) continuam só leitura via SQL — a tela de
  Configurações agora existe (nova nesta Fase), mas só tem o campo de
  classificação de intenção; os demais parâmetros globais não foram
  migrados pra lá.

## Fase 8 — Parte 1: CRUD de Modelos de Mensagem (Templates) — 12/08/2026

A Fase 8 está sendo construída em 5 partes, com checkpoint de autorização do
responsável entre cada uma: (1) Templates, (2) Cupons, (3) Giftback,
(4) Cross-sell, (5) Campanhas. **Parte 1 concluída e testada.**

**Backend:**
- [x] Migration `032_add_missing_template_foreign_keys.js` — adiciona 2 FKs
  que faltavam desde a Fase 2: `message_templates.image_attachment_id` →
  `attachments` (SET NULL) e `automation_rules.message_template_id` →
  `message_templates` (RESTRICT — exclusão de template em uso por régua é
  bloqueada pelo banco). Executada com sucesso no banco local.
- [x] `templates.service.js` — CRUD completo + upload/substituição de imagem
  (arquivo salvo com nome gerado em `storage/attachments/`, nunca o nome
  original; anexo antigo preservado ao substituir, FSD seção 21) + resolução
  de imagem para download autenticado. Exclusão bloqueada se o template já
  foi usado em mensagem enviada (checagem explícita) ou por régua/campanha
  (FK RESTRICT).
- [x] `image-validation.util.js` — validação do tipo REAL do arquivo por
  magic bytes (JPEG/PNG/WEBP), sem depender da extensão informada (FSD 21).
- [x] `templates.controller.js` + rotas em `main.js` — leitura para todos,
  escrita/upload exclusivos do Admin (`requireAdmin`); upload via `multer`
  (memória, limite 5MB); download da imagem por rota autenticada.
- [x] `automation-rules.service.listActiveTemplates()` refatorado para
  reaproveitar `templates.service.js` (sem query duplicada).
- [x] **Imagem e link do template agora chegam na mensagem enviada** (achado
  da revisão do Codex): `rules-engine` anexa `link_url` ao corpo;
  `message-queue` resolve o anexo do template no envio e usa
  `whatsapp.sendImage` (com o texto como legenda) quando há imagem;
  provider corrigido de `MessageMedia.fromUrl` para `fromFilePath`
  (anexos são arquivos locais, nunca URL).
- [x] `backend/docker-entrypoint.sh` (novo) — resolve dois problemas de
  operação 24/7 em atualização de instalação existente: (a) reinstala
  `node_modules` automaticamente quando `package-lock.json` muda (o volume
  nomeado escondia dependências novas — backend caía com MODULE_NOT_FOUND
  após `docker compose up --build`); (b) remove locks órfãos do Chromium
  (`Singleton*`) do container anterior, que impediam o WhatsApp de
  reconectar após recreate. `docker-compose.yml` também ganhou `init: true`
  no backend (coleta de processos zumbis do Chromium).

**Frontend:**
- [x] `Templates.jsx` — listagem com prévia de imagem, filtro "mostrar
  inativos", criar/editar (variáveis como chips, link, upload com prévia),
  ativar/desativar, excluir com confirmação; campos de escrita só para
  Admin (Acesso Limitado vê aviso e não vê ações de edição).
- [x] Rota `/templates` em `App.jsx` + item "Modelos de Mensagem" no menu.
- [x] Proxy do Vite: prefixo `/templates` adicionado + correção geral de
  colisão rota-de-tela × prefixo-de-API (bypass por `Accept: text/html` —
  F5 em `/templates` ou `/tags` agora carrega o app, não o JSON da API).

**Testes executados:**
- [x] `node -c` em todos os arquivos novos/alterados; `vite build` completo.
- [x] Smoke tests: todas as rotas novas retornam 401 sem sessão.
- [x] Teste funcional real pelo navegador (sessão Admin): criar template,
  bloqueio de exclusão de template em uso ("Demo: Reativação", usado nas
  mensagens do teste da Fase 7), upload de imagem (PNG real detectado por
  conteúdo, arquivo em disco, `image_attachment_id` atualizado, download
  autenticado retornando 200 na listagem).
- [x] Entrypoint validado: rebuild com volume antigo detectou hash divergente
  e rodou `npm install` sozinho; locks do Chromium limpos no boot; WhatsApp
  reconectou sem intervenção manual após recreate.
- [ ] **Revisão externa (Codex CLI) pendente**: a primeira rodada apontou 3
  problemas (todos corrigidos acima); a rodada de confirmação não pôde
  rodar — cota de uso do Codex esgotada até ~10/09/2026. Retomar a revisão
  retroativa quando a cota voltar, antes de dar a Parte 1 por 100% fechada.

## Fase 8 — Parte 2: CRUD de Cupons — 12/08/2026

**Backend:**
- [x] Migration `033_add_missing_campaign_foreign_keys.js` — FKs previstas
  no FSD mas nunca criadas na migration 016: `campaigns.coupon_id` →
  `coupons` e `campaigns.giftback_rule_id` → `giftback_credits`, ambas
  RESTRICT (cupom/giftback associado a campanha não pode ser excluído).
  Executada com sucesso no banco local.
- [x] `coupons.service.js` — CRUD com: código único (salvo em maiúsculas,
  erro amigável em duplicidade — FSD 12.8/14.5); status EFETIVO calculado
  na leitura (cupom `active` com `valid_until` no passado é tratado como
  `expired` em listagem e filtros, sem job de virada de status — FSD 14.5);
  validações (percentual ≤ 100, valor > 0, validade final ≥ inicial);
  edição e exclusão bloqueadas para cupom já utilizado (registro histórico,
  FSD seção 10); exclusão de cupom em campanha bloqueada pela FK.
  Marcação de uso (resgate) NÃO faz parte deste CRUD — é a atribuição por
  período da Parte 5 (campanhas), FSD 14.5.
- [x] `coupons.controller.js` + rotas em `main.js` — leitura para todos,
  escrita exclusiva do Admin (`requireAdmin`); 409 para conflitos
  (duplicado, usado), 400 para validação.

**Frontend:**
- [x] `Cupons.jsx` — listagem (código, desconto, validade, status com cores,
  utilizado por/quando), filtros por status e busca por código,
  criar/editar/excluir (Admin), botões desabilitados para cupom utilizado.
- [x] Rota `/cupons` + item "Cupons" no menu + prefixo `/coupons` no proxy.

**Testes executados:**
- [x] `node -c` em tudo; migration 033 aplicada; `vite build` completo.
- [x] Smoke tests: rotas novas retornam 401 sem sessão.
- [x] 8 cenários de negócio testados no service contra o Postgres real:
  criação (uppercase), duplicado bloqueado, status efetivo `expired`,
  percentual >100 bloqueado, filtro por status efetivo, edição, bloqueio de
  edição/exclusão de cupom usado, nome do cliente no cupom usado.
- [x] Teste E2E pela interface (sessão Admin real): criar cupom pelo
  formulário → aparece na listagem com status Ativo.
- [ ] **Revisão externa (Codex CLI) pendente** — mesma cota esgotada da
  Parte 1 (retomar retroativamente para as Partes 1 e 2 quando voltar).

## Fase 8 — Parte 3: CRUD de Giftback/Cashback — 12/08/2026

**Backend:**
- [x] `giftback.service.js` — CRUD sobre `giftback_credits` (migration 019,
  sem migration nova — as FKs necessárias já vieram na 033): crédito
  concedido a um cliente específico, com percentual OU valor fixo
  (exatamente um dos dois — validação explícita), validade opcional;
  status EFETIVO calculado na leitura (available com `valid_until` no
  passado vira `expired` — mesmo padrão dos cupons, FSD 14.5); edição e
  exclusão bloqueadas para crédito já utilizado (FSD seção 10); exclusão
  de crédito associado a campanha bloqueada pela FK RESTRICT (033);
  cliente do crédito não é editável (cria-se outro crédito). Resgate
  (marcar como usado) é a atribuição por período da Parte 5.
- [x] `giftback.controller.js` + rotas `/giftbacks*` em `main.js` —
  leitura para todos, escrita exclusiva do Admin.

**Frontend:**
- [x] `Giftback.jsx` — listagem (cliente, crédito, validade, status),
  filtros por status e nome de cliente, criar/editar/excluir (Admin);
  seletor de cliente por Autocomplete com busca server-side
  (`GET /customers?search=`, mín. 2 letras), primeiro uso desse padrão.
- [x] Rota `/giftback` + item "Giftback / Cashback" no menu + prefixo
  `/giftbacks` no proxy do Vite.

**Testes executados:**
- [x] `node -c` em tudo; `vite build` completo; smoke tests 401.
- [x] 9 cenários de negócio no service contra o Postgres real: criação
  percentual, bloqueio de percentual+valor juntos, bloqueio de nenhum dos
  dois, percentual >100, cliente inexistente, status efetivo `expired` +
  filtro, edição trocando percentual por valor, bloqueio de edição/exclusão
  de usado, filtro por nome.
- [x] Teste E2E pela interface (sessão Admin real): criação de crédito
  usando o Autocomplete de cliente (busca server-side disparando e
  populando o dropdown) → aparece na listagem como Disponível.
- [ ] **Revisão externa (Codex CLI) pendente** — mesma cota esgotada
  (retroativa para as Partes 1, 2 e 3 quando voltar).

## Fase 8 — Parte 4: Cross-sell (produtos complementares) — 12/08/2026

**Decisão de design tomada nesta parte** (havia uma ambiguidade real no FSD,
discutida com o responsável antes de codar — ver histórico da sessão): a
tela de Cross-sell (12.9) NÃO tem campo de modelo de mensagem, mas
`rules-engine.attemptRuleExecution` exige `message_template_id` em toda
régua (renderiza sempre a partir de `message_templates.body_text` — nem a
régua de incentivo ao cadastro foge disso, o cupom só vira uma variável
`{{cupom}}` dentro do template escolhido pelo Admin). A saída adotada: a
régua de cross-sell é criada pela MESMA tela genérica de Réguas (12.5),
escolhendo o novo gatilho "Cross-sell" — sem criação automática/lazy de
linha em `automation_rules`. A tela de Cross-sell cuida só da relação
produto↔complemento e do percentual de desconto; sem uma régua ativa
configurada em 12.5, nenhuma oferta é enviada (mesmo padrão de "bloqueado
até configurar" do resto do sistema).

**Backend:**
- [x] Migration `034_add_cross_sell_trigger_type.js` — adiciona `'cross_sell'`
  ao enum `trigger_type`. `automation-rules.service.js` (`TRIGGER_TYPES`)
  atualizado para aceitar o novo valor na validação de régua.
- [x] `products.service.js` + `products.controller.js` (novo) — leitura
  apenas (`GET /products?search=&active=`), só para alimentar os seletores
  de produto/complemento da tela de Cross-sell; nenhuma tela de catálogo
  própria foi pedida.
- [x] `complementary-products.service.js` + `.controller.js` (novo) — CRUD
  sobre `complementary_products` (migration 011, já existia com todas as
  FKs). `source` só é gravado como `'manual'`: a "revisão de sugestões
  automáticas baseadas em histórico de vendas" citada no FSD 6.4 depende de
  um critério de "comprados juntos" (frequência, janela de tempo) que o FSD
  não define — mesmo tipo de parâmetro sem padrão já tratado em outras
  fases (ex.: `rfm_criteria`). Fica pendente de decisão para uma fase
  futura; o schema já suporta `'suggested'` quando isso acontecer.
- [x] `automation-settings.service.js` ganhou
  `getCrossSellDiscountPercent`/`setCrossSellDiscountPercent` (chave
  `cross_sell_discount_percent`, sem valor padrão no FSD) — diferente dos
  demais parâmetros deste arquivo, é editado diretamente na tela de
  Cross-sell (não em Configurações), por isso tem escrita própria aqui.
- [x] Rotas em `main.js` — leitura E escrita de `/complementary-products*`
  liberadas a Admin e Acesso Limitado (`requireAuth` sem `requireAdmin`,
  FSD linha 336 da matriz de permissões — diferente de Cupons/Giftback,
  que são escrita exclusiva do Admin).
- [x] `automation-trigger.service.js` ganhou `runCrossSellRules` (chamada
  dentro de `processNewSale`, para toda venda nova, não só a primeira):
  busca produtos complementares ativos para cada produto vendido, dedup por
  complemento (mesmo complemento não é ofertado duas vezes na mesma venda),
  e chama `rulesEngine.attemptRuleExecution` por régua ativa de gatilho
  `cross_sell`, com `triggerReference = cross-sell-{saleId}-{complementaryProductId}`
  (dedup entre execuções do job) e variáveis `{{nome}}`, `{{produto}}`,
  `{{complementar}}`, `{{desconto}}`.

**Frontend:**
- [x] `Reguas.jsx` — `cross_sell` adicionado a `TRIGGER_TYPE_LABELS` e
  `CREATABLE_TRIGGER_TYPES`; sem campos de condição extras (dispara para
  qualquer produto vendido com complemento ativo), com alerta explicando as
  variáveis disponíveis no modelo de mensagem.
- [x] `CrossSell.jsx` (novo) — percentual de desconto (editável, com aviso
  de "bloqueado até configurar" quando ausente); listagem de produtos
  complementares (produto, complemento, origem, status), criar (Autocomplete
  de produto/complemento com busca server-side em `GET /products`),
  ativar/desativar, excluir; aviso de que também é preciso uma régua ativa
  em Réguas de Relacionamento. Sem distinção Admin/Acesso Limitado (FSD
  linha 336 libera os dois perfis) — diferente de Giftback/Cupons/Templates.
- [x] Rota `/cross-sell` + item "Cross-sell" no menu + prefixos `/products`
  e `/complementary-products` no proxy do Vite.

**Testes executados:**
- [x] `node -c` em tudo; `vite build` (via HMR do container, já que o build
  local fora do Docker está bloqueado por um bug conhecido do npm/rollup
  neste Mac, não relacionado a esta mudança); smoke tests: rotas novas
  retornam 401 sem sessão.
- [x] Teste E2E completo pela interface (sessão Admin real): configurar
  percentual de desconto (10%) → cadastrar produto complementar (Tênis
  Esportivo Runner → Camiseta Dry Fit, via Autocomplete) → criar modelo de
  mensagem com as 4 variáveis → criar e ativar a régua "Cross-sell" em
  Réguas de Relacionamento. Validação de par duplicado testada na interface
  (bloqueada com mensagem clara). Toggle ativar/desativar testado.
- [x] Teste funcional do gatilho, direto contra o Postgres real (venda de
  demonstração existente, cliente com consentimento): `notifyNewSales`
  gerou a mensagem `"Oi Patrícia Nunes! Que tal aproveitar 10% de desconto
  em Camiseta Dry Fit, o combinado perfeito para o seu Tênis Esportivo
  Runner?"` (todas as 4 variáveis renderizadas corretamente), execução
  registrada em `automation_rule_executions` com status `sent`. Reexecutado
  com a mesma venda: nenhuma duplicata criada (dedup confirmado).
- [ ] **Revisão externa (Codex CLI) pendente** — mesma cota esgotada das
  Partes 1-3 (retomar retroativamente quando a cota voltar).

**Escopo explicitamente deixado de fora desta parte** (decisões de scoping,
não pendências esquecidas):
- Geração automática de sugestões de produto complementar a partir do
  histórico de vendas (`source = 'suggested'`) — falta critério de
  "comprados juntos" definido no FSD (ver decisão de design acima).
- Atribuição de uma venda futura a uma oferta de cross-sell para fins de
  relatório (FSD 13.4, passo 6) — não existe hoje tabela/coluna para isso;
  provavelmente cabe na Fase de relatórios/dashboards, junto com a
  atribuição por período já usada em campanhas.

## Fase 8 — Parte 5: Campanhas manuais — 12/08/2026 (Fase 8 concluída)

**Decisão de design tomada nesta parte** (ambiguidade real no schema,
discutida com o responsável antes de codar): `campaigns.giftback_rule_id`
é uma FK para uma única linha de `giftback_credits`, mas
`giftback_credits.customer_id` é `NOT NULL` — ou seja, seria o crédito de
UM cliente, não um template reaproveitável pelos N destinatários da
campanha (o próprio FSD, seção 11.2, comenta "conforme modelagem de
emissão em massa" ao lado dessa coluna, como uma nota de pendência). Saída
adotada: a campanha guarda os PARÂMETROS do crédito (percentual OU valor,
validade) em colunas novas (`giftback_credit_percent/value/valid_until`,
migration 035); no disparo, uma linha nova é criada em `giftback_credits`
POR destinatário elegível, usando a relação `giftback_credits.campaign_id`
que já existia desde a Parte 3 e nunca tinha sido usada.
`campaigns.giftback_rule_id` fica sem uso (não populada pela UI, sem
migration destrutiva).

**Escopo desta tela** (decisão de simplicidade, não ambiguidade): o
segmento de uma campanha é sempre um segmento SALVO (tela de Segmentação)
— sem construtor de filtro ad-hoc duplicado na tela de Campanhas. Quem
quiser uma campanha com um filtro específico ajusta/cria o segmento salvo
antes. Sem segmento selecionado, a campanha atinge todos os clientes (mesma
semântica de `buildCustomerFilterQuery({})`, sem condição = sem filtro).

**Backend:**
- [x] Migration `035_add_campaign_giftback_params.js` — 3 colunas novas em
  `campaigns` para os parâmetros de giftback em massa (ver decisão acima).
- [x] `campaigns.service.js` (novo) — CRUD de campanhas (rascunho/agendada
  editável e excluível; enviada/cancelada não); `previewRecipients` (conta
  candidatos totais vs. elegíveis com consentimento válido, em lote via
  JOIN em `consents`, para não fazer N+1 numa campanha com centenas de
  destinatários); `dispatchCampaign`/`sendCampaignNow`/`dispatchDueCampaigns`
  (disparo real: renderiza o modelo via `rulesEngine.renderTemplate`
  reaproveitado da Fase 7, enfileira cada mensagem via
  `messageQueueService.enqueueMessage` — mesma fila, mesmo consentimento,
  mesma cadência e janela de horário já validadas na Fase 6/7, nada
  duplicado aqui — e emite giftback em massa quando configurado);
  `getCampaignResults` (contagem de destinatários por status +
  vendas/receita atribuídas); `attributeSaleToCampaigns` (ver abaixo).
- [x] `message-queue.service.js` — `processQueueBatch` agora também espelha
  o resultado do envio real em `campaign_recipients.status`
  (pending → sent/failed), sem alterar nenhuma assinatura pública existente.
- [x] `giftback.service.js` — `createGiftback` ganhou parâmetro opcional
  `campaignId` (emissão em massa) + `validateGiftbackData` exportada
  (reaproveitada por `campaigns.service.js`, sem duplicar a validação).
- [x] `automation-settings.service.js` — `getCampaignAttributionDays`
  (chave `campaign_attribution_days`, período de atribuição de venda a
  campanha, FSD seção 20). Sem tela de Configurações ainda (não construída
  nesta fase) — mesmo gap já aceito para `welcome_coupon_discount_percent`:
  fica só leitura, sem padrão, "vendas atribuídas" aparece em branco até
  ser configurado via banco.
- [x] **Atribuição de venda por período fecha uma pendência real deixada
  pelas Partes 2 e 3**: os comentários de `coupons.service.js` e
  `giftback.service.js` já diziam explicitamente que "o fluxo que marca
  cupom/giftback como usado é a atribuição por período de campanha (Parte
  5)". Implementado como hook em `automation-trigger.service.js#processNewSale`
  (toda venda nova, não só a primeira) chamando
  `campaignsService.attributeSaleToCampaigns`: se o cliente foi
  destinatário efetivo (`status` sent/delivered/responded) de uma campanha
  enviada dentro do período configurado, marca o cupom da campanha (código
  único, primeira venda atribuída "resgata") e/ou o giftback individual
  desse cliente como usados, vinculando `used_in_sale_id`.
- [x] `campaigns.controller.js` + `campaigns.job.js` (job periódico a cada
  60s, dispara campanhas agendadas cuja hora chegou — mesmo padrão de
  `message-queue.job.js`) + rotas `/campaigns*` em `main.js`. Leitura E
  escrita liberadas a Admin e Acesso Limitado (FSD linha 332 da matriz).

**Frontend:**
- [x] `Campanhas.jsx` (novo) — listagem com filtro por status; criar/editar
  (nome, segmento salvo opcional com pré-visualização ao vivo de
  elegíveis/suprimidos, modelo de mensagem, cupom opcional, giftback em
  massa opcional com campos condicionais, agendamento opcional);
  "Enviar agora" com diálogo de confirmação mostrando a contagem real de
  destinatários ANTES de confirmar (FSD 13.6, passo 5 — bloqueado se zero
  elegíveis); cancelar; excluir; "Ver resultado" (destinatários por status
  + vendas/receita atribuídas, com aviso claro quando o período de
  atribuição ainda não foi configurado).
- [x] Rota `/campanhas` + item "Campanhas" no menu + prefixo `/campaigns`
  no proxy do Vite.

**Testes executados:**
- [x] `node -c` em tudo; smoke tests: rotas novas retornam 401 sem sessão.
- [x] Teste funcional completo direto contra o Postgres real (script
  Node dentro do container, sem mock): criar campanha com segmento
  ad-hoc, modelo, cupom e giftback em massa → `previewRecipients` (2 de 8
  elegíveis, 6 suprimidos por falta de consentimento — número batendo com
  a base de demonstração) → disparo → 2 mensagens enfileiradas com
  `{{nome}}`/`{{cupom}}` renderizados corretamente, 2 créditos de giftback
  criados (um por destinatário, `campaign_id` correto), `coupons.campaign_id`
  sincronizado. Processamento real da fila testado com **mock do provider
  de WhatsApp** (sem enviar mensagem de verdade) confirmando
  `campaign_recipients` avançando de `pending` para `sent`. Atribuição
  testada inserindo uma venda de teste para um destinatário dentro do
  período configurado: cupom marcado `used` com `used_in_sale_id` correto;
  giftback do destinatário certo marcado `used`, o do outro destinatário
  permaneceu `available` (não vazou entre clientes). Dados de teste
  (campanha, cupom, giftback, venda, mensagens) removidos depois.
- [x] **Cuidado de segurança durante o teste**: como a fila de mensagens já
  roda 24/7 no ambiente Docker validado, as mensagens de teste criadas
  ficariam reais na fila e seriam enviadas de verdade aos WhatsApp dos
  clientes de teste do responsável assim que a janela de horário abrisse —
  foram neutralizadas (`status = 'failed'`) imediatamente após cada teste,
  antes de prosseguir.
- [x] Teste E2E completo pela interface (sessão Admin real, via extensão do
  Chrome — o navegador embutido da sessão não completa OAuth do Google):
  criar campanha pelo formulário (modelo, cupom, giftback com campos
  condicionais aparecendo/desaparecendo corretamente), diálogo de "Enviar
  agora" mostrando a contagem real de elegíveis/suprimidos, excluir com
  confirmação — cupom voltou a `campaign_id = NULL` e `status = active`
  depois de excluir. Disparo real não foi confirmado na interface de
  propósito (mesmo cuidado de segurança acima); a lógica de disparo em si
  já tinha sido validada com mock no teste direto contra o Postgres.
- [ ] **Revisão externa (Codex CLI) pendente** — mesma cota esgotada das
  Partes 1-4 (retomar retroativamente quando a cota voltar).

**Escopo explicitamente deixado de fora desta parte:**
- Construtor de filtro ad-hoc dentro da tela de Campanhas (usa sempre um
  segmento salvo — ver decisão de escopo acima).
- Página de Configurações (12.11/12.13) para o parâmetro
  `campaign_attribution_days` — mesmo gap já aceito para
  `welcome_coupon_discount_percent` desde a Fase 7; fica pendente pra
  quando essa tela existir.

**Fase 8 concluída** (Templates, Cupons, Giftback, Cross-sell, Campanhas —
5 partes). Nenhuma delas tem o carimbo final do Codex (cota esgotada desde
a Parte 1) — recomenda-se uma revisão retroativa das 5 partes quando a cota
voltar, antes de considerar a Fase 8 100% fechada.

## Validação da Fase 7 em ambiente real (12/08/2026)

Primeira vez que o sistema rodou de ponta a ponta em ambiente real (Docker
Compose local, não mais sandbox de desenvolvimento com mocks). Resultado:
**réguas de relacionamento validadas com envio real de WhatsApp confirmado
pelo responsável** (régua de reativação/win-back, reenvio manual, 2
clientes de teste, mensagens recebidas de fato nos celulares).

**Bugs reais encontrados e corrigidos durante esta validação** (nenhum
detectável só com mocks — só apareceram rodando contra Docker/WhatsApp/
Postgres de verdade):

1. **Login com Google não aparecia** (`frontend/src/views/Login.jsx`) — race
   condition: o código tentava inicializar/renderizar o botão do Google
   Sign-In antes do script assíncrono terminar de carregar; como o efeito só
   rodava uma vez (array de dependências vazio), o botão nunca aparecia se
   o script ainda não estivesse pronto. Corrigido: o carregamento do script
   agora expõe um estado (`isLoaded`), e o efeito de inicialização depende
   dele.
2. **Proxy do Vite incompleto e com alvo errado** (`frontend/vite.config.js`,
   `docker-compose.yml`) — só existiam entradas de proxy para `/auth` e
   `/users` (Fase 3); nenhuma rota das Fases 4–7 (`/customers`, `/tags`,
   `/sellers`, `/segments`, `/consent`, `/messages`, `/sync`,
   `/automation-rules`, `/winback`) tinha sido adicionada, e o alvo do proxy
   estava fixo em `http://localhost:3000` (que dentro do container do
   frontend aponta pro próprio container, não pro backend). Sem essa
   correção, praticamente nenhuma tela pós-login funcionaria dentro do
   Docker. Corrigido: todos os prefixos adicionados, alvo configurável via
   `VITE_BACKEND_URL` (setado para `http://backend:3000` no
   `docker-compose.yml`; fora do Docker continua usando `localhost:3000`
   por padrão).
3. **Chromium do Puppeteer incompatível com Alpine + ARM** (`backend/Dockerfile`)
   — o Puppeteer baixa um binário Chromium x86_64 que não roda em containers
   Alpine (musl) em hosts ARM (Macs Apple Silicon); a tentativa de tradução
   via Rosetta falhava (`rosetta error: failed to open elf`). Corrigido:
   `Dockerfile` agora instala o Chromium nativo do Alpine via `apk` e aponta
   o Puppeteer pra ele (`PUPPETEER_SKIP_DOWNLOAD` +
   `PUPPETEER_EXECUTABLE_PATH`) — deve funcionar igual em produção (x86_64),
   já que o pacote é resolvido pra arquitetura de cada build, e também evita
   depender de `storage.googleapis.com` (rede restrita já causou falha aqui
   antes, ver `docs/ERROS.md`).
4. **Envio de mensagem via WhatsApp falhando com "No LID for user"**
   (`backend/app/integrations/whatsapp/providers/whatsapp-web-provider.js`)
   — `sendText`/`sendImage` montavam o id do chat só concatenando dígitos
   (`<numero>@c.us`) e mandavam direto pro `client.sendMessage`, sem
   resolver o número de verdade primeiro. Isso falha pra números que a
   sessão do WhatsApp ainda não conhece (sem contato/chat prévio) — o
   WhatsApp exige a resolução via `client.getNumberId()` antes (sistema
   "LID"), mesmo mecanismo que `checkNumberStatus` já usava corretamente
   desde a Fase 4, mas que nunca tinha sido aplicado ao envio de mensagem
   em si. Corrigido: nova função `resolveChatId()` compartilhada, usada por
   `sendText` e `sendImage`.

**Configuração de ambiente que também precisou ser feita nesta sessão**
(não são bugs, são pendências de setup que só apareceriam ao testar de
verdade):
- Credenciais reais do Google OAuth 2.0 geradas e configuradas
  (`backend/app/config/settings.js` + `frontend/.env`, ambos fora do Git).
- `system_settings.message_cadence` configurado manualmente via SQL
  (`{"intervalSeconds": 12, "dailyLimit": 50}`, valor de teste — o FSD não
  define um padrão, e o campo `dailyLimit` atual **não implementa um teto
  diário de verdade** (só limita o lote processado por execução do job,
  capado em 50 por segurança); isso e um "intervalo variado" pedido pelo
  responsável ficam registrados como pendência de melhoria pra Fase 8/Final,
  quando a tela de Configurações for construída.
- `system_settings.welcome_coupon_discount_percent` configurado via SQL
  (`{"percent": 10}`, valor real informado pelo responsável).
- Consentimento (LGPD) de 2 clientes de teste registrado manualmente via SQL
  (`opted_in_source: 'manual_test'`) — não existe nenhuma tela/rota ainda
  para registrar opt-in (só existe o serviço, sem consumidor; captura real
  de consentimento é prevista pra Fase 9).

**Pendência de ambiente ainda em aberto:** conexão com o banco do Uniplus
continua não configurada (`settings.js` com placeholders) — sincronização
real e réguas orientadas a evento (`sale_created`) ainda não puderam ser
testadas de ponta a ponta.

## Estado atual

Terreno preparado: estrutura inicial do projeto, arquivos vivos e plano de construção criados. Nenhuma funcionalidade de negócio foi implementada ainda — apenas infraestrutura.

Controle de versão configurado nesta etapa:
- Repositório Git local verificado, `.gitignore` revisado (adicionada regra para `*.tmp`/`*.temp`) e `.gitattributes` criado (normalização de fim de linha, tratamento de binários).
- Conferido que nenhum segredo real seria versionado: `backend/app/config/settings.js` (credenciais locais) segue fora do Git; apenas `settings.example.js` (placeholders) foi versionado.
- Primeiro commit criado com sucesso: `Estrutura inicial do projeto` (59 arquivos).
- Branch local renomeada para `main` (branch `master` anterior ficou como resíduo local inofensivo, removível com `git branch -d master`).
- Repositório remoto no GitHub criado e conectado: **https://github.com/royaltidev/CRM-Live** (conta `royaltidev`, público, autenticação via SSH). Push do histórico local (`main`) concluído com sucesso pelo responsável a partir do Terminal do computador dele.
- Observação de ambiente: este ambiente de sessão não permite excluir arquivos (`rm`), apenas renomear (`mv`) — isso causou travas do Git (`index.lock`) que precisaram ser contornadas; também não há acesso SSH de saída neste sandbox (só HTTPS), por isso o push precisou ser feito pelo responsável, fora desta sessão. Detalhes em `docs/ERROS.md` (registros de 07/08/2026).

Decisões técnicas tomadas nesta etapa (pontos que o `docs/FSD.md` deixava em aberto para a fase de codificação):
- Framework HTTP do backend: **Express**.
- Ferramenta de build do frontend: **Vite**.
- Sistema de módulos do backend: **CommonJS**.
- Roteamento do frontend: **React Router** (assumido por ser o padrão de fato para SPAs React; a pasta `frontend/src/routes/` já prevista no FSD pressupõe uma biblioteca de rotas).

## Fases (ver detalhamento completo em `docs/PLANO.md`)

| Fase | Descrição | Status |
| --- | --- | --- |
| 1 | Infraestrutura e base do projeto | ✅ Concluída |
| 2 | Banco de dados e persistência | ✅ Concluída |
| 3 | Autenticação, sessão, controle de acesso e gestão de usuários | ✅ Concluída |
| 4 | Integração com o Uniplus (sincronização) | ✅ Concluída |
| 5 | Cadastro/visão 360º do cliente + Segmentação | ✅ Concluída |
| 6 | Consentimento (LGPD) + camada de mensageria | ✅ Concluída |
| 7 | Réguas de relacionamento (automações) | ✅ Concluída |
| 8 | Campanhas, templates, cupons, giftback, uploads | ⏳ Não iniciada |
| 9 | Atendimento (caixa de entrada) e leads | ⏳ Não iniciada |
| 10 | Gestão de satisfação (NPS) | ⏳ Não iniciada |
| 11 | Relatórios, dashboards e exportações | ⏳ Não iniciada |
| Final | Itens transversais, segurança, qualidade, deploy | ⏳ Não iniciada |

## Checklist da Fase 7 (concluída em 10/08/2026)

Construída com o orquestrador implementando o motor central (para garantir
que todas as réguas compartilhem a mesma lógica de dedup/consentimento) e
3 subagentes em paralelo consumindo esse motor já pronto e testado (réguas
orientadas a tempo; réguas orientadas a evento + cupom de boas-vindas;
frontend + tela de elegíveis do win-back), seguidos de integração manual.

**Decisões tomadas com o responsável antes de codar (10/08/2026):**
- Templates de mensagem: como o CRUD completo é escopo da Fase 8 (ainda não
  construído), 2-3 templates de demonstração foram semeados em
  `seed-demo-data.js` para a tela de Réguas ficar demonstrável.
- Régua "aviso de volta ao estoque": **adiada**. Não existe tabela de
  interesse/wishlist no modelo de dados, e "interação" (chat) só existirá na
  Fase 9. O hook `notifyStockReplenished` (stub desde a Fase 4) permanece
  como stub.

**Motor central** (`backend/app/services/rules-engine.service.js`, construído e
testado pelo orquestrador antes de dividir o trabalho):
- [x] `getActiveRulesByTrigger(triggerType)` e `attemptRuleExecution({ ruleId, customerId, triggerReference, templateVariables, npsSaleId })` — dedup (checagem explícita + constraint UNIQUE como rede de segurança), consentimento (via `message-queue.service.enqueueMessage`, reaproveitado da Fase 6), renderização de template (`{{variavel}}`), criação/reuso de conversa, registro em `automation_rule_executions`, e gravação automática em `nps_responses` quando a régua é `nps_survey`.
- [x] `automation-rules.service.js` — CRUD de réguas + bloqueio de ativação sem `message_template_id` + leitura de templates ativos (sem CRUD de templates — Fase 8).
- [x] `automation-settings.service.js` — `nps_survey_delay_minutes` (padrão 30, semeado), `nps_low_score_threshold` (padrão 6, semeado), `welcome_coupon_discount_percent` (sem padrão — `pending_configuration`).
- [x] `conversations.service.js` — helper mínimo (`getOrCreateConversationForCustomer`), necessário porque `messages.conversation_id` é NOT NULL e nada criava conversas antes desta fase. Ciclo completo de atendimento é Fase 9.
- [x] Testado com harness offline (mock de `crmPool`): 7 cenários (envio feliz, deduplicação, sem consentimento, listagem de réguas ativas, criação de régua inativa, bloqueio de ativação sem template, rejeição de trigger_type inválido) — todos passaram.

**Réguas orientadas a tempo** (`time-based-rules.service.js` + `automation-rules.job.js`, a cada 5 min):
- [x] Aniversário — `trigger_reference` inclui o ano, garante no máximo 1 envio/cliente/ano.
- [x] Reativação (win-back) em cascata — dias por etapa configurados na própria régua (`conditions.days`, `cascadeStep`), NÃO em Configurações globais (é o padrão que a FSD define para esta régua especificamente). `trigger_reference` inclui `last_purchase_at`: uma nova compra fecha o ciclo automaticamente, sem tabela de estado separada.
- [x] Lembrete de recompra por ciclo de consumo — por produto específico (`conditions.productId`/`conditions.days`), mesmo mecanismo de fechamento de ciclo do win-back.
- [x] Pesquisa de satisfação (NPS) — atraso vem de `system_settings` (não da régua, conforme FSD 12.13); janela de segurança de 2 dias para não disparar uma avalanche de pesquisas para vendas antigas na primeira ativação.
- [x] `listWinbackEligibleCustomers({ruleId})` / `manualResendWinback({ruleId, customerId})` — usados pela tela de clientes elegíveis; reenvio manual sempre permitido (ignora o dedup do ciclo automático, mas passa pelo motor normalmente — ainda audita e respeita consentimento).
- [x] Testado com harness offline: 14 cenários (aniversário, win-back com/sem elegibilidade, NPS respeitando janela de atraso, ciclo de consumo, reenvio manual, job continuando após uma verificação falhar) — todos passaram.
- **Limitação conhecida:** win-back não tem corte superior de inatividade — um cliente inativo há anos é elegível para a etapa de 30 dias na primeira ativação da régua (o dedup por ciclo evita reenvio, mas a primeira varredura pode alcançar toda a base inativa de uma vez). Não é bug, é a semântica pedida pela FSD; se quiserem um teto (`conditions.maxDays`), é uma decisão de negócio a tomar depois.

**Réguas orientadas a evento** (`automation-trigger.service.notifyNewSales`, chamado pela sincronização — Fase 4):
- [x] Agradecimento pós-venda — diferencia primeira compra de recorrente via `conditions.isFirstPurchase` na régua (ausente = aplica a qualquer venda).
- [x] Incentivo ao cadastro (`first_identified_purchase`) — só na primeira compra identificada; gera cupom (`welcome-coupon.service.js`, código único prefixado `BEMVINDO-`, `discount_type='percent'`, `valid_until=NULL` — a FSD não define prazo de validade, então não foi inventado nenhum) só se o percentual estiver configurado; senão pula silenciosamente (`pending_configuration`).
- [x] Testado com harness offline: 13 cenários (primeira compra vs. recorrente, percentual pendente, colisão de código de cupom, venda sem cliente, erro isolado por venda) — todos passaram.
- **Limitação conhecida:** o cupom é gerado ANTES da checagem de deduplicação do motor. Como `sync.service.js` só chama este hook para vendas genuinamente novas (nunca reprocessa), o risco de cupom órfão é baixo na prática, mas existe em teoria se essa invariante for quebrada no futuro — vale revisitar se `automation-trigger.service.js` for reaproveitado em outro contexto.

**Frontend e integração:**
- [x] `Reguas.jsx` — CRUD com formulário de condições dinâmico por gatilho, filtros, toggle ativar/desativar com tratamento do bloqueio (409). Gatilho `stock_replenished` removido do seletor (régua adiada).
- [x] `ReguasWinbackElegiveis.jsx` — lista de elegíveis, filtro por dias mínimos, reenvio manual, link para a ficha do cliente.
- [x] `winback.controller.js` — `GET /winback/eligible`, `POST /winback/resend`.
- [x] Rotas registradas em `main.js`: `GET/POST/PATCH /automation-rules*`, `GET /winback/eligible`, `POST /winback/resend` (ordem correta: `/automation-rules/templates/active` antes de `/automation-rules/:id`).
- [x] `startAutomationRulesJob()` chamado no callback de `app.listen(...)`.
- [x] Menu lateral atualizado com "Réguas de Relacionamento"; rotas `/reguas` e `/reguas/winback/:ruleId` em `App.jsx`.
- [x] Migration `031_seed_default_automation_settings.js` — semeia `nps_survey_delay_minutes` (30) e `nps_low_score_threshold` (6), ambos com padrão definido no FSD. `welcome_coupon_discount_percent` intencionalmente NÃO semeado (sem padrão no FSD).

**Testes executados nesta sessão:**
- [x] `node -c` em todos os `.js` novos/alterados — sem erros.
- [x] Testes com mock de `crmPool`/serviços (sem PostgreSQL real, indisponível no sandbox): motor central (7 cenários), réguas de tempo (14 cenários), réguas de evento + cupom (13 cenários) — 34 cenários no total, todos passando.
- [x] `node app/main.js` rodando de verdade: servidor sobe, job de réguas inicia ("a cada 5 min"), as 4 verificações de tempo falham graciosamente por falta de banco real (esperado fora do Docker) sem derrubar o processo.
- [x] `curl`: `GET /health` → 200; todas as rotas novas sem sessão → 401.
- [x] `npx vite build` — build de produção completo, sem erros (947 módulos).
- [ ] **Não testado nesta sessão** (exige PostgreSQL real): execução de ponta a ponta do job contra dados reais, envio efetivo de mensagem via WhatsApp conectado, geração de cupom com percentual configurado.

## Checklist da Fase 4 (concluída em 10/08/2026)

Construída com 3 subagentes em paralelo (validação de WhatsApp; pipeline de
sincronização; painel de status), seguidos de integração manual (rotas,
menu, `main.js`, correções e testes).

**Mapeamento do schema real do Uniplus:** 12 tabelas de origem confirmadas
(`entidade`, `filial`, `hierarquia`, `produto`, `produtoean`, `saldoestoque`,
`dav`, `davitem`, `notafiscal`, `notafiscalitem`, `operacao_nfce_view`,
`item`) — ver `docs/uniplus-schema/01` a `05`. O documento `05-mapeamento-sincronizacao.md`
é a referência técnica completa (convenção de flags smallint, mapeamento
tabela a tabela, as três origens de venda, contrato de `checkNumberStatus`).

**Descoberta relevante durante a implementação:** vendas têm **três**
origens, não duas — `notafiscal`, `dav` (não faturada) e `operacao_nfce_view`
(PDV/balcão, com itens em `item`, não em `davitem`/`notafiscalitem`).
`sales.source_type` ganhou o valor `pdv_nfce` além de `dav`/`nota_fiscal`. O
vínculo de cliente/vendedor em `operacao_nfce_view` é por **código**
(`entidade.codigo`), não por id — diferente das outras duas origens.

**Correção aplicada após a implementação dos subagentes:** nem `notafiscal`
nem `dav` filtravam documentos cancelados/não aprovados (risco real de
inflar o faturamento sincronizado). Adicionado `cancelamento IS NULL` em
`notafiscal` e `aprovado <> 0 AND datacancelamento IS NULL` em `dav`,
aplicando a mesma convenção de flags já usada em outros filtros.

**Módulo Sincronização** (FSD 6.9, 13.10, 14.1):
- [x] `backend/app/integrations/uniplus/uniplus.repository.js` — só `SELECT` no `uniplusPool`; todas as colunas conferidas contra `04-colunas-confirmadas.md` (0 divergências, validado por script).
- [x] `backend/app/services/sync.service.js` — orquestra customers ← entidade, sellers ← entidade, products ← produto+hierarquia, stock_snapshots ← saldoestoque, sales+sale_items ← as três origens, validação de WhatsApp, agregados de cliente (`first_purchase_at`/`last_purchase_at`/`average_ticket`/`purchase_frequency_days`), `rfm.service.recalculateRfmForAllCustomers()`. Exporta `runSync({triggeredBy})` / `isSyncRunning()`.
- [x] `backend/app/jobs/uniplus-sync.job.js` — a cada `settings.uniplus.syncIntervalMinutes` (15 min), mesmo padrão de `message-queue.job.js` (sem sobreposição, nunca derruba o processo).
- [x] `backend/app/services/automation-trigger.service.js` — stub (`notifyNewSales`/`notifyStockReplenished`); motor real de réguas é a Fase 7.
- [x] Migration `030_add_source_type_to_sales.js` — `sales.source_type` (enum) + índice.
- [x] `checkNumberStatus(phoneE164)` na camada de mensageria (`whatsapp/index.js` + provider), via `client.getNumberId` — confirmado lendo o código-fonte real da lib, sem suposição.
- [x] `backend/app/services/sync-status.service.js` + `sync.controller.js` — `GET /sync/runs`, `POST /sync/run` (gatilho manual, 409 se já em andamento, 202 caso contrário).
- [x] Frontend `StatusSincronizacao.jsx` — última execução em destaque, histórico, botão "Sincronizar agora".

**Integração final:**
- [x] Rotas registradas em `main.js`: `GET /sync/runs`, `POST /sync/run`.
- [x] `startUniplusSyncJob()` chamado no callback de `app.listen(...)`.
- [x] Menu lateral (`AppLayout.jsx`) atualizado com "Sincronização Uniplus".
- [x] Rota de frontend (`/status-sincronizacao`) registrada em `App.jsx`.

**Testes executados nesta sessão:**
- [x] `node -c` em todos os `.js` novos/alterados — sem erros.
- [x] Validação de 114 referências de coluna nas queries do repositório contra `04-colunas-confirmadas.md` — 0 divergências.
- [x] Validação sintática de todo o SQL (estático + gerado em runtime) com o parser oficial do PostgreSQL (`pglast`) — sem erros.
- [x] Harness offline (mocks de `crmPool`/`uniplusPool`): `runSync()` testado em 4 cenários (sucesso, reentrância, Uniplus fora do ar, etapa falhando) — resultados corretos (`success`/`partial_error`/`failed`, sem exceção vazando).
- [x] `node app/main.js` rodando de verdade: servidor sobe, job de sincronização inicia ("a cada 15 minuto(s)"), falha de conexão com `db` (não resolve fora do Docker) é capturada graciosamente — processo não cai.
- [x] `curl`: `GET /health` → 200; `GET /sync/runs` e `POST /sync/run` sem sessão → 401 (ambos).
- [x] `npx vite build` — build de produção completo, sem erros.
- [ ] **Não testado nesta sessão** (exige PostgreSQL real, indisponível no sandbox — ver `docs/ERROS.md`): sincronização de ponta a ponta contra o banco real do Uniplus, migration 030 rodando de fato, RFM recalculado com dados reais.

**Suposições que precisam de validação no ambiente real antes de confiar cegamente:**
- Convenção de flags smallint (`0`=falso, `<>0`=verdadeiro) para `cliente`, `representante`, `inativo`, `aprovado`, `cancelado` — rodar `SELECT DISTINCT coluna, COUNT(*) ... GROUP BY 1` por tabela antes de operar em produção.
- `entidade.tipopessoa` (pessoa física/jurídica): valores desconhecidos — o código sempre usa `entidade.nome` (nunca `razaosocial`) até isso ser confirmado.
- `settings.uniplus.filialId` continua com placeholder `CHANGE_ME_uniplus_filial_id` — a etapa de estoque falha com mensagem clara enquanto não for preenchido com o id real da filial.
- `notafiscal.status` não é filtrado (só `cancelamento`) — valores possíveis não confirmados.
- Validação de WhatsApp limitada a 200 números por execução (evita sobrecarregar a sessão a cada 15 min); o restante valida nas execuções seguintes.

**Correção adicional (10/08/2026, após revisão da tarefa de validação de WhatsApp):** a primeira versão só tratava `Error('whatsapp_not_connected')` — qualquer outro erro em `checkNumberStatus` (ex.: número malformado, falha pontual do Puppeteer) abortava a validação da execução inteira. Como a consulta de pendentes é `ORDER BY id`, isso criaria um efeito "cabeça de fila travada": o mesmo registro problemático seria sempre o primeiro da fila e travaria a validação de todos os que vêm depois dele, em toda execução futura. Corrigido para tratar erro de candidato individualmente (conta em `whatsapp_candidate_errors`, aviso não-fatal) e seguir para o próximo candidato/cliente. Testado com dois cenários isolados (erro pontual seguido de candidato válido; propagação do erro sentinela `whatsapp_not_connected` continua interrompendo tudo, como esperado) — ambos passaram.

## Checklist da Fase 6 (concluída em 08/08/2026)

Construída com 2 subagentes em paralelo (Consentimento; Mensageria+Fila),
seguidos de integração manual (rotas, menu, main.js, testes).

**Decisão técnica confirmada pelo responsável:** biblioteca de automação do
WhatsApp Web = **`whatsapp-web.js`** (não Baileys) — decisão tomada em
08/08/2026 após comparação de trade-offs (Baileys é mais leve mas o
responsável teve problemas de estabilidade de conexão com ela em outro
projeto; `whatsapp-web.js` é mais pesada — usa Puppeteer/Chromium — mas mais
estável e documentada na experiência do responsável).

**Módulo Consentimento e LGPD** (FSD 6.6, 13.8, 14.2, tela 12.15):
- [x] `consent.service.js` — contrato público usado pela fila de envio: `getConsent`, `optIn`, `optOut`, `isCustomerEligibleForMessage` (true somente se opted_in=true E opted_out=false), `processInboundOptOutKeyword` (match exato pós-trim contra `OPT_OUT_KEYWORDS = ['SAIR','PARAR','CANCELAR','STOP']`, registra opt-out + evento de segurança `customer_opt_out`).
- [x] `consent-report.service.js` / `consent.controller.js` — `GET /consent/report`, com status calculado (opted_in / opted_out / never_contacted) via LEFT JOIN customers↔consents.
- [x] Frontend: `Consentimento.jsx` (filtro por status/período).
- [x] A função de processamento de opt-out por palavra-chave está pronta mas **ainda não é chamada por nenhum fluxo real de recebimento de mensagem** — isso só existirá quando a caixa de entrada (Fase 9) ou o listener de mensagens inbound do provider whatsapp-web.js for conectado a ela. Ponto de atenção registrado para a Fase 9.

**Módulo Mensageria e Fila de Envio** (FSD 9.11, 6.10, 14.3, 20):
- [x] `backend/app/integrations/whatsapp/index.js` — abstração única (`initialize`, `sendText`, `sendImage`, `getConnectionStatus`, `onSessionDown`), seleciona o provider por `settings.whatsapp.provider`.
- [x] `backend/app/integrations/whatsapp/providers/whatsapp-web-provider.js` — único arquivo do projeto que importa `whatsapp-web.js` diretamente; sessão persistida via `LocalAuth` em `settings.whatsapp.sessionStoragePath`; QR code de pareamento impresso no console (`qrcode-terminal`); evento `disconnected` gera `whatsapp_session_down` no log de segurança.
- [x] `message-queue.service.js` — `enqueueMessage` (checa consentimento na entrada, não insere nada em `messages` se recusado), `processQueueBatch` (checa consentimento de novo na saída, respeita janela de horário, limite mensal de 30 dias corridos, cadência configurável), `listMessages` (log de disparos paginado).
- [x] `backend/app/jobs/message-queue.job.js` — processa a fila a cada 60s; **fica pausado** (`status: 'pending_configuration'`) até o Administrador configurar `system_settings.message_cadence` — sem valor padrão assumido, mesmo padrão usado em `rfm.service.js` (Fase 5).
- [x] Migration `029_seed_default_message_settings.js` — semeia (idempotente) os dois parâmetros que TÊM padrão definido no FSD: `message_monthly_limit_per_customer` (20) e `message_send_window` (8h–18h). `message_cadence` é intencionalmente deixada sem valor.
- [x] `GET /messages` (log de disparos) + tela `LogDisparos.jsx`.
- [x] Nenhum outro módulo importa `whatsapp-web.js` diretamente (validado por inspeção — só o provider faz esse require).

**Integração final:**
- [x] Rotas registradas em `main.js`: `GET /consent/report`, `GET /messages`.
- [x] `whatsapp.initialize()` e `startMessageQueueJob()` chamados no callback de `app.listen(...)` — não bloqueiam o boot do servidor (erros de inicialização são capturados internamente pelos próprios módulos).
- [x] Menu lateral (`AppLayout.jsx`) atualizado com "Consentimento (LGPD)" e "Log de Disparos".
- [x] Novas rotas de frontend (`/consentimento`, `/log-disparos`) registradas em `App.jsx`.

**Testes executados nesta sessão:**
- [x] `node -c` em todos os `.js` novos/alterados — sem erros.
- [x] `npx vite build` — build de produção completo, sem erros (com o `dist/` antigo renomeado via `mv`, já que o sandbox não permite excluir arquivos — mesmo padrão registrado em `docs/ERROS.md` desde a Fase 1).
- [x] `npm install` no backend com as novas dependências (`whatsapp-web.js`, `qrcode-terminal`) — **o download do Chromium pelo Puppeteer falhou no sandbox** (rede restrita, HTTP 403 ao baixar o binário) — contornado com `PUPPETEER_SKIP_DOWNLOAD=true` só para validar que os módulos Node resolvem corretamente. **Isso não deve acontecer no ambiente Docker real do usuário**, que tem acesso de rede completo; ainda assim, vale conferir na primeira vez que rodar `docker compose up --build`.
- [x] `node app/main.js` rodando de verdade: servidor sobe normalmente; a falha de inicialização do WhatsApp (Chrome ausente no sandbox) e a falha de conexão com o banco (`db` não resolve fora do Docker) foram **ambas capturadas graciosamente** pelos try/catch internos — o processo não caiu em nenhum dos dois casos. Isso é um bom sinal de robustez para um sistema que roda 24/7 sem supervisão.
- [x] Testes end-to-end via `curl`: `GET /health` → 200; `GET /consent/report` e `GET /messages` sem sessão → 401.
- [x] Nomes de coluna de `consent-report.service.js` e `message-queue.service.js` conferidos contra as migrations reais (`consents`, `customers`, `messages`, `system_settings`) — nenhuma divergência.
- [ ] **Não testado nesta sessão:** conexão real com WhatsApp Web (exige Chromium instalado + escaneamento de QR Code com um celular de verdade — só é possível no ambiente Docker real do usuário) e fluxo completo de envio de mensagem com PostgreSQL real.

**Achado durante a integração (não é bug, é decisão registrada):** apareceu um arquivo `backend/app/integrations/uniplus/schema-explorer.js` no diretório do projeto — uma ferramenta somente-leitura para mapear tabelas/colunas do banco do Uniplus (útil para desbloquear a Fase 4), mas que **não foi criada por nenhum agente desta sessão** (nem consentimento, nem mensageria). Foi deixada de fora do commit da Fase 6 por não fazer parte do escopo pedido. Ainda está no diretório, sem versionamento — o responsável decide se quer mantê-la, descartá-la, ou pedir para versioná-la separadamente.

## Checklist da Fase 5 (concluída em 08/08/2026)

Construída com 3 subagentes em paralelo (Clientes/Tags, Segmentação/RFM, Vendedores),
seguidos de integração manual (rotas, menu, dados de demonstração, testes).

**Módulo Clientes e Tags** (FSD 6.1, telas 12.3 e 12.16):
- [x] `customers.service.js` / `customers.controller.js` — busca com filtros (nome, telefone, tag, RFM), paginação, ficha 360º, linha do tempo (vendas + mensagens unificadas), edição de campos complementares (nunca toca campos espelho do Uniplus), associação/remoção de tags.
- [x] `tags.service.js` / `tags.controller.js` — CRUD com tratamento amigável de nome duplicado e de tag em uso (bloqueio por integridade referencial).
- [x] Relatório de vendas sem cliente identificado, com filtro de período.
- [x] Frontend: `ClientesList`, `ClienteFicha` (abas Visão Geral/Histórico/Campos Complementares), `RelatorioVendasSemCliente`, `Tags`.

**Módulo Segmentação** (FSD 6.2, tela 12.4, seção 20):
- [x] `rfm.service.js` — critérios RFM configuráveis (`system_settings`, chave `rfm_criteria`), sem valor padrão; recálculo fica "pendente" até o Administrador configurar pela primeira vez; edição dos critérios é exclusiva do Administrador (`requireAdmin`), recálculo manual liberado a qualquer usuário autenticado (decisão temporária documentada — na Fase 4 isso passa a rodar automaticamente após cada sincronização).
- [x] `segments.service.js` / `segments.controller.js` — CRUD de segmentos dinâmicos + preview de clientes por filtro (categoria de produto, faixa de ticket médio, período da última compra, tags, segmento RFM). Filtro de bairro/cidade **não implementado**: a tabela `customers` não tem essas colunas no schema atual — não foi inventada coluna nova (limitação documentada em `segments.routes.md`).
- [x] Frontend: `Segmentacao.jsx` (lista + CRUD + preview), `CriteriosRfm.jsx` (edição admin-only via `useAuth().isAdmin`, somente leitura para Acesso Limitado).

**Módulo Vendedores** (FSD tela 12.11):
- [x] `sellers.service.js` / `sellers.controller.js` — CRUD, ativar/desativar, e `getNextInRotation()` (consulta de qual seria o próximo vendedor da fila de rodízio, sem efetivar designação — o motor que efetivamente encaminha leads é a Fase 9).
- [x] Frontend: `Vendedores.jsx` com destaque do próximo da fila.

**Integração final:**
- [x] Rotas registradas em `backend/app/main.js`, respeitando ordem de precedência do Express (rotas específicas como `/customers/reports/...`, `/segments/rfm/...` e `/sellers/rotation/next` registradas antes das rotas com `:id`).
- [x] Novo componente `frontend/src/components/AppLayout.jsx` — menu lateral fixo + cabeçalho com usuário/logout, compartilhado por todas as telas autenticadas via rotas aninhadas do React Router (`<Outlet />`). Substituiu o header duplicado que existia em `Dashboard.jsx`.
- [x] `Dashboard.jsx` reescrito com atalhos para os novos módulos.
- [x] Nova rota de frontend `AdminRoute` (além da `ProtectedRoute` já existente), usada em `/users`.
- [x] Script de dados de demonstração: `backend/app/database/seed-demo-data.js` — popula clientes, tags, vendedores, produtos, vendas e uma conversa de exemplo com o prefixo `DEMO-` (facilmente identificável e removível via `--clean`). Recusa-se a rodar com `NODE_ENV=production`. Não é parte do fluxo normal do sistema (o FSD proíbe cadastro manual de cliente pela interface) — é uma ferramenta de apoio à demonstração/desenvolvimento, executada manualmente.

**Testes executados nesta sessão:**
- [x] `node -c` em todos os arquivos `.js` novos/alterados do backend — sem erros de sintaxe.
- [x] `npm install` no backend e no frontend — **encontrado e corrigido 1 bug real:** `jsonwebtoken@^9.1.2` no `package.json` (Fase 3) apontava para uma versão inexistente; corrigido para `^9.0.2` (última versão publicada da major 9).
- [x] `npx vite build` no frontend — build de produção completo, sem erros (valida JSX, imports e resolução de módulos de todas as telas novas).
- [x] Backend iniciado com `node app/main.js` — sobe sem erros, nenhuma rota mal ordenada quebra o Express.
- [x] Testes end-to-end via `curl` com o servidor rodando: `GET /health` → 200 OK; `GET /customers`, `/sellers`, `/segments/rfm/criteria`, `/tags` sem sessão → 401 (middleware de autenticação protegendo corretamente as novas rotas).
- [x] Validação estática: nomes de colunas usados em todos os `services` novos conferidos um a um contra as migrations reais (customers, sellers, dynamic_segments, system_settings, sales, sale_items, products, messages, conversations, tags, customer_tags) — nenhuma divergência encontrada.
- [ ] **Não testado nesta sessão:** fluxo completo com PostgreSQL real (o sandbox não tem PostgreSQL disponível e não há acesso root para instalar). Recomenda-se ao responsável rodar localmente: `docker compose up --build`, depois `docker compose exec backend node app/database/migrate.js` e `docker compose exec backend node app/database/seed-demo-data.js` antes de demonstrar ao cliente.

## Checklist da Fase 3 (concluída em 07/08/2026)

- [x] Dependências de autenticação instaladas (jsonwebtoken, google-auth-library, cookie-parser).
- [x] Service de autenticação (auth.service.js) — valida token Google, cria/atualiza usuário, gera sessão.
- [x] Middleware de autenticação (auth.middleware.js) — valida JWT, sliding expiration.
- [x] Controller de autenticação (auth.controller.js) — rotas de login, callback, logout.
- [x] Controller de usuários (users.controller.js) — listar, desativar (exclusivo Admin).
- [x] Fluxo de login via Google OAuth 2.0:
  - Primeira conta criada vira Administrador
  - Demais contas ficam Acesso Limitado
- [x] Sessão via token JWT (12h com sliding expiration).
- [x] Proteção de rotas com middleware RBAC.
- [x] Log de segurança (`security_events`): login_success, login_failed, permission_denied, user_access_changed.
- [x] Frontend:
  - Tema customizado MUI conforme `docs/Design/design.md` ("Admin Logic")
  - Contexto de autenticação (AuthContext.jsx) + hook useAuth()
  - Tela de login com botão "Entrar com Google"
  - Tela de gestão de usuários (Users.jsx) — exclusiva do Admin
  - Tela de dashboard
  - Roteamento com proteção (ProtectedRoute)
- [x] Vite config com proxy para chamadas de API.
- [x] Validação de sintaxe Node.js concluída.

## Checklist da Fase 2 (concluída em 07/08/2026)

- [x] Driver PostgreSQL (`pg`) instalado em `backend/package.json`.
- [x] `backend/app/database/connection.js` — conexão com base própria do CRM Live.
- [x] Conexão somente leitura para o Uniplus configurada em `settings.example.js` (credenciais reais devem ser preenchidas em produção).
- [x] Estrutura de migrations em `backend/app/database/migrations/`.
- [x] Comando interno de execução de migrations: `node app/database/migrate.js` (executável via `docker compose exec backend`).
- [x] Tabela de controle `schema_migrations` criada automaticamente pelo script.
- [x] **28 migrations** de todas as tabelas descritas em `docs/FSD.md`, seção 11.2:
  - 001–003: Usuários, clientes, tags
  - 004–011: Associações, segmentos, vendedores, vendas, produtos, estoque, complementares
  - 012–015: Automações, templates, anexos
  - 016–019: Campanhas, cupons, giftback
  - 020–025: Consentimento, conversas, mensagens, leads, NPS
  - 026–028: Configurações, sincronizações, eventos de segurança
- [x] Índices, constraints e chaves estrangeiras com `ON DELETE RESTRICT` em tabelas de histórico (FSD 11.3).
- [x] Validação de sintaxe dos arquivos Node.js concluída.

## Checklist da Fase 1 (concluída em 07/08/2026)

- [x] Estrutura de diretórios conforme `docs/FSD.md`, seção 5.3.
- [x] `docker-compose.yml` com os três serviços (`db`, `backend`, `frontend`).
- [x] `backend/app/config/settings.example.js` (versionado, sem segredos).
- [x] `backend/app/config/settings.js` (local, placeholders de desenvolvimento, fora do Git).
- [x] `.gitignore` cobrindo `settings.js`, `node_modules/`, conteúdo de `storage/`.
- [x] Scaffold do backend (Express, `main.js` com health-check apenas).
- [x] Scaffold do frontend (Vite + React + MUI, tema "Admin Logic" aplicado).
- [x] Pastas internas isoladas (nenhuma rota estática aponta para elas — ainda não há rotas de negócio).
- [x] Arquivos de `docs/INSUMOS.md` marcados como "Sim"/"Provável sim" copiados para `frontend/public/` (favicons, `logo-oval.svg/png`, `icone.svg`).
- [x] `AGENTS.md` criado na raiz.
- [x] `docs/PLANO.md`, `docs/STATUS.md` e `docs/ERROS.md` criados.
- [x] Repositório Git inicializado e primeiro commit — **concluído em 07/08/2026**. A trava do Git que bloqueava o `git commit` na sessão anterior foi contornada (ver `docs/ERROS.md`); commit `Estrutura inicial do projeto` criado com sucesso, branch `main`.
- [x] Repositório remoto no GitHub criado e push realizado — **concluído em 07/08/2026**. Repositório: https://github.com/royaltidev/CRM-Live (público). Backup do projeto local completo no GitHub.

## Fase atual

**Fase 7 — Réguas de relacionamento (automações): concluída em 10/08/2026.**

## Próximo passo recomendado

Entre as fases não iniciadas, a próxima sequencial é a **Fase 8 — Campanhas, modelos de mensagem, cupons, giftback e uploads**:
- CRUD completo de modelos de mensagem (templates), incluindo upload de imagem — hoje só existem os templates de demonstração semeados na Fase 7
- CRUD de cupons e giftback/cashback
- Cross-sell (produtos complementares) e a régua/gatilho automático pós-compra
- Campanhas manuais (segmento + template + agendamento)

**Pendências que a Fase 8 herda da Fase 7:**
- Réguas hoje só podem usar os templates de demonstração (prefixo "Demo:") até o CRUD real existir.
- Régua "aviso de volta ao estoque" continua adiada (falta definição de "interesse" — provavelmente resolvida quando a Fase 9 trouxer interações reais).

**Antes de operar a Fase 7 em produção**, é necessário:
1. Rodar a migration `031_seed_default_automation_settings.js` no banco real.
2. Configurar `system_settings.welcome_coupon_discount_percent` se quiserem usar a régua de incentivo ao cadastro (sem padrão, fica bloqueada até configurar).
3. Criar/ativar as réguas desejadas pela tela (nenhuma vem pré-ativada).
4. Ter a sessão do WhatsApp conectada (Fase 6) e a sincronização rodando (Fase 4) para que as réguas tenham dado real para trabalhar.

**Antes de operar a Fase 4 em produção**, é necessário:
1. Rodar a migration `030_add_source_type_to_sales.js` no banco real (`node app/database/migrate.js`).
2. Preencher `settings.uniplus.filialId` com o id real da filial no Uniplus (placeholder `CHANGE_ME_uniplus_filial_id` atualmente).
3. Validar contra dados reais as suposições registradas no checklist da Fase 4 (convenção de flags smallint, `entidade.tipopessoa`).
4. Ter a sessão do WhatsApp conectada (Fase 6) para que a validação ativa de números funcione — sem sessão, a sincronização continua rodando normalmente, mas todos os telefones ficam `whatsapp_validated=false` até a sessão subir.

Entre as fases não iniciadas, a próxima pendente de decisão é a **Fase 7 — Réguas de relacionamento (automações)**:
- Motor de réguas (gatilho + condição + ação), com bloqueio de ativação sem modelo de mensagem associado
- Réguas específicas: agradecimento pós-venda, aniversário, lembrete de recompra, NPS, reativação (win-back) em cascata, aviso de volta ao estoque
- Régua `first_identified_purchase` (adiada da Fase 5 — ver checklist da Fase 5)
- Tela de clientes elegíveis por etapa do win-back

**Antes de configurar o WhatsApp em produção**, é necessário:
1. Rodar `docker compose up --build` no ambiente de produção (PC da loja) — lá o download do Chromium pelo Puppeteer deve funcionar normalmente (no sandbox desta sessão de desenvolvimento, a rede é restrita e isso falhou — ver `docs/ERROS.md`).
2. Escanear o QR Code impresso no console do backend com o WhatsApp do celular dedicado à loja (número diferente do principal de atendimento, conforme FSD seção 24).
3. Configurar `system_settings.message_cadence` (intervalo entre mensagens + limite diário) — a fila de envio fica pausada até isso ser feito, de propósito, para não assumir um valor arbitrário.

Antes de demonstrar as telas ao cliente, rode o script de dados de demonstração
(ver seção abaixo) para que as telas de Clientes e Segmentação não apareçam vazias.

## Como Popular o Banco com Dados de Demonstração (para apresentar ao cliente)

Como a sincronização real com o Uniplus (Fase 4) ainda está bloqueada, criamos um
script isolado que insere clientes, vendedores, tags, produtos e vendas fictícios
— todos com o prefixo `DEMO-` para ficarem claramente identificáveis:

```bash
docker compose exec backend node app/database/seed-demo-data.js
```

Para remover esses dados de demonstração depois (ex.: antes de ir para produção):

```bash
docker compose exec backend node app/database/seed-demo-data.js --clean
```

Esse script se recusa a rodar se `NODE_ENV=production`, como proteção extra.

## Configurações Necessárias Antes de Testar

**Google OAuth 2.0:**
1. Acesse https://console.cloud.google.com/
2. Crie um novo projeto
3. Ative Google Sign-In API
4. Crie credenciais OAuth 2.0 (Desktop e Web)
5. Adicione `http://localhost:3000/auth/google/callback` como Authorized Redirect URI
6. Copie `Client ID` e `Client Secret` para `backend/app/config/settings.js`
7. Use o `Client ID` em `frontend/.env` como `VITE_GOOGLE_CLIENT_ID`

**Secrets do Backend:**
```bash
# Gere um valor aleatório forte para session.secret:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copie o valor para `backend/app/config/settings.js` > `session.secret`

## Pendências que não bloqueiam a Fase 2, mas precisam ser resolvidas antes das fases indicadas

- **Uso das variantes de logomarca** ainda não confirmadas (`logo-oval-branca`, `logo-oval-monocromatica`, `avatar-1024.png`, `preview-branca-fundo-escuro.png`) — confirmar com o responsável antes de aplicá-las a alguma tela (relevante a partir da Fase 3, quando as primeiras telas reais forem construídas).
- **Estratégia de backup** da base de dados do CRM Live (RNF-07) — a definir antes da entrega em produção (Fase Final).
