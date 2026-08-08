# Status do Projeto — CRM Live

**Última atualização:** 07/08/2026
**Atualizado por:** preparação inicial do terreno (Fase 1) + configuração de Git/GitHub

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
| 4 | Integração com o Uniplus (sincronização) | 🚫 Bloqueada (schema do Uniplus não mapeado) |
| 5 | Cadastro/visão 360º do cliente + Segmentação | ✅ Concluída |
| 6 | Consentimento (LGPD) + camada de mensageria | ✅ Concluída |
| 7 | Réguas de relacionamento (automações) | ⏳ Não iniciada |
| 8 | Campanhas, templates, cupons, giftback, uploads | ⏳ Não iniciada |
| 9 | Atendimento (caixa de entrada) e leads | ⏳ Não iniciada |
| 10 | Gestão de satisfação (NPS) | ⏳ Não iniciada |
| 11 | Relatórios, dashboards e exportações | ⏳ Não iniciada |
| Final | Itens transversais, segurança, qualidade, deploy | ⏳ Não iniciada |

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

**Fase 6 — Consentimento (LGPD) + Camada de mensageria e fila de envio: concluída em 08/08/2026.**

## Próximo passo recomendado

**Fase 4 permanece bloqueada** — precisa do mapeamento do schema real do banco do Uniplus. Não é a próxima fase sequencial, mas segue sem previsão até essa dependência ser resolvida.

Entre as fases não bloqueadas, a próxima é a **Fase 7 — Réguas de relacionamento (automações)**:
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

- **Mapeamento do schema do Uniplus** — bloqueia a Fase 4 (sincronização). Ver `docs/FSD.md`, seção 27.
- **Biblioteca de automação do WhatsApp Web** (`whatsapp-web.js` vs. Baileys) — decisão necessária antes da Fase 6.
- **Uso das variantes de logomarca** ainda não confirmadas (`logo-oval-branca`, `logo-oval-monocromatica`, `avatar-1024.png`, `preview-branca-fundo-escuro.png`) — confirmar com o responsável antes de aplicá-las a alguma tela (relevante a partir da Fase 3, quando as primeiras telas reais forem construídas).
- **Estratégia de backup** da base de dados do CRM Live (RNF-07) — a definir antes da entrega em produção (Fase Final).
