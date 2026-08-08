# Plano de Construção — CRM Live

Este plano organiza a implementação do CRM Live em fases incrementais, derivadas da "Organização Sugerida da Implementação" (`docs/FSD.md`, seção 25) e do Escopo Funcional (seção 6). Cada fase deve ser concluída, validada e registrada em `docs/STATUS.md` antes de iniciar a próxima, salvo indicação contrária do responsável do projeto.

Decisões técnicas tomadas durante a preparação do terreno (07/08/2026), para pontos que o FSD deixou em aberto para a fase de codificação:
- **Framework HTTP do backend:** Express.
- **Ferramenta de build do frontend:** Vite.
- **Biblioteca de automação do WhatsApp Web:** ainda não decidida (`whatsapp-web.js` vs. Baileys) — decisão adiada para a Fase 6, quando a camada de mensageria for implementada.
- **Sistema de módulos do backend:** CommonJS (`require`/`module.exports`), por ser o padrão mais simples e compatível com os exemplos citados no FSD (seção 5.5).

---

## Fase 1 — Infraestrutura e base do projeto

**Objetivo:** preparar o diretório do projeto, o controle de versão, a estrutura de pastas, o Docker Compose e a proteção das pastas internas, sem implementar nenhuma funcionalidade de negócio.

**Checklist:**
- [x] Estrutura de diretórios conforme FSD seção 5.3 (`backend/`, `frontend/`, `docs/`).
- [x] `docker-compose.yml` com os três serviços (backend, banco de dados, frontend).
- [x] `backend/app/config/settings.example.js` versionável, sem segredos reais.
- [x] `backend/app/config/settings.js` local, com placeholders de desenvolvimento, fora do controle de versão.
- [x] `.gitignore` cobrindo `settings.js`, `node_modules/`, `storage/logs/`, `storage/attachments/`.
- [x] Scaffold inicial do backend (Express, `main.js` de entrada, sem rotas de negócio).
- [x] Scaffold inicial do frontend (Vite + React + MUI, tema customizado a partir de `docs/Design/design.md`).
- [x] Pastas internas (`config/`, `models/`, `services/`, `database/migrations/`, `integrations/`, `jobs/`, `storage/logs/`, `storage/attachments/`) fora de qualquer rota estática.
- [x] Repositório Git inicializado, primeiro commit.

**Critérios de pronto:**
- `docker compose config` valida o `docker-compose.yml` sem erros.
- Estrutura de pastas corresponde exatamente à seção 5.3 do FSD.
- Nenhum segredo real está versionado (`settings.js` real ignorado pelo Git).
- `AGENTS.md`, `docs/STATUS.md` e `docs/ERROS.md` existem e estão preenchidos.

**Arquivos/pastas prováveis:** raiz do projeto, `docker-compose.yml`, `.gitignore`, `AGENTS.md`, `backend/`, `frontend/`.

**Observações de dependência:** nenhuma — é o ponto de partida do projeto.

---

## Fase 2 — Banco de dados e persistência

**Objetivo:** criar a conexão com o banco próprio do CRM Live, a conexão somente leitura com o Uniplus, a estrutura de migrations e todas as tabelas do modelo de dados (FSD seção 11).

**Checklist:**
- [ ] Driver de acesso ao PostgreSQL instalado no backend (ex.: `pg`).
- [ ] `backend/app/database/connection.js` — conexão com a base própria do CRM Live.
- [ ] Conexão somente leitura configurada para o banco do Uniplus (usuário de banco dedicado, sem permissão de escrita).
- [ ] Estrutura de migrations em `backend/app/database/migrations/`.
- [ ] Tabela de controle `schema_migrations`.
- [ ] Comando interno de execução de migrations (ex.: `node app/database/migrate.js`, executado via `docker compose exec backend`).
- [ ] Migrations de todas as tabelas da seção 11.2: `users`, `customers`, `customer_tags`, `tags`, `dynamic_segments`, `sellers`, `sales`, `sale_items`, `products`, `stock_snapshots`, `complementary_products`, `automation_rules`, `automation_rule_executions`, `message_templates`, `attachments`, `campaigns`, `campaign_recipients`, `coupons`, `giftback_credits`, `consents`, `conversations`, `messages`, `lead_forwards`, `nps_responses`, `nps_treatments`, `system_settings`, `sync_runs`, `security_events`.
- [ ] Índices, constraints (unicidade, `NOT NULL`, enums) e chaves estrangeiras com `ON DELETE RESTRICT` em tabelas de histórico, conforme seção 11.3.

**Critérios de pronto:**
- Rodar o comando de migrations cria toda a estrutura sem erro, em um banco vazio.
- Rodar o comando de migrations uma segunda vez não duplica nada (idempotente via `schema_migrations`).
- Nenhuma rota HTTP executa migrations.
- Tabelas-espelho (`customers`, `sales`, `sale_items`, `products`, `stock_snapshots`) existem, mas nenhuma rota de escrita comum as altera ainda (isso só ocorre na Fase 4).

**Arquivos/pastas prováveis:** `backend/app/database/`, `backend/package.json` (nova dependência `pg`).

**Observações de dependência:** depende da Fase 1 (estrutura e Docker Compose). Não depende do mapeamento do schema do Uniplus (pendência da seção 27) — as migrations criam apenas a estrutura própria do CRM Live.

---

## Fase 3 — Autenticação, sessão, controle de acesso e gestão de usuários

**Objetivo:** implementar login via Google (OAuth 2.0), sessão, RBAC nos dois perfis (Administrador/Acesso limitado) e a tela de gestão de usuários do CRM Live.

**Checklist:**
- [ ] Fluxo de login "Entrar com Google" (FSD seção 13.1).
- [ ] Regra de primeiro-acesso-vira-administrador (`users.role`).
- [ ] Sessão via token assinado, cookie `httpOnly`/`secure`, expiração de 12h com sliding expiration.
- [ ] Middleware de proteção de rotas (401 sem sessão válida).
- [ ] Middleware de RBAC nos Controllers (403 + evento `permission_denied` para ação sem permissão).
- [ ] Log de segurança (`security_events`): `login_success`, `login_failed`, `permission_denied`, `user_access_changed`.
- [ ] Configurações globais — estrutura de leitura/escrita de `system_settings` (sem telas de negócio específicas ainda).
- [ ] Tela de login (frontend).
- [ ] Tela de Gestão de usuários do CRM Live (listar, desativar acesso) — exclusiva do Administrador.

**Critérios de pronto:**
- Primeira conta Google autenticada em ambiente limpo vira `admin`; a segunda conta vira `limited`.
- Chamada direta à API tentando ação exclusiva do Administrador, feita por usuário `limited`, é recusada com 403 e gera evento em `security_events`.
- Usuário desativado não consegue gerar nova sessão.

**Arquivos/pastas prováveis:** `backend/app/controllers/auth*`, `backend/app/controllers/users*`, `backend/app/services/auth/`, `backend/app/models/`, `frontend/src/views/Login`, `frontend/src/views/Usuarios`.

**Observações de dependência:** depende da Fase 2 (tabelas `users` e `security_events` precisam existir).

---

## Fase 4 — Integração com o Uniplus (sincronização) ⚠️ BLOQUEADA

**Objetivo:** sincronizar clientes, vendas, produtos e estoque do Uniplus para as tabelas-espelho do CRM Live, somente leitura, com painel de status.

**Checklist:**
- [ ] Job de sincronização periódica (polling parametrizável).
- [ ] Mapeamento de campos do schema real do Uniplus para as tabelas-espelho (`customers`, `sales`, `sale_items`, `products`, `stock_snapshots`).
- [ ] Registro de execução em `sync_runs` (registros importados por entidade, erros).
- [ ] Recalculo de RFM e atualização de segmentos dinâmicos após cada sincronização.
- [ ] Disparo de automações relacionadas a novas vendas e mudanças de estoque.
- [ ] Painel de status de sincronização (frontend, tela 12.14).

**Critérios de pronto:**
- Sincronização roda sem escrever em nenhuma tabela do banco do Uniplus.
- Painel de status exibe última execução, registros importados e erros.
- Nova venda sincronizada aciona a régua de agradecimento (validado já na Fase 7, mas o gatilho precisa existir aqui).

**Arquivos/pastas prováveis:** `backend/app/jobs/sync*`, `backend/app/integrations/uniplus/`, `frontend/src/views/StatusSincronizacao`.

**Observações de dependência:** **bloqueada pela pendência registrada no FSD seção 27** — o mapeamento do schema real do banco do Uniplus ainda não foi levantado (o repositório `https://github.com/lifangbiz/dbskill` foi confirmado como não sendo essa fonte). Esta fase não deve ser iniciada antes de esse mapeamento ser obtido do responsável do projeto. As fases 1–3 não dependem deste ponto.

---

## Fase 5 — Cadastro e visão 360º do cliente + Segmentação

**Objetivo:** implementar os módulos 6.1 (ficha do cliente) e 6.2 (segmentação RFM e dinâmica).

**Checklist:**
- [x] Lista de clientes com busca e filtros (segmento, tag, RFM).
- [x] Ficha 360º do cliente (dados cadastrais, histórico, ticket médio, frequência, linha do tempo).
- [x] Edição de campos complementares (aniversário, preferências, tags, canal preferido).
- [x] Relatório de vendas sem cliente identificado (tela 12.16).
- [ ] Régua `first_identified_purchase` (incentivo ao cadastro — cupom + mensagem). **Adiada para a Fase 7** (motor de réguas ainda não existe; implementar o CRUD isolado agora duplicaria trabalho quando a Fase 7 construir o motor de execução de réguas).
- [x] Classificação RFM configurável (critérios em `system_settings`, sem valor padrão).
- [x] Segmentos dinâmicos: criar/editar/salvar com filtros combináveis.
- [x] Cadastro/edição de vendedores e fila de rodízio (tela 12.11) — CRUD e consulta da posição da fila prontos; o motor que efetivamente encaminha leads pela fila é a Fase 9.
- [x] Tags (CRUD simples).

**Critérios de pronto:**
- Busca e filtros de clientes funcionam sobre dados sincronizados. ✅ (validado com dados de demonstração — ver seção de seed abaixo; dados reais chegam na Fase 4)
- Segmento dinâmico salvo reflete corretamente os critérios aplicados. ✅
- RFM fica bloqueado/pendente até o Administrador definir os critérios pela primeira vez (sem valor padrão assumido). ✅ (`POST /segments/rfm/recalculate` retorna `status: 'pending_configuration'` enquanto não houver critério salvo)

**Concluída em 08/08/2026.** Ver checklist detalhado e decisões de implementação em `docs/STATUS.md`.

**Arquivos/pastas prováveis:** `backend/app/controllers/customers*`, `segments*`, `sellers*`, `tags*`; `frontend/src/views/Clientes`, `Segmentacao`, `Vendedores`.

**Observações de dependência:** depende de dados sincronizados (Fase 4) para ter conteúdo real, mas as telas, CRUDs de campos complementares e a estrutura de segmentação podem ser construídos e testados com dados de exemplo antes da Fase 4 estar liberada.

---

## Fase 6 — Consentimento (LGPD) + Camada de mensageria e fila de envio

**Objetivo:** implementar o módulo 6.6 (consentimento/opt-in/opt-out), a camada de abstração de mensageria (seção 9.11) e a fila de envio com controle de cadência (módulo 6.10).

**Checklist:**
- [ ] Modelo de consentimento (`consents`) e regra de bloqueio de envio sem `opted_in`/com `opted_out`.
- [ ] Fluxo de opt-out por palavra-chave (ex.: "SAIR") com evento `customer_opt_out`.
- [ ] Decisão final: `whatsapp-web.js` ou Baileys.
- [ ] Camada de abstração `integrations/whatsapp/` (interface genérica: enviar texto, enviar com imagem, verificar status).
- [ ] Provedor `whatsapp_web` implementado atrás da interface.
- [ ] Fila de envio com controle de cadência, limite diário, limite de 20 mensagens/cliente/mês e janela de horário (8h–18h).
- [ ] Reenfileiramento de mensagens geradas fora da janela permitida.
- [ ] Log de disparos (`messages`) e alerta de sessão do WhatsApp caída (`whatsapp_session_down`).
- [ ] Relatório de consentimento (tela 12.15).

**Critérios de pronto:**
- Nenhuma mensagem é enviada a cliente sem consentimento válido ou na lista de supressão — testável de forma automatizada.
- Nenhuma régua, campanha ou funcionalidade de atendimento referencia diretamente a biblioteca de automação do WhatsApp (apenas a camada de abstração).
- Mensagens fora da janela de horário ficam enfileiradas, não descartadas.

**Arquivos/pastas prováveis:** `backend/app/integrations/whatsapp/`, `backend/app/jobs/message-queue*`, `backend/app/services/consent/`, `frontend/src/views/Consentimento`.

**Observações de dependência:** depende da Fase 3 (RBAC) e da Fase 2 (tabelas `consents`, `messages`). É pré-requisito de todas as fases seguintes que enviam mensagem (7, 8, 9, 10).

---

## Fase 7 — Réguas de relacionamento (automações)

**Objetivo:** implementar o módulo 6.3 — motor de réguas e cada régua específica.

**Checklist:**
- [ ] CRUD de réguas (gatilho + condição + ação), tela 12.5.
- [ ] Bloqueio de ativação sem modelo de mensagem associado.
- [ ] Constraint/verificação de não duplicidade (`automation_rule_executions`).
- [ ] Régua de agradecimento pós-venda (primeira compra vs. recorrente).
- [ ] Régua de aniversário com oferta opcional.
- [ ] Régua de lembrete de recompra por ciclo de consumo.
- [ ] Régua de NPS (disparo 30 min após compra, prazo parametrizável).
- [ ] Régua de reativação (win-back) em cascata, com encerramento automático ao voltar a comprar.
- [ ] Tela de clientes elegíveis por etapa do win-back, com filtro por tempo sem comprar e reenvio manual.
- [ ] Régua de aviso de volta ao estoque.

**Critérios de pronto:**
- Nenhuma régua gera envio duplicado para o mesmo evento.
- Régua de reativação para automaticamente quando o cliente compra novamente.
- Todas as réguas passam pela verificação de consentimento antes de enviar (Fase 6).

**Arquivos/pastas prováveis:** `backend/app/services/automation-rules/`, `backend/app/jobs/rules*`, `frontend/src/views/Reguas`.

**Observações de dependência:** depende da Fase 6 (mensageria/consentimento) e da Fase 4 (dados de venda/estoque sincronizados) para funcionar de ponta a ponta; a modelagem e o CRUD de réguas podem avançar em paralelo à Fase 4.

---

## Fase 8 — Campanhas, modelos de mensagem, cupons, giftback e uploads

**Objetivo:** implementar o módulo 6.4 — campanhas manuais, templates, cupons, giftback/cashback e cross-sell.

**Checklist:**
- [ ] CRUD de modelos de mensagem (templates) — exclusivo do Administrador para criar/editar.
- [ ] Upload de imagem em template (validação de tipo real do arquivo, limite de 5MB, rota de download autenticada).
- [ ] CRUD de cupons (código único, tipo/valor de desconto, validade) — exclusivo do Administrador.
- [ ] CRUD de giftback/cashback — exclusivo do Administrador.
- [ ] Configuração de produtos complementares (cross-sell), manual ou sugerida, com percentual de desconto próprio (tela 12.9).
- [ ] Régua/gatilho de cross-sell pós-compra automático.
- [ ] Criação de campanha manual (segmento + template + agendamento + cupom/giftback opcional).
- [ ] Validação de destinatários elegíveis (remoção automática de quem não tem consentimento) antes da confirmação.
- [ ] Atribuição de venda a campanha por critério de período (parametrizável).
- [ ] Resultado por campanha (enviadas, entregues, respondidas, vendas atribuídas, receita).

**Critérios de pronto:**
- Campanha não pode ser confirmada sem ao menos um destinatário elegível.
- Cupom duplicado é bloqueado; cupom vencido não aparece como disponível.
- Upload de arquivo que não é realmente uma imagem do tipo permitido é rejeitado mesmo com extensão correta.

**Arquivos/pastas prováveis:** `backend/app/controllers/campaigns*`, `templates*`, `coupons*`, `giftback*`, `cross-sell*`; `backend/app/storage/attachments/`; `frontend/src/views/Campanhas`, `Templates`, `Cupons`, `CrossSell`.

**Observações de dependência:** depende da Fase 6 (mensageria/consentimento) e da Fase 5 (segmentação). O cross-sell automático também depende da Fase 4 (detecção de nova venda).

---

## Fase 9 — Atendimento (caixa de entrada) e encaminhamento de leads

**Objetivo:** implementar o módulo 6.5 — caixa de entrada, interrupção de automações e roteamento de leads.

**Checklist:**
- [ ] Caixa de entrada (lista de conversas, priorizando aguardando atendimento) — exclusiva do Administrador.
- [ ] Resposta manual ao cliente pelo CRM Live.
- [ ] Interrupção automática de automações em curso ao detectar resposta do cliente.
- [ ] Detecção de intenção de compra/dúvida para acionar encaminhamento.
- [ ] Roteamento: vendedor da última venda (via Uniplus) ou próximo da fila de rodízio.
- [ ] Avanço da fila de rodízio apenas quando efetivamente usada.
- [ ] Envio de notificação ao vendedor via WhatsApp (camada de mensageria).

**Critérios de pronto:**
- Toda resposta de cliente interrompe automações antes de qualquer outra ação.
- Fila de rodízio avança apenas nos casos sem venda anterior.
- Encaminhamento sem vendedor ativo cadastrado não quebra o fluxo (fica só na caixa de entrada).

**Arquivos/pastas prováveis:** `backend/app/controllers/inbox*`, `backend/app/services/lead-routing/`, `frontend/src/views/CaixaEntrada`.

**Observações de dependência:** depende da Fase 6 (mensageria) e da Fase 5 (cadastro de vendedores/fila de rodízio).

---

## Fase 10 — Gestão de satisfação (NPS)

**Objetivo:** implementar o módulo 6.8 — pesquisa de satisfação, alerta de nota baixa e ações de tratamento.

**Checklist:**
- [ ] Registro de resposta de NPS (`nps_responses`).
- [ ] Alerta imediato ao Administrador para nota ≤ limite configurável (padrão 6).
- [ ] Tela de gestão de NPS (agrupado por faixa, filtros por período/vendedor/categoria).
- [ ] Ações sobre nota: enviar mensagem padronizada, oferecer desconto/voucher, localizar vendedor responsável.
- [ ] Histórico de tratamento (`nps_treatments`), estrutura extensível para novas ações futuras.

**Critérios de pronto:**
- Toda nota ≤ limite gera alerta imediato.
- Nota só é considerada tratada com ao menos um registro em `nps_treatments`.

**Arquivos/pastas prováveis:** `backend/app/controllers/nps*`, `frontend/src/views/NPS`.

**Observações de dependência:** depende da régua de NPS (Fase 7) e da camada de mensageria (Fase 6).

---

## Fase 11 — Relatórios, dashboards e exportações

**Objetivo:** implementar o módulo 6.7 e a seção 22 — dashboard geral, desempenho de campanha e exportações CSV/PDF.

**Checklist:**
- [ ] Dashboard geral (taxa de recompra, ticket médio, frequência, ativos x inativos, NPS médio).
- [ ] Desempenho por campanha.
- [ ] Exportação CSV (todos os relatórios da seção 22) respeitando filtros e permissões da tela de origem.
- [ ] Exportação PDF (dashboard geral e desempenho de campanha) — biblioteca de geração de PDF no backend.
- [ ] Índices de banco revisados para as consultas de maior volume (log de disparos, NPS, vendas por período).

**Critérios de pronto:**
- Toda exportação reflete exatamente os mesmos dados e permissões da tela de origem.
- Indicadores do dashboard batem com os dados brutos das telas de origem.

**Arquivos/pastas prováveis:** `backend/app/controllers/reports*`, `backend/app/services/export/`, `frontend/src/views/Dashboard`.

**Observações de dependência:** depende de praticamente todas as fases anteriores (consolida dados de vendas, campanhas, consentimento e NPS).

---

## Fase Final — Itens transversais, revisão e preparação da entrega

**Objetivo:** fechar os itens 23 a 26 da seção 25 do FSD — robustez operacional, segurança, qualidade e preparação para produção.

**Checklist:**
- [ ] Log de contingência técnica em arquivo (`backend/app/storage/logs/`), para exceções não tratadas e falhas de jobs.
- [ ] Checklist de segurança da seção 24 revisado (pastas internas não expostas, RBAC validado no backend, lista de supressão respeitada em 100% dos pontos de envio, usuário do Uniplus realmente somente leitura).
- [ ] Revisão de qualidade (validações, mensagens de erro, estados de tela vazio/carregando/sem permissão).
- [ ] Processo de instalação no PC Windows da loja (Docker Desktop, inicialização automática dos containers).
- [ ] Estratégia de backup da base de dados do CRM Live (pendência RNF-07, seção 27).
- [ ] Revisão da pendência de log de erros formal (seção 27) — decidir com o responsável se entra em versão futura.

**Critérios de pronto:**
- Todos os critérios de aceitação da seção 26 do FSD atendidos.
- Nenhuma funcionalidade fora do escopo da seção 7 foi implementada.

**Arquivos/pastas prováveis:** todo o projeto (revisão), documentação de deploy (a definir onde registrar — sugestão: `docs/DEPLOY.md`, a criar quando esta fase iniciar).

**Observações de dependência:** depende de todas as fases anteriores estarem concluídas.
