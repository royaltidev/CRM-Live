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
| 5 | Cadastro/visão 360º do cliente + Segmentação | ⏳ Não iniciada |
| 6 | Consentimento (LGPD) + camada de mensageria | ⏳ Não iniciada |
| 7 | Réguas de relacionamento (automações) | ⏳ Não iniciada |
| 8 | Campanhas, templates, cupons, giftback, uploads | ⏳ Não iniciada |
| 9 | Atendimento (caixa de entrada) e leads | ⏳ Não iniciada |
| 10 | Gestão de satisfação (NPS) | ⏳ Não iniciada |
| 11 | Relatórios, dashboards e exportações | ⏳ Não iniciada |
| Final | Itens transversais, segurança, qualidade, deploy | ⏳ Não iniciada |

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

**Fase 3 — Autenticação, sessão, controle de acesso e gestão de usuários: concluída em 07/08/2026.**

## Próximo passo recomendado

**Fase 4 está bloqueada** — precisa do mapeamento do schema real do banco do Uniplus.

Após receber esse mapeamento, iniciar a **Fase 4 — Integração com o Uniplus (sincronização)**:
- Job periódico que lê clientes, vendas, produtos e estoque do Uniplus (somente-leitura)
- Atualiza tabelas-espelho do CRM Live
- Recalcula RFM e atualiza segmentos dinâmicos
- Aciona automações para novas vendas
- Painel de status de sincronização

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
