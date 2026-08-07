# AGENTS.md — Contexto do projeto CRM Live

Este arquivo orienta qualquer IA (ou desenvolvedor humano) que trabalhe neste repositório em qualquer chat/sessão futura. Ele resume decisões já tomadas — a fonte da verdade completa é sempre `docs/FSD.md` e `docs/Design/design.md`.

## Idioma

- Responder sempre em português do Brasil.
- Nomes de tabelas, colunas e demais elementos de banco de dados: inglês, `snake_case`.
- Comentários de código: português do Brasil, apenas quando explicam regra de negócio não óbvia.
- Interface (telas, textos ao usuário): português do Brasil, exceto termos técnicos sem tradução consolidada.

## Stack, arquitetura e restrições (definidas em `docs/FSD.md`)

- **Backend:** Node.js 22 (LTS), JavaScript, CommonJS (`require`/`module.exports`). Framework HTTP: **Express** (decidido em 07/08/2026 durante a preparação do projeto — o FSD deixava essa escolha em aberto).
- **Frontend:** React + Material UI (MUI), com tema customizado derivado de `docs/Design/design.md` — **nunca o tema padrão do MUI**. Ferramenta de build: **Vite** (decidido em 07/08/2026, pelo mesmo motivo).
- **Banco de dados:** PostgreSQL — instância própria do CRM Live (leitura e escrita) + conexão **somente leitura** com o banco do Uniplus (nunca escrever, em nenhuma hipótese).
- **Padrão arquitetural:** inspirado em MVC — Controller (API/rotas) → Service/Model (regras de negócio e acesso a dados) → View (React). Controllers não acessam banco diretamente nem contêm regra de negócio complexa.
- **Empacotamento:** Docker Compose com três serviços (`db`, `backend`, `frontend`), reaproveitado do ambiente local para produção.
- **Sem `.env`:** credenciais e configuração técnica ficam em `backend/app/config/settings.js` (não versionado), carregado apenas por `require` interno — nunca por rota HTTP. O exemplo versionado é `backend/app/config/settings.example.js`.
- **Restrições importantes:**
  - Nenhuma API externa exposta pelo CRM Live.
  - Nenhuma integração externa além da leitura do PostgreSQL do Uniplus e da conexão com o WhatsApp Web.
  - Integração com o Uniplus é somente leitura, sem exceção.
  - Sem cadastro manual de clientes — todo cliente vem de importação do Uniplus.
  - Sem soft delete nesta versão — entidades configuráveis usam campo `active`.
  - Biblioteca de automação de WhatsApp Web isolada em `backend/app/integrations/whatsapp/`, nunca referenciada diretamente por regras de negócio (camada de abstração de mensageria — `docs/FSD.md`, seção 9.11). Biblioteca específica (`whatsapp-web.js` vs. Baileys) ainda não decidida — ver `docs/PLANO.md`, Fase 6.

## Ambientes

- **Desenvolvimento local:** Docker Compose, três serviços isolados na máquina do desenvolvedor.
- **Testes/homologação:** não existe ambiente separado nesta versão — validação ocorre localmente (Docker Compose) antes de qualquer publicação em produção.
- **Produção:** um único PC Windows 10 Pro, na loja do cliente, na mesma rede/máquina do banco do Uniplus, rodando 24/7 com o mesmo `docker-compose.yml`, ajustado para os parâmetros de produção via `backend/app/config/settings.js` local daquele ambiente.

## Estrutura de pastas

```
./
├── docker-compose.yml
├── docs/
│   ├── FSD.md
│   ├── DESIGN.md (ver observação abaixo)
│   ├── INSUMOS.md
│   ├── PLANO.md
│   ├── STATUS.md
│   ├── ERROS.md
│   └── Design/
│       ├── design.md
│       └── mockup-dashboard-geral.html
├── backend/
│   ├── package.json
│   └── app/
│       ├── main.js
│       ├── config/
│       │   ├── settings.js          (não versionado — credenciais reais locais)
│       │   └── settings.example.js  (versionado — placeholders, sem segredos)
│       ├── controllers/
│       ├── models/
│       ├── services/
│       ├── database/
│       │   └── migrations/
│       ├── integrations/
│       │   ├── uniplus/
│       │   └── whatsapp/
│       ├── jobs/
│       ├── storage/
│       │   ├── attachments/  (fora de rota pública)
│       │   └── logs/         (fora de rota pública)
│       └── tests/
└── frontend/
    ├── package.json
    └── src/
        ├── views/
        ├── components/
        ├── theme/   (tema MUI customizado, a partir de docs/Design/design.md)
        ├── services/
        └── routes/
```

**Observação importante sobre `docs/DESIGN.md`:** o design system deste projeto está em `docs/Design/design.md` (dentro da subpasta `Design/`), não em um arquivo `docs/DESIGN.md` na raiz de `docs/`. Sempre que uma instrução mencionar `docs/DESIGN.md`, o arquivo correto a consultar é `docs/Design/design.md`.

## Comandos principais

- **Subir o ambiente local completo:** `docker compose up --build`
- **Subir em segundo plano:** `docker compose up -d --build`
- **Parar:** `docker compose down`
- **Rodar comando dentro do backend (ex.: migrations, a partir da Fase 2):** `docker compose exec backend node app/database/migrate.js`
- **Backend fora do Docker (desenvolvimento avulso):** dentro de `backend/`, `npm install` e depois `npm run dev`
- **Frontend fora do Docker (desenvolvimento avulso):** dentro de `frontend/`, `npm install` e depois `npm run dev`
- **Testes:** ainda não definidos — serão estabelecidos junto com a primeira funcionalidade testável (Fase 2 em diante) e registrados aqui e em `docs/PLANO.md` quando decididos.

## Regras de segurança (adequadas à stack Node.js + PostgreSQL + Docker Compose)

- **Injeção SQL:** usar sempre queries parametrizadas (nunca concatenar valores de entrada em SQL), tanto na base própria quanto na leitura do Uniplus.
- **XSS:** o React já escapa conteúdo por padrão — nunca usar `dangerouslySetInnerHTML` com dados vindos do usuário ou do Uniplus sem sanitização.
- **CSRF:** como a autenticação usa cookie de sessão, avaliar proteção CSRF (ex.: `SameSite` no cookie, token CSRF em ações de escrita) ao implementar a Fase 3.
- **Senhas:** o sistema não armazena senha própria — autenticação é 100% via OAuth 2.0 do Google (`docs/FSD.md`, seção 15).
- **Sessão:** token assinado, cookie `httpOnly` e `secure`, expiração de 12h com sliding expiration.
- **Controle de acesso por perfil:** todo Controller deve validar permissão no backend (Administrador vs. Acesso limitado), independentemente do que a interface esconde — nunca confiar apenas no frontend.
- **Isolamento Uniplus:** usuário de banco dedicado, com permissão de **somente leitura**, configurado em `settings.js`; a aplicação nunca escreve nas tabelas de origem do Uniplus.
- **Proteção de pastas internas:** `config/`, `models/`, `services/`, `database/migrations/`, `integrations/`, `jobs/`, `storage/logs/`, `storage/attachments/` nunca são servidas como conteúdo estático pela API — nenhuma rota deve apontar para elas.
- **Configuração:** nunca usar `.env`; credenciais ficam em `backend/app/config/settings.js`, fora do controle de versão, carregado apenas por `require` interno.
- **Mensagens de erro:** genéricas e sem expor estrutura interna (stack trace, credenciais, nomes de tabela) na interface.
- **Logs:** `backend/app/storage/logs/` fora de rota pública, sem exceção.
- **Validação de entradas:** todo dado recebido do frontend deve ser validado no backend (Controller/Service), mesmo que já validado no frontend.
- **Uploads:** apenas imagens de template (`JPG`, `PNG`, `WEBP`, até 5MB), com validação do tipo real do arquivo (conteúdo binário, não apenas extensão); download sempre por rota de Controller autenticada, nunca por link direto ao caminho do arquivo.
- **APIs externas:** nenhuma API externa exposta pelo CRM Live; a única integração é a leitura do Uniplus e a conexão com o WhatsApp Web via camada de abstração.
- **Chaves e tokens:** nenhum segredo, token, chave de API ou credencial deve constar em código versionado, log ou documentação.
- **Rotas internas:** toda rota da API exige sessão válida, exceto o próprio fluxo de login.

## Protocolo dos arquivos vivos

Antes de iniciar qualquer trabalho:
1. Ler `docs/FSD.md`.
2. Ler `docs/Design/design.md` (referenciado como "DESIGN" no processo do projeto).
3. Ler `docs/INSUMOS.md`.
4. Ler `docs/PLANO.md`.
5. Ler `docs/STATUS.md`.
6. Ler `docs/ERROS.md`.

Use sempre caminhos relativos à raiz do projeto.
Não transformar estes caminhos em links absolutos.
Não usar links `file:///`.
Não registrar caminhos locais da máquina atual dentro do `AGENTS.md`.

Ao terminar qualquer trabalho:
1. Atualizar `docs/STATUS.md`.
2. Registrar erros e soluções em `docs/ERROS.md`, se houver.
3. Informar ao usuário o que foi feito.
4. Informar como testar ou validar a entrega.

## Boas práticas

- Código claro, funções pequenas, nomes descritivos.
- Comentários apenas para decisões e regras de negócio não óbvias — sem descrever o óbvio.
- Sem duplicação desnecessária.
- Sem funcionalidades fora do escopo definido em `docs/FSD.md`, seção 6 (ver também seção 7 — Fora de Escopo).
- Preservar a arquitetura MVC e a estrutura de pastas já definidas, exceto quando a tarefa pedir explicitamente uma mudança estrutural.
- Mudanças pequenas, coesas e fáceis de revisar.
- Não alterar arquivos fora do escopo do pedido sem antes perguntar.

## Interface

- Seguir `docs/Design/design.md` ("Admin Logic") em telas, componentes, cores, tipografia, espaçamento e raio.
- Tema MUI customizado em `frontend/src/theme/`, nunca o tema padrão do MUI.
- Tipografia: Public Sans (títulos/headlines) + Inter (corpo/dados).
- Prioridade: simplicidade e clareza para usuário com pouca experiência em sistemas (lojistas de comércio varejista).

## Pendências que afetam a implementação

- **Mapeamento do schema do Uniplus:** ainda não definido — bloqueia especificamente a Fase 4 (sincronização). Ver `docs/FSD.md`, seção 27, e `docs/PLANO.md`, Fase 4.
- **Biblioteca de automação de WhatsApp Web:** `whatsapp-web.js` vs. Baileys — decisão adiada para a Fase 6.
- **Variantes de logomarca sem uso definido:** `logo-oval-branca`, `logo-oval-monocromatica`, `avatar-1024.png`, `preview-branca-fundo-escuro.png` (ver `docs/INSUMOS.md`) — confirmar com o responsável antes de aplicá-las a alguma tela.
