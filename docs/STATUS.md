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
| 2 | Banco de dados e persistência | ⏳ Não iniciada |
| 3 | Autenticação, sessão, controle de acesso e gestão de usuários | ⏳ Não iniciada |
| 4 | Integração com o Uniplus (sincronização) | 🚫 Bloqueada (schema do Uniplus não mapeado) |
| 5 | Cadastro/visão 360º do cliente + Segmentação | ⏳ Não iniciada |
| 6 | Consentimento (LGPD) + camada de mensageria | ⏳ Não iniciada |
| 7 | Réguas de relacionamento (automações) | ⏳ Não iniciada |
| 8 | Campanhas, templates, cupons, giftback, uploads | ⏳ Não iniciada |
| 9 | Atendimento (caixa de entrada) e leads | ⏳ Não iniciada |
| 10 | Gestão de satisfação (NPS) | ⏳ Não iniciada |
| 11 | Relatórios, dashboards e exportações | ⏳ Não iniciada |
| Final | Itens transversais, segurança, qualidade, deploy | ⏳ Não iniciada |

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

**Fase 1 — Infraestrutura e base do projeto: concluída.**

## Próximo passo recomendado

Iniciar a **Fase 2 — Banco de dados e persistência**: driver PostgreSQL, conexão com a base própria do CRM Live, conexão somente leitura com o Uniplus (dados de conexão reais ainda pendentes de o responsável fornecer), estrutura de migrations e criação de todas as tabelas descritas em `docs/FSD.md`, seção 11. A Fase 2 **não** depende do mapeamento do schema do Uniplus (isso só bloqueia a Fase 4).

## Pendências que não bloqueiam a Fase 2, mas precisam ser resolvidas antes das fases indicadas

- **Mapeamento do schema do Uniplus** — bloqueia a Fase 4 (sincronização). Ver `docs/FSD.md`, seção 27.
- **Biblioteca de automação do WhatsApp Web** (`whatsapp-web.js` vs. Baileys) — decisão necessária antes da Fase 6.
- **Uso das variantes de logomarca** ainda não confirmadas (`logo-oval-branca`, `logo-oval-monocromatica`, `avatar-1024.png`, `preview-branca-fundo-escuro.png`) — confirmar com o responsável antes de aplicá-las a alguma tela (relevante a partir da Fase 3, quando as primeiras telas reais forem construídas).
- **Estratégia de backup** da base de dados do CRM Live (RNF-07) — a definir antes da entrega em produção (Fase Final).
