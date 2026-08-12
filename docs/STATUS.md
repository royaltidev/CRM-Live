# Status do Projeto — CRM Live

**Última atualização:** 12/08/2026
**Atualizado por:** validação da Fase 7 em ambiente real (Docker local do responsável, Mac Apple Silicon)

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
