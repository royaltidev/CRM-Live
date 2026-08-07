# Teste da Fase 2 — Banco de Dados e Persistência

## Resumo do que foi implementado

A Fase 2 criou toda a infraestrutura de banco de dados e persistência do CRM Live:

### 1. Driver PostgreSQL
- **Arquivo:** `backend/package.json`
- **Dependência:** `pg@^8.11.3` adicionada
- **Comando de instalação:** `npm install` (dentro da pasta `backend/`)

### 2. Módulo de Conexão
- **Arquivo:** `backend/app/database/connection.js`
- **O que faz:**
  - Cria dois pools de conexão (CRM Live + Uniplus read-only)
  - Exporta funções de consulta para uso no código
  - Trata erros de conexão gracefully

### 3. Sistema de Migrations
- **Arquivo:** `backend/app/database/migrate.js`
- **O que faz:**
  - Cria tabela `schema_migrations` automaticamente
  - Executa migrations pendentes em ordem
  - Registra quais já foram executadas (idempotente)
  - Impede execução duplicada

### 4. 28 Migrations
- **Local:** `backend/app/database/migrations/001_*.js` até `028_*.js`
- **Tabelas criadas:** Todas as 27 do FSD seção 11.2
- **Inclui:**
  - Índices para busca e performance
  - Constraints (NOT NULL, UNIQUE, CHECK)
  - Chaves estrangeiras com `ON DELETE RESTRICT`
  - Tipos ENUM para enumerações (role, status, etc.)

---

## Como Testar Localmente

### Pré-requisitos
- Docker Desktop instalado e rodando
- Pasta do projeto com Git inicializado (✓ já feito)

### Teste 1: Estrutura de pastas
```bash
# Verificar que as migrations existem
ls -la backend/app/database/migrations/ | grep ".js" | wc -l
# Esperado: 28 arquivos
```

### Teste 2: Validação de sintaxe (sem Docker)
```bash
cd backend
node -c app/database/connection.js
node -c app/database/migrate.js
node -c app/database/migrations/001_create_users_table.js
# Se não houver erros, a sintaxe está correta
```

### Teste 3: Iniciar os serviços com Docker (TESTE PRINCIPAL)
```bash
# Na raiz do projeto:
docker compose up --build

# Esperado:
# - Serviço "db" (PostgreSQL) sobe
# - Serviço "backend" (Node.js) sobe depois
# - Serviço "frontend" (React) sobe por último
# - Nenhum erro de conexão
```

### Teste 4: Executar as migrations
```bash
# Em outro terminal (enquanto Docker está rodando):
docker compose exec backend node app/database/migrate.js

# Esperado:
# ✓ Tabela schema_migrations verificada
# ✓ 28 migrations listadas
# ✓ Todas as 28 migrations executadas
# ✓ Mensagem final: "Todas as migrations foram executadas com sucesso!"
```

### Teste 5: Verificar que é idempotente
```bash
# Executar migrations novamente:
docker compose exec backend node app/database/migrate.js

# Esperado:
# ✓ Banco de dados já está atualizado!
# (nenhuma tentativa de executar migration duplicada)
```

### Teste 6: Verificar tabelas no banco
```bash
# Conectar ao banco PostgreSQL dentro do container:
docker compose exec db psql -U crm_live_app -d crm_live -c "\dt"

# Esperado: listagem de 27 tabelas:
# users, customers, tags, customer_tags, dynamic_segments,
# sellers, sales, sale_items, products, stock_snapshots,
# complementary_products, automation_rules, automation_rule_executions,
# message_templates, attachments, campaigns, campaign_recipients,
# coupons, giftback_credits, consents, conversations, messages,
# lead_forwards, nps_responses, nps_treatments,
# system_settings, sync_runs, security_events
```

### Teste 7: Verificar índices
```bash
# Listar índices criados:
docker compose exec db psql -U crm_live_app -d crm_live -c "\di"

# Esperado: múltiplos índices em tables como customers, sales, messages, etc.
```

---

## Como Parar os Serviços

```bash
# No terminal onde docker compose está rodando:
CTRL+C

# Ou em outro terminal:
docker compose down

# Para remover volumes (limpar dados):
docker compose down -v
```

---

## Checklist de Conclusão da Fase 2

- [ ] Estrutura de pastas verificada (28 migrations)
- [ ] Validação de sintaxe passou (sem erros Node.js)
- [ ] Docker Compose iniciou sem erros
- [ ] Migrations executaram com sucesso
- [ ] Idempotência confirmada (execução duplicada)
- [ ] 27 tabelas criadas no banco
- [ ] Índices criados
- [ ] Commit registrado no Git

---

## Próximo Passo: Fase 3

A **Fase 3** implementará:
- Autenticação via Google OAuth 2.0
- Middleware de sessão (token assinado, cookie httpOnly/secure)
- RBAC (controle de acesso por papel)
- Log de segurança
- Tela de gestão de usuários

**Bloqueadores:** Nenhum — Fase 3 não depende do schema do Uniplus.

---

## Referências

- **FSD:** `docs/FSD.md`, seções 11 (modelo de dados), 5.5 (configuração)
- **PLANO:** `docs/PLANO.md`, Fase 2
- **STATUS:** `docs/STATUS.md` (atualizado com checklist da Fase 2)
