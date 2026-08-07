# DOCUMENTO DE ESPECIFICAÇÃO FUNCIONAL (FSD)

**Sistema:** CRM Live
**Versão do documento:** 1.0
**Data:** 06/08/2026
**Responsável:** Wilian — Royal Tecnologia

---

## 1. Visão Geral

**Nome do sistema:** CRM Live.

**Objetivo principal:** aumentar a recompra e a retenção de clientes de lojas de comércio varejista por meio de comunicação automática, personalizada e controlada via WhatsApp, a partir dos dados de vendas, clientes, produtos e estoque já existentes no ERP Uniplus.

**Resumo do funcionamento:** o CRM Live roda de forma contínua em segundo plano na própria loja, sincronizando periodicamente clientes, vendas, produtos e estoque a partir do banco de dados PostgreSQL do Uniplus (somente leitura). A partir dessa sincronização, um motor de automações ("réguas de relacionamento") dispara mensagens de WhatsApp em momentos estratégicos: agradecimento pós-venda, lembrete de recompra, campanha de reativação (win-back), oferta de venda cruzada (cross-sell), aviso de volta ao estoque e pesquisa de satisfação (NPS). O sistema também permite ao lojista criar campanhas manuais para grupos segmentados de clientes, responder clientes em uma caixa de entrada própria, encaminhar leads a vendedores por WhatsApp, tratar notas de satisfação baixas e acompanhar indicadores de relacionamento — sempre respeitando o consentimento do cliente conforme a LGPD.

**Público usuário:**
- **Administrador**: a primeira conta Google que autenticar no sistema em produção. Tem acesso completo, incluindo funcionalidades exclusivas (modelos de mensagem, cupons/vouchers, giftback/cashback, caixa de entrada, ações sobre notas de NPS e parâmetros globais).
- **Acesso limitado**: qualquer conta Google que autentique após a primeira. Visualiza tudo, mas só edita um subconjunto de funcionalidades (ver seção 8).
- **Vendedores** e **clientes da loja** não acessam o sistema; interagem apenas por WhatsApp (vendedores recebem encaminhamento de leads; clientes recebem e respondem mensagens).

**Contexto de uso:** o sistema é instalado em um único PC com Windows 10 Pro, na própria loja do cliente, na mesma rede/máquina onde está o banco de dados do Uniplus. Roda continuamente (24/7). O volume inicial estimado é de aproximadamente 60 vendas por dia — volume baixo, compatível com a cadência controlada de envio exigida para reduzir o risco de bloqueio do número de WhatsApp usado.

**Observações relevantes para implementação:**
- O sistema atende, nesta primeira versão, a uma única loja/operação.
- O design system do CRM Live está definido em `docs/Design/design.md` ("Admin Logic": paleta de cores, tipografia Public Sans + Inter, raio, espaçamento e diretrizes de componentes), confirmado pelo responsável em 07/08/2026 após validação de um esboço de tela. A biblioteca de componentes visuais é Material UI (MUI), mas o tema padrão do MUI **não deve ser usado como está** — o tema deve ser configurado a partir dos tokens de `docs/Design/design.md` (ver seção 5.3). Este FSD descreve telas, campos, ações e mensagens em nível funcional; o layout visual detalhado (cores, tipografia, espaçamento, componentes) segue `docs/Design/design.md`, sem contradizer as regras funcionais aqui descritas.
- A integração é **somente leitura** com o Uniplus: o CRM Live nunca altera, exclui ou sobrescreve dados de origem no Uniplus, em nenhuma hipótese.
- Não há cadastro manual de clientes: todo cliente do CRM Live tem origem em uma importação do Uniplus.

---

## 2. Documentos do Projeto para Implementação

A IA codificadora deve implementar o sistema usando:

- `docs/FSD.md` (este documento) — especificação funcional e técnica consolidada.
- `docs/Design/design.md` — design system "Admin Logic": padrão visual, paleta de cores, tipografia, espaçamento e diretrizes de componentes, confirmado pelo responsável. A IA codificadora deve configurar um tema MUI (Material UI) customizado a partir desses tokens — não usar o tema padrão do MUI —, priorizando simplicidade e clareza para um usuário com pouca experiência em sistemas.

Este FSD já consolida todas as decisões funcionais e técnicas necessárias para a implementação. Nenhum outro documento de levantamento ou decisão é necessário para codificar o sistema.

---

## 3. Stack Definida

- **Linguagem de backend:** Node.js (versão LTS, ex.: 22), JavaScript. *(Decisão revista em 07/08/2026 — ver seção 27: a stack original previa Python para todo o backend, mas foi alterada para Node.js, pois as bibliotecas de automação de WhatsApp Web maduras e mantidas — ex.: `whatsapp-web.js`, Baileys — são em Node.js, sem equivalente robusto e mantido em Python puro. Em vez de isolar apenas a automação de WhatsApp em um serviço auxiliar separado, optou-se por unificar todo o backend em Node.js.)*
- **Frontend:** React, com biblioteca de componentes **Material UI (MUI)**.
- **Banco de dados:** PostgreSQL — instância própria do CRM Live, separada da base do Uniplus (que também é PostgreSQL, mas pertence a outro sistema e não pode ser alterada).
- **Padrão arquitetural:** organização inspirada em MVC (Model – View – Controller), detalhada na seção 5.
- **Empacotamento/execução:** Docker Compose, orquestrando três serviços: backend (API Node.js), banco de dados (PostgreSQL) e frontend (React). O mesmo arquivo de composição deve poder ser reaproveitado do ambiente local para o ambiente de produção. Como todo o backend passou a ser Node.js, a automação de WhatsApp Web roda dentro do próprio serviço de backend, sem exigir um quarto serviço/container dedicado.
- **Dependências importantes:**
  - Biblioteca de automação de WhatsApp Web no backend Node.js (ex.: `whatsapp-web.js` ou Baileys — escolha específica entre as opções a confirmar na fase de codificação), sempre isolada atrás de uma camada de abstração de envio (ver seção 9 — Camada de mensageria).
  - Driver/cliente de acesso ao PostgreSQL (para a base própria do CRM Live e, em modo somente leitura, para o banco do Uniplus).
  - Biblioteca de geração de PDF para exportação de relatórios gerenciais.
- **Restrições técnicas:**
  - Nenhuma API externa exposta pelo CRM Live nesta versão.
  - Nenhuma integração externa além da leitura do PostgreSQL do Uniplus e da conexão com o WhatsApp Web.
  - Não usar arquivo `.env` para credenciais (ver seção 20).
  - Não modificar, em nenhuma circunstância, dados de origem no banco do Uniplus.
- **Observações sobre uso local de bibliotecas:** a biblioteca de automação de WhatsApp Web deve ficar isolada em um módulo de integração próprio (`integrations/whatsapp/`), nunca referenciada diretamente pelas regras de negócio ou pelos controllers — toda comunicação passa pela camada de abstração de mensageria (ver seção 9), para permitir a troca futura para a API oficial do WhatsApp sem retrabalho nas réguas, campanhas e demais funcionalidades.

---

## 4. Ambientes do Projeto

- **Desenvolvimento local:** Docker Compose, subindo backend (Node.js), banco de dados (PostgreSQL) e frontend (React) de forma isolada na máquina do desenvolvedor.
- **Testes/homologação:** não há ambiente separado de testes ou homologação nesta primeira versão. A validação ocorre localmente (ambiente Docker Compose) antes de qualquer publicação em produção.
- **Produção:** um único PC com Windows 10 Pro, instalado na própria loja do cliente, na mesma rede/máquina onde roda o banco de dados do Uniplus. O sistema roda continuamente (24/7), usando o mesmo arquivo de composição Docker Compose do ambiente local, ajustado para os parâmetros de produção (ver seção 20 — arquivo de configuração).
- **Observações sobre deploy:** o processo detalhado de instalação/publicação no PC da loja (aquisição de dependências do Windows, configuração do Docker Desktop, inicialização automática dos containers ao ligar o PC, etc.) é tratado como uma etapa própria de implantação, a ser detalhada durante a fase de preparação da entrega (seção 25, item 24). Este FSD não assume hospedagem compartilhada tipo XAMPP ou provedores de hospedagem web tradicionais — a arquitetura de pastas descrita na seção 5 é organizada de forma independente de qualquer ambiente de hospedagem compartilhada, para preservar a portabilidade do projeto caso o ambiente de produção mude no futuro.

---

## 5. Arquitetura do Sistema

### 5.1 Raiz do projeto

Toda a implementação deve partir de um único diretório versionado no repositório, referenciado neste documento como:

`[Diretório do Projeto - Repositório]`

Esse diretório representa a pasta do projeto CRM Live tal como versionada no Git. Como o ambiente de produção é um PC Windows dedicado rodando Docker Compose (e não uma hospedagem compartilhada com pasta pública fixa), o `[Diretório do Projeto - Repositório]` deve poder ser posicionado em qualquer caminho do sistema de arquivos (ex.: `C:\royal-tecnologia\crm-live\` no PC da loja), sem depender de nomes de pasta pública como `public_html`, `public`, `htdocs` ou `www`.

### 5.2 Aplicação do padrão MVC

O sistema deve manter separação clara de responsabilidades inspirada em MVC, mesmo sem um framework MVC "pronto":

- **Model:** responsável pelos dados e pelas regras de negócio ligadas aos dados. Inclui o acesso à base de dados própria do CRM Live, a leitura (somente leitura) da base do Uniplus, e a lógica das réguas de relacionamento, segmentação, cross-sell, NPS, consentimento e demais regras descritas neste FSD. Para manter os Models enxutos, as regras de negócio mais elaboradas (ex.: cálculo de RFM, avaliação de réguas em cascata, roteamento de leads) devem ficar em uma camada de serviços (`services/`), que é funcionalmente parte da responsabilidade do Model — organiza-se em pasta própria apenas por clareza de manutenção, não por criar uma quarta camada arquitetural.
- **View:** interface React (MUI), responsável exclusivamente pela apresentação e pela interação do usuário. Não deve conter regra de negócio: toda validação de negócio é responsabilidade do backend (Controller + Model/Service); a View pode replicar validações simples (ex.: campo obrigatório) apenas para dar retorno rápido ao usuário, mas a validação definitiva sempre ocorre no backend.
- **Controller:** camada da API Node.js que recebe as requisições do frontend, valida permissões e entrada, aciona os Models/Services correspondentes e devolve a resposta. Os Controllers não devem acessar diretamente o banco de dados nem conter regra de negócio complexa — apenas orquestram a chamada aos Models/Services e tratam o formato de entrada/saída (requisição/resposta HTTP).

O fluxo de uma requisição típica é: **View (React)** → chamada HTTP → **Controller (API Node.js)** → valida permissão e entrada → aciona **Service/Model** → Service/Model acessa o banco de dados próprio do CRM Live (e, quando aplicável, lê o banco do Uniplus) → Controller formata e devolve a resposta → **View** atualiza a tela.

### 5.3 Estrutura de diretórios sugerida

```
[Diretório do Projeto - Repositório]/
├── docker-compose.yml
├── docs/
│   ├── FSD.md
│   └── Design/
│       ├── design.md               (design system "Admin Logic")
│       └── mockup-*.html           (esboços de tela para validação visual)
├── backend/
│   ├── package.json
│   └── app/
│       ├── main.js                (arquivo de entrada da aplicação/API)
│       ├── config/
│       │   ├── settings.js        (configuração em código, sem uso de .env)
│       │   └── settings.example.js
│       ├── controllers/           (camada Controller — rotas/endpoints da API)
│       ├── models/                (camada Model — entidades e acesso a dados)
│       ├── services/              (regras de negócio: réguas, RFM, cross-sell, NPS, roteamento de leads etc.)
│       ├── database/
│       │   ├── connection.js
│       │   └── migrations/        (migrations versionadas do banco do CRM Live)
│       ├── integrations/
│       │   ├── uniplus/           (leitura somente-leitura do banco do Uniplus)
│       │   └── whatsapp/          (camada de abstração de envio de mensagens, incluindo a biblioteca de automação de WhatsApp Web)
│       ├── jobs/                  (sincronização periódica, réguas agendadas, fila de envio, cálculo de RFM)
│       ├── storage/
│       │   ├── attachments/       (imagens de templates — fora de rota pública)
│       │   └── logs/              (log de contingência em arquivo, ver seção 19)
│       └── tests/
└── frontend/
    ├── package.json
    └── src/
        ├── views/                 (telas — camada View)
        ├── components/
        ├── theme/                 (tema MUI customizado, derivado de docs/Design/design.md)
        ├── services/              (chamadas à API do backend)
        └── routes/
```

### 5.4 Proteção de pastas internas

O backend Node.js expõe apenas as rotas explicitamente declaradas na camada `controllers/` através do arquivo de entrada (`main.js`). Diferentemente de um servidor de arquivos estáticos tradicional (como PHP rodando sob Apache), o framework de API Node.js (ex.: Express ou Fastify — escolha específica a confirmar na fase de codificação) não serve arquivos do sistema de arquivos por padrão, desde que nenhum middleware de arquivos estáticos seja configurado apontando para essas pastas — portanto, pastas como `config/`, `models/`, `services/`, `database/migrations/`, `integrations/`, `jobs/` e `storage/logs/` **não são acessíveis via navegador em nenhuma circunstância**, pois nenhuma rota da API deve apontar para elas como conteúdo estático.

Ainda assim, a IA codificadora deve aplicar as seguintes proteções adicionais, por robustez:

- O serviço de frontend (React) e o serviço de backend (API) devem ser containers Docker distintos, cada um expondo apenas a porta estritamente necessária.
- Nenhuma rota da API deve servir diretórios inteiros como estáticos; qualquer arquivo que precise ser baixado pelo usuário (ex.: anexo de template, exportação de relatório) deve ser servido por uma rota de Controller específica, que valida autenticação e permissão antes de entregar o arquivo — nunca por acesso direto de caminho de arquivo.
- A pasta `storage/attachments/` (uploads de imagens de templates) deve ficar fora de qualquer rota estática pública; o acesso a um anexo específico deve sempre passar por uma rota de Controller autenticada, que verifica a permissão do usuário antes de retornar o arquivo.
- A pasta `storage/logs/` (log de contingência em arquivo) deve ficar fora de qualquer rota estática pública, sem exceção — nenhum Controller deve expor essa pasta como download.
- O arquivo `config/settings.js`, que contém dados de conexão com os dois bancos de dados (CRM Live e Uniplus) e demais parâmetros técnicos sensíveis, deve ser carregado apenas por importação interna do código Node.js (`require('./config/settings')` ou `import settings from './config/settings.js'`), nunca por uma rota HTTP.

### 5.5 Configuração em código, sem uso de `.env`

O projeto não deve usar arquivo `.env` para armazenar credenciais. Em vez disso, o backend Node.js deve possuir um arquivo de configuração em código:

`backend/app/config/settings.js`

Esse arquivo pode conter, quando aplicável:
- dados de conexão com o banco de dados próprio do CRM Live;
- dados de conexão somente leitura com o banco de dados do Uniplus;
- parâmetros técnicos internos (ex.: caminho de armazenamento da sessão do WhatsApp Web, caminho da pasta de anexos e de logs);
- flags de ativação de recursos técnicos (ex.: ativação de log de contingência em arquivo, se adotado — ver seção 19).

Regras obrigatórias sobre esse arquivo:
- Deve ficar dentro de `backend/app/config/`, protegido de acesso direto por URL conforme a seção 5.4.
- Deve ser carregado apenas por importação interna do código (`require`/`import ... from`), nunca lido diretamente por uma rota da API.
- O arquivo `settings.js` com credenciais reais de produção **não deve ser versionado no repositório público** — apenas um arquivo de exemplo (`settings.example.js`, com placeholders e sem segredos reais) deve ser versionado, servindo de modelo. O arquivo `settings.js` real é criado localmente em cada ambiente (desenvolvimento e produção) a partir desse exemplo, e permanece fora do controle de versão (adicionado ao mecanismo de exclusão de versionamento do projeto). Essa prática substitui o uso de `.env` sem abrir mão da separação entre código e segredos: a diferença é que o arquivo de configuração é um módulo de código Node.js válido, carregado por importação, e não um arquivo de texto solto que pode ser servido por engano como conteúdo estático.
- Nenhum segredo, token, chave de API ou credencial deve constar em nenhum outro arquivo do repositório, em log ou em documentação.

---

## 6. Escopo Funcional da Primeira Versão

### 6.1 Módulo — Cadastro e visão 360º do cliente

- **Objetivo:** consolidar, em uma única ficha, os dados do cliente vindos do Uniplus com os dados complementares próprios do CRM Live, higienizar a base de contatos usada para disparo de mensagens, e incentivar a identificação de clientes em vendas que hoje chegam sem cliente vinculado.
- **Usuários envolvidos:** Administrador e Acesso limitado (ambos visualizam e editam campos complementares).
- **Ações permitidas:** consultar lista de clientes com busca e filtros; abrir a ficha 360º de um cliente (dados cadastrais, histórico de compras, ticket médio, frequência, última compra, linha do tempo de interações); editar campos complementares (aniversário, preferências, tags, canal de contato preferido); consultar relatório de vendas sem cliente identificado.
- **Resultado esperado:** visão única e atualizada de cada cliente, com contatos validados para uso seguro nas réguas e campanhas.
- **Dependências:** depende da sincronização com o Uniplus (seção 6.9) para existir; alimenta segmentação (6.2), réguas (6.3), campanhas (6.4), consentimento (6.6) e NPS (6.8).
- **Regras relacionadas:** não há cadastro manual de clientes — todo cliente tem origem em uma importação do Uniplus; um número de telefone só pode ser usado para disparo se validado como número de WhatsApp; contatos duplicados ou inválidos devem ser identificados antes de entrarem em qualquer régua de comunicação.
- **Incentivo ao cadastro (decisão confirmada, Q-03 do PRD):** quando a sincronização identifica que uma venda passou a ter um cliente vinculado que nunca teve nenhuma outra venda vinculada anteriormente no CRM Live (ou seja, é a primeira compra identificada daquele cliente), o sistema gera automaticamente um cupom de desconto (percentual parametrizável — seção 20) para uso na próxima compra, e envia uma mensagem de WhatsApp informando o benefício, respeitando consentimento e cadência. Essa regra é implementada como uma régua de relacionamento com gatilho `first_identified_purchase` (seção 11.2), e não se aplica retroativamente a vendas já fechadas antes da identificação, já que o Uniplus é somente leitura.

### 6.2 Módulo — Segmentação de clientes

- **Objetivo:** agrupar clientes automaticamente (RFM) e permitir segmentos dinâmicos por filtros combináveis, para direcionar campanhas e réguas.
- **Usuários envolvidos:** Administrador e Acesso limitado.
- **Ações permitidas:** consultar classificação RFM de cada cliente (ex.: VIP, fiel, em risco, inativo); criar, editar e salvar segmentos dinâmicos combinando categoria de produto comprado, faixa de ticket médio, período, localização (bairro/cidade) e tags.
- **Resultado esperado:** segmentos sempre atualizados conforme novas vendas entram pela sincronização, prontos para uso em campanhas e relatórios.
- **Dependências:** depende dos dados de clientes e vendas sincronizados (6.9); é consumido pelas réguas (6.3) e campanhas (6.4).
- **Regras relacionadas:** a atualização de RFM e dos segmentos dinâmicos deve ocorrer automaticamente após cada sincronização com o Uniplus, sem exigir ação manual do usuário; os limites que definem cada faixa RFM (VIP, fiel, em risco, inativo) são parâmetros configuráveis pelo Administrador na tela de Configurações (seção 12.13/20), sem valor padrão pré-definido — a classificação fica bloqueada/pendente até o Administrador definir esses critérios pela primeira vez, seguindo o mesmo padrão de fallback descrito na seção 20.

### 6.3 Módulo — Réguas de relacionamento (automações)

- **Objetivo:** permitir que o lojista configure, sem programação, mensagens automáticas disparadas por gatilhos de venda, tempo ou eventos de estoque.
- **Usuários envolvidos:** Administrador e Acesso limitado (podem criar/editar/ativar réguas).
- **Ações permitidas:** criar/editar/ativar/desativar réguas no formato gatilho + condição + ação; configurar a régua de agradecimento pós-venda (RF-001), diferenciando primeira compra de compra recorrente; configurar régua de aniversário com oferta opcional; configurar lembrete de recompra por ciclo de consumo do produto; configurar pesquisa de satisfação (NPS) enviada 30 minutos após a compra; configurar régua de reativação (win-back) em cascata (ex.: 30/60/90/180 dias sem comprar), com incentivo crescente por etapa; configurar aviso de volta ao estoque; agendar campanhas para data/hora futura, respeitando a janela de envio das 8h às 18h.
- **Resultado esperado:** mensagens corretas disparadas automaticamente, sem duplicidade, respeitando consentimento e cadência.
- **Dependências:** depende de modelos de mensagem (6.4), consentimento (6.6) e sincronização com o Uniplus (6.9); alimenta o log de disparos e a linha do tempo do cliente.
- **Regras relacionadas:** nenhuma régua pode gerar envio duplicado para o mesmo evento (ex.: a mesma venda não pode gerar dois agradecimentos); toda régua deve verificar consentimento e lista de supressão antes de enviar; a régua de reativação deve ser encerrada automaticamente para o cliente assim que ele voltar a comprar; o dono acompanha, em tela própria, os clientes elegíveis em cada etapa da régua de reativação, com filtro por tempo sem comprar, e opções de envio e de consulta às interações.

### 6.4 Módulo — Campanhas e ofertas

- **Objetivo:** permitir o envio de campanhas manuais em massa para segmentos de clientes, com modelos de mensagem reutilizáveis, cupons e giftback/cashback.
- **Usuários envolvidos:** Administrador (exclusivo para modelos de mensagem, cupons e giftback/cashback) e Acesso limitado (pode criar, disparar e agendar campanhas manuais e configurar cross-sell).
- **Ações permitidas:** criar campanha manual selecionando segmento e modelo de mensagem, com personalização por variáveis (nome do cliente, produto, percentual de desconto); agendar data/hora de envio; associar cupom ou giftback à campanha; criar/editar modelos de mensagem reutilizáveis (texto, imagem, link) — exclusivo do Administrador; criar/editar cupons de desconto com código único e prazo de validade — exclusivo do Administrador; criar/editar giftback/cashback (crédito percentual sobre a compra, com prazo de validade) — exclusivo do Administrador; configurar relação de produtos complementares ("comprados juntos"), manualmente ou a partir de sugestão do histórico de vendas; configurar percentual de desconto do cross-sell pós-compra automático nas preferências do sistema.
- **Resultado esperado:** campanhas enviadas apenas a clientes com consentimento válido, com resultado (enviadas, entregues, respondidas, vendas atribuídas, receita gerada) visível ao usuário.
- **Dependências:** depende de segmentação (6.2), consentimento (6.6) e da camada de mensageria (seção 9); alimenta métricas e dashboards (6.7).
- **Regras relacionadas:** nenhuma campanha pode ser enviada a cliente sem consentimento ou na lista de supressão — o sistema remove automaticamente esses clientes antes da confirmação do disparo; o percentual de desconto do cross-sell é parametrizável nas preferências do Administrador; como o Uniplus não possui campo de código de cupom aplicado à venda, a atribuição de uma venda a uma campanha usa o critério de período (compra do cliente dentro de um número de dias parametrizável após o envio da campanha).

### 6.5 Módulo — Atendimento (conversas)

- **Objetivo:** centralizar as respostas dos clientes em uma caixa de entrada única, interromper automações quando o cliente responde, e encaminhar leads a vendedores.
- **Usuários envolvidos:** Administrador (exclusivo — é quem responde clientes pela caixa de entrada) e Acesso limitado (pode cadastrar/editar vendedores).
- **Ações permitidas:** visualizar caixa de entrada com as conversas dos clientes; responder diretamente a um cliente pelo CRM Live; cadastrar vendedores com número de WhatsApp, vinculados ao vendedor correspondente no Uniplus; consultar e gerenciar a fila de rodízio de vendedores.
- **Resultado esperado:** toda resposta de cliente interrompe automações em curso para aquele cliente e aparece sinalizada para atendimento humano; quando a resposta demonstra intenção de compra ou dúvida, o vendedor responsável é avisado por WhatsApp.
- **Dependências:** depende do cadastro de vendedores e da base de vendas sincronizada (para identificar o último vendedor de cada cliente); alimenta a linha do tempo do cliente.
- **Regras relacionadas:** o lead é encaminhado ao vendedor que realizou a última venda para aquele cliente (identificado a partir dos dados do Uniplus); quando o cliente não tem venda anterior registrada, o lead é encaminhado ao próximo vendedor da fila de rodízio entre os vendedores cadastrados, que avança a cada encaminhamento sem venda anterior, distribuindo os leads de forma equilibrada.

### 6.6 Módulo — Consentimento e LGPD

- **Objetivo:** garantir que toda comunicação respeite o consentimento do cliente, com opt-in registrado e opt-out simples.
- **Usuários envolvidos:** Administrador e Acesso limitado (consulta); o sistema aplica automaticamente as regras de bloqueio.
- **Ações permitidas:** consultar relatório de base de consentimento (quem consentiu, quem saiu, quem nunca foi contatado).
- **Resultado esperado:** nenhuma mensagem — automática ou manual — é enviada a cliente sem consentimento válido ou que esteja na lista de supressão.
- **Dependências:** é consumido por todos os módulos que disparam mensagens (réguas, campanhas).
- **Regras relacionadas:** quando o cliente responde com um termo de saída (ex.: "SAIR"), ele é bloqueado automaticamente e de forma imediata para novas campanhas; a lista de supressão é respeitada por todos os disparos, sem exceção.

### 6.7 Módulo — Métricas e dashboards

- **Objetivo:** dar visibilidade ao dono sobre o desempenho das campanhas e a saúde do relacionamento com os clientes.
- **Usuários envolvidos:** Administrador e Acesso limitado (ambos visualizam).
- **Ações permitidas:** consultar dashboard geral de relacionamento (taxa de recompra, ticket médio, frequência de compra, clientes ativos x inativos, NPS médio); consultar desempenho por campanha (mensagens enviadas, entregues, respondidas, vendas atribuídas, receita gerada); exportar relatórios em CSV e, quando aplicável, em PDF (ver seção 22).
- **Resultado esperado:** indicadores atualizados e confiáveis, coerentes com os dados exibidos nas telas de origem.
- **Dependências:** depende dos dados de vendas, campanhas, consentimento e NPS.
- **Regras relacionadas:** a atribuição de uma venda a uma campanha usa o critério de período (compra dentro de um número de dias parametrizável após o envio da campanha), já que o Uniplus não registra código de cupom aplicado.

### 6.8 Módulo — Gestão de satisfação (NPS)

- **Objetivo:** identificar rapidamente clientes insatisfeitos e permitir ação imediata do dono.
- **Usuários envolvidos:** Administrador (exclusivo — ações sobre notas de NPS).
- **Ações permitidas:** consultar notas de satisfação agrupadas por faixa, com filtros por período, vendedor e categoria de produto; a partir de uma nota, enviar mensagem padronizada ao cliente, oferecer desconto/voucher, ou localizar o vendedor responsável pela venda relacionada (via dados do Uniplus); consultar histórico de tratamento de cada nota baixa.
- **Resultado esperado:** toda nota de satisfação baixa (6 ou menos, em escala de 0 a 10) gera alerta imediato ao Administrador; toda ação tomada fica registrada no histórico da nota.
- **Dependências:** depende da régua de pesquisa de satisfação (6.3) e da base de vendedores/vendas.
- **Regras relacionadas:** a pesquisa é enviada 30 minutos após a compra; nota de 6 ou menos é considerada baixa; a tela de ações deve ser extensível, permitindo adicionar novas ações no futuro sem retrabalho estrutural.

### 6.9 Módulo — Integração com o Uniplus

- **Objetivo:** manter a base do CRM Live sincronizada com os dados do Uniplus, sem nunca alterar a origem.
- **Usuários envolvidos:** Administrador e Acesso limitado (ambos visualizam o painel de status); a sincronização em si é executada por um job automático do backend.
- **Ações permitidas:** consultar painel de status da sincronização (última execução, quantidade de registros importados, erros).
- **Resultado esperado:** clientes, vendas, produtos e estoque atualizados na base própria do CRM Live em tempo quase real, sem qualquer escrita na base do Uniplus.
- **Dependências:** é a base para todos os demais módulos (clientes, vendas, produtos e estoque só existem no CRM Live após serem sincronizados do Uniplus).
- **Regras relacionadas:** a integração é somente leitura, sem exceção; a detecção de novas vendas deve acionar automaticamente as réguas relacionadas (agradecimento, cross-sell); todos os dados próprios do CRM (interações, campanhas, respostas, consentimentos) ficam em base separada da base do Uniplus.

### 6.10 Módulo — Envio de mensagens (operação)

- **Objetivo:** garantir que o disparo de mensagens via WhatsApp Web ocorra de forma controlada, segura e rastreável.
- **Usuários envolvidos:** Administrador e Acesso limitado (consultam o log de disparos); a operação de envio é automática, executada por um job do backend.
- **Ações permitidas:** consultar log de disparos (quem/quando/qual modelo/qual regra originou cada mensagem); receber alerta quando a sessão do WhatsApp cair.
- **Resultado esperado:** mensagens enviadas dentro dos limites de cadência e do limite mensal por cliente, sem duplicidade, com nova tentativa em caso de falha temporária.
- **Dependências:** depende da camada de abstração de mensageria (seção 9) e do consentimento (6.6).
- **Regras relacionadas:** limite de, no máximo, 20 mensagens por cliente a cada mês; intervalos entre mensagens e limite diário parametrizáveis; número de WhatsApp dedicado, distinto do número principal de atendimento da loja; nenhuma mensagem duplicada para o mesmo evento.

### 6.11 Módulo — Configurações e parâmetros

- **Objetivo:** permitir que o Administrador ajuste os parâmetros técnicos e operacionais de escopo global do sistema, sem suporte técnico.
- **Usuários envolvidos:** Administrador (exclusivo).
- **Ações permitidas:** configurar limite de mensagens por cliente/mês, janela de horário de envio, cadência de disparo, período de atribuição de venda a campanha, prazo de envio da pesquisa de satisfação e limite de nota baixa (NPS). Os parâmetros específicos de uma régua (ex.: dias sem comprar de cada etapa do win-back) e o percentual de desconto do cross-sell **não** ficam nesta tela — são editados diretamente nos módulos de Réguas (6.3/12.5) e Cross-sell (6.4/12.9), por quem tiver permissão de editar aquele módulo (Administrador e Acesso limitado).
- **Resultado esperado:** alterações refletidas imediatamente no comportamento das réguas e campanhas seguintes.
- **Dependências:** é consumido por praticamente todos os demais módulos.
- **Regras relacionadas:** ver seção 20 (Configurações Globais) para o detalhamento de cada parâmetro, valor padrão, impacto e quem pode alterá-lo.

### 6.12 Módulo — Gestão de usuários do CRM Live

- **Objetivo:** dar ao Administrador visibilidade e controle sobre quem tem acesso ao sistema, já que qualquer conta Google pode se autenticar e se tornar automaticamente um usuário de "Acesso limitado" (ver seção 8).
- **Usuários envolvidos:** Administrador (exclusivo).
- **Ações permitidas:** consultar lista de usuários já autenticados (e-mail, nome, papel, data do primeiro acesso, data do último acesso, situação ativo/inativo); desativar o acesso de um usuário de "Acesso limitado" quando necessário.
- **Resultado esperado:** o Administrador consegue revisar quem acessou o sistema e bloquear acessos indesejados.
- **Dependências:** depende do módulo de autenticação (seção 15).
- **Regras relacionadas:** este módulo não permite promover um usuário de "Acesso limitado" a Administrador nem rebaixar o Administrador — o papel de Administrador é definido de forma automática e permanente para a primeira conta Google que autenticar em produção, conforme decisão técnica do projeto. A desativação de um usuário gera um evento no log de segurança ("alteração de permissões"). Este módulo foi incluído por coerência funcional, para viabilizar o evento de log de segurança "alteração de permissões entre perfis" já previsto nas decisões técnicas do projeto, e para dar ao Administrador uma forma prática de revisar acessos, já que o cadastro de usuários de "Acesso limitado" é automático a partir do primeiro login bem-sucedido de qualquer conta Google.

---

## 7. Fora de Escopo

- **Integração com marketplaces** (ex.: Mercado Livre). O cliente pretende vender futuramente em marketplaces, mas essa integração fica registrada como fase futura.
- **Recuperação de carrinho abandonado.** Fora de escopo porque a loja não possui e-commerce próprio hoje.
- **Envio via API oficial do WhatsApp.** A primeira versão utiliza a conexão de WhatsApp Web; a migração para a API oficial é um passo futuro, condicionado à decisão do cliente de investir nessa mudança. A camada de abstração de mensageria (seção 9) já é construída pensando nessa migração futura.
- **Acesso de vendedores ao sistema.** Vendedores apenas recebem notificações pontuais por WhatsApp; não têm login nem qualquer tela do CRM Live.
- **Cadastro manual de clientes.** O CRM Live não permite criar um cliente diretamente no sistema — todo cliente tem origem em uma importação do Uniplus.
- **Integração com o sistema "Integrar" e com hospedagem Hostinger.** Não fazem parte do escopo desta versão.
- **Soft delete (exclusão lógica com recuperação).** Não incluído nesta versão — ver seção 18.
- **Log de erros técnicos com contingência formal em arquivo, como recurso estrutural obrigatório.** Não foi incluído como item formal desta versão — ver seção 19 e o ponto de atenção registrado na seção 27.
- **Ambiente de testes/homologação separado.** Nesta versão, a validação ocorre localmente antes de publicar em produção.
- **Terceiro perfil de acesso** além de Administrador e Acesso limitado.

---

## 8. Perfis de Usuário e Permissões

### 8.1 Administrador

- **Descrição:** a primeira conta Google que autenticar com sucesso no sistema em produção. Permanece Administrador de forma definitiva.
- **Permissões:** acesso completo a todas as funcionalidades do sistema, incluindo as exclusivas: gestão de modelos de mensagem (templates), cupons/vouchers, giftback/cashback, caixa de entrada (atendimento ao cliente), ações sobre notas de NPS, parâmetros globais do sistema e gestão de usuários do CRM Live (seção 6.12). Também pode fazer tudo o que o perfil de Acesso limitado pode fazer.
- **Restrições:** não pode alterar dados de origem no Uniplus (a integração é somente leitura, por regra arquitetural do projeto).
- **Áreas acessíveis:** todas.
- **Ações bloqueadas:** nenhuma dentro do próprio CRM Live, exceto a escrita na base do Uniplus.

### 8.2 Acesso limitado

- **Descrição:** qualquer conta Google que autentique com sucesso após a primeira conta (o Administrador). O papel é atribuído automaticamente, sem necessidade de convite ou aprovação prévia.
- **Permissões:** visualizar todas as telas e relatórios do sistema; editar campos complementares do cliente; criar/editar segmentos dinâmicos; criar/editar/ativar réguas de automação; criar, disparar e agendar campanhas manuais; configurar produtos complementares (cross-sell) e o percentual de desconto associado; cadastrar e editar vendedores (incluindo a fila de rodízio).
- **Restrições:** não pode criar/editar modelos de mensagem (templates), cupons/vouchers, giftback/cashback; não acessa a caixa de entrada (atendimento ao cliente); não executa ações sobre notas de NPS; não altera parâmetros globais do sistema; não acessa a tela de gestão de usuários do CRM Live.
- **Áreas acessíveis:** todas as telas, em modo de visualização; edição restrita conforme descrito acima.
- **Ações bloqueadas:** todas as ações exclusivas do Administrador (listadas na seção 8.1) devem ser bloqueadas tanto na interface (ocultando ou desabilitando o controle) quanto no backend (o Controller deve rejeitar a ação mesmo que a requisição seja feita diretamente à API).

### 8.3 Vendedor (sem acesso ao sistema)

- **Descrição:** vendedor da loja, cadastrado no CRM Live e vinculado ao vendedor correspondente no Uniplus. Não faz login no sistema.
- **Permissões:** nenhuma dentro do CRM Live. Recebe, pelo próprio WhatsApp, o nome e o número de um cliente que demonstrou intenção de compra ou dúvida.
- **Restrições:** não acessa nenhuma tela, relatório ou dado do sistema além do que recebe na mensagem de encaminhamento de lead.

### 8.4 Cliente da loja (sem acesso ao sistema)

- **Descrição:** pessoa física que compra na loja, com origem no cadastro do Uniplus. Não acessa o sistema.
- **Permissões:** recebe mensagens automáticas e campanhas via WhatsApp; pode responder mensagens; pode solicitar saída da lista de comunicações.
- **Restrições:** não acessa o CRM Live nem qualquer informação armazenada sobre si além do que recebe por mensagem.

### 8.5 Matriz de permissões (telas e ações principais)

| Tela / Ação | Administrador | Acesso limitado |
| --- | --- | --- |
| Dashboard geral e relatórios | Visualizar / Exportar | Visualizar / Exportar |
| Ficha do cliente (visão 360º) | Visualizar / Editar campos complementares | Visualizar / Editar campos complementares |
| Segmentação (RFM e dinâmica) | Visualizar / Criar / Editar | Visualizar / Criar / Editar |
| Réguas de relacionamento | Visualizar / Criar / Editar / Ativar | Visualizar / Criar / Editar / Ativar |
| Campanhas manuais | Visualizar / Criar / Disparar / Agendar | Visualizar / Criar / Disparar / Agendar |
| Modelos de mensagem (templates) | Visualizar / Criar / Editar | Somente visualizar |
| Cupons / vouchers | Visualizar / Criar / Editar | Somente visualizar |
| Giftback / cashback | Visualizar / Criar / Editar | Somente visualizar |
| Cross-sell (produtos complementares e desconto) | Visualizar / Criar / Editar | Visualizar / Criar / Editar |
| Cadastro de vendedores e fila de rodízio | Visualizar / Criar / Editar | Visualizar / Criar / Editar |
| Caixa de entrada (atendimento) | Visualizar / Responder | Sem acesso |
| Gestão de NPS (ações) | Visualizar / Executar ações | Somente visualizar notas |
| Relatório de consentimento (LGPD) | Visualizar / Exportar | Visualizar / Exportar |
| Painel de status de sincronização | Visualizar | Visualizar |
| Configurações e parâmetros globais | Visualizar / Editar | Somente visualizar |
| Gestão de usuários do CRM Live | Visualizar / Desativar acesso | Sem acesso |

---

## 9. Recursos Estruturais do Sistema

### 9.1 Autenticação
- **Objetivo:** garantir que apenas usuários autenticados via Google acessem o sistema, sem necessidade de senha própria.
- **Onde é aplicado:** em toda rota da API que não seja o próprio fluxo de login.
- **Comportamento esperado:** login via "Entrar com Google" (OAuth 2.0); primeira conta autenticada em produção vira Administrador de forma permanente; contas seguintes viram automaticamente "Acesso limitado". Detalhamento completo na seção 15.
- **Permissões envolvidas:** define o papel do usuário (Administrador ou Acesso limitado) usado por todo o controle de acesso do sistema.
- **Cuidados de segurança:** token de sessão assinado, transmitido em cookie `httpOnly` e `secure`; nenhuma senha é armazenada pelo CRM Live.
- **Critérios de validação:** login concluído com sucesso gera sessão válida; tentativa de acesso sem sessão válida a qualquer rota protegida deve ser recusada com erro 401.

### 9.2 RBAC (controle de acesso por papel)
- **Objetivo:** restringir funcionalidades conforme o papel do usuário (ver seção 8).
- **Onde é aplicado:** em cada Controller da API e em cada tela/ação do frontend.
- **Comportamento esperado:** toda ação exclusiva do Administrador deve ser validada no backend, independentemente do que a interface esconde.
- **Permissões envolvidas:** Administrador e Acesso limitado, conforme seção 8.
- **Cuidados de segurança:** validação de permissão sempre no backend, nunca apenas na interface.
- **Critérios de validação:** uma chamada direta à API tentando executar uma ação exclusiva do Administrador, feita por um usuário de Acesso limitado, deve ser recusada com erro 403 e gerar um evento no log de segurança.

### 9.3 Auditoria
- **Objetivo:** garantir rastreabilidade de disparos de mensagens e do tratamento de notas de satisfação baixas.
- **Onde é aplicado:** todo envio de mensagem (automática ou manual) e toda ação tomada sobre uma nota de NPS.
- **Comportamento esperado:** cada mensagem enviada registra quem/o quê originou o envio (régua, campanha ou resposta manual), quando ocorreu e qual modelo foi usado; cada ação sobre uma nota de NPS registra quem tratou, qual ação foi tomada e qual foi o resultado.
- **Permissões envolvidas:** consulta disponível a Administrador e Acesso limitado (log de disparos); ações de NPS exclusivas do Administrador.
- **Cuidados de segurança:** os registros de auditoria não podem ser editados ou excluídos pela interface do sistema.
- **Critérios de validação:** toda mensagem enviada pelo sistema possui um registro correspondente no log de disparos, sem exceção.

### 9.4 Soft delete
- Não incluído nesta versão (decisão explícita do projeto). Exclusões de registros configuráveis (réguas, templates, vendedores, segmentos, cupons) usam ativação/desativação lógica simples (campo "ativo") para uso operacional do dia a dia, e não um mecanismo de exclusão reversível com fins de auditoria. Registros referenciados por histórico (ex.: template já usado em uma mensagem enviada, cupom já usado em uma venda) não podem ser removidos definitivamente — a tentativa de remoção deve ser bloqueada pela integridade referencial do banco de dados (chave estrangeira com restrição), preservando o histórico mesmo sem soft delete.

### 9.5 Log de erros
- Não incluído como recurso estrutural formal nesta versão (decisão explícita do projeto) — ver seção 19 para o detalhamento do que isso significa na prática e o ponto de atenção registrado na seção 27, dado que o sistema roda sem supervisão constante.

### 9.6 Log de segurança
- **Objetivo:** registrar eventos sensíveis para permitir revisão posterior.
- **Onde é aplicado:** fluxo de autenticação, controle de acesso, consentimento e sessão de WhatsApp.
- **Comportamento esperado:** ver lista de eventos na seção 19 ("Log de segurança").
- **Permissões envolvidas:** consulta disponível apenas ao Administrador.
- **Cuidados de segurança:** os registros não podem ser editados ou excluídos pela interface.
- **Critérios de validação:** todo evento listado na seção 19 gera um registro correspondente.

### 9.7 Configurações globais
- Detalhadas na seção 20.

### 9.8 Uploads e anexos
- Detalhados na seção 21 (imagens em modelos de mensagem).

### 9.9 Exportações
- Detalhadas na seção 22 (CSV em relatórios/listagens; PDF em dashboard geral e desempenho de campanha).

### 9.10 APIs e integrações externas
- Nenhuma API externa exposta pelo CRM Live nesta versão. A única integração externa é a leitura somente-leitura do banco PostgreSQL do Uniplus e a conexão com o WhatsApp Web (biblioteca de automação, não uma API exposta pelo CRM Live) — ver seção 23.

### 9.11 Camada de abstração de mensageria
- **Objetivo:** permitir a troca futura do mecanismo de envio de WhatsApp (de conexão não oficial via WhatsApp Web para a API oficial) sem impacto para as réguas, campanhas e demais funcionalidades que dependem de envio de mensagem.
- **Onde é aplicado:** todo ponto do sistema que envia mensagem ao cliente ou ao vendedor passa por uma interface única de envio (`integrations/whatsapp/`), nunca por chamada direta à biblioteca de automação.
- **Comportamento esperado:** a interface expõe operações genéricas (ex.: enviar mensagem de texto, enviar mensagem com imagem, verificar status de entrega), implementadas hoje por um provedor `whatsapp_web` e, futuramente, por um provedor `cloud_api`, sem alterar o código das réguas, campanhas ou caixa de entrada.
- **Permissões envolvidas:** não é uma tela, é uma camada técnica interna.
- **Cuidados de segurança:** a troca de provedor deve ser feita por configuração (`config/settings.js`), sem exigir alteração nas regras de negócio.
- **Critérios de validação:** nenhuma régua, campanha ou funcionalidade de atendimento deve referenciar diretamente a biblioteca de automação de WhatsApp Web — todas devem passar pela interface de abstração.

---

## 10. Entidades do Sistema

Todas as entidades a seguir residem na base de dados própria do CRM Live (PostgreSQL), separada da base do Uniplus. As entidades marcadas como "espelho" são alimentadas exclusivamente pela sincronização somente-leitura com o Uniplus (seção 6.9); as demais são geradas e mantidas pelo próprio CRM Live.

| Entidade | Finalidade | Espelho do Uniplus? | Soft delete? | Auditoria? |
| --- | --- | --- | --- | --- |
| Usuário do CRM Live | Conta autenticada via Google, com papel Administrador ou Acesso limitado. | Não | Não (desativação lógica simples) | Sim (log de segurança) |
| Cliente | Dados cadastrais e histórico de compras (do Uniplus) + campos complementares próprios do CRM. | Parcial (base é espelho; campos complementares são próprios) | Não | Não |
| Vendedor | Cadastro do vendedor vinculado ao Uniplus, com posição na fila de rodízio. | Parcial (vínculo ao Uniplus; cadastro é próprio do CRM) | Não | Não |
| Venda | Registro de venda importado do Uniplus, aciona automações. | Sim | Não | Não |
| Item de venda | Produtos de cada venda importada. | Sim | Não | Não |
| Produto | Catálogo de produtos importado do Uniplus. | Sim | Não | Não |
| Estoque (nível de produto) | Quantidade em estoque de cada produto, importada do Uniplus. | Sim | Não | Não |
| Produto complementar (cross-sell) | Relação entre produto e seu complemento sugerido/configurado. | Não | Não | Não |
| Tag | Etiqueta livre aplicável a clientes. | Não | Não | Não |
| Segmento dinâmico | Filtro salvo combinando critérios de segmentação. | Não | Não (ativo/inativo) | Não |
| Régua de relacionamento (automação) | Definição de gatilho + condição + ação de uma automação. | Não | Não | Não (ativo/inativo) |
| Execução de régua | Registro de aplicação de uma régua a um cliente, evita duplicidade. | Não | Não | Sim |
| Modelo de mensagem (template) | Texto reutilizável com variáveis, imagem e link opcionais. | Não | Não | Não (ativo/inativo) |
| Anexo de template | Imagem vinculada a um modelo de mensagem. | Não | Não | Não |
| Campanha manual | Campanha criada pelo usuário, com segmento, template, agendamento. | Não | Não | Sim (resultado do envio) |
| Destinatário de campanha | Relação entre campanha e cliente, com status de envio/entrega/resposta. | Não | Não | Sim |
| Cupom/voucher | Código de desconto único, com validade. | Não | Não | Sim (uso registrado) |
| Giftback/cashback | Crédito percentual sobre compra futura, com validade. | Não | Não | Sim (uso registrado) |
| Consentimento | Registro de opt-in/opt-out por cliente. | Não | Não | Sim |
| Conversa | Agrupamento de mensagens trocadas com um cliente. | Não | Não | Não |
| Mensagem | Cada mensagem enviada ou recebida (também serve como log de disparo). | Não | Não | Sim |
| Encaminhamento de lead | Registro de encaminhamento de cliente a um vendedor. | Não | Não | Sim |
| Nota de satisfação (NPS) | Resposta do cliente à pesquisa de satisfação. | Não | Não | Não |
| Tratamento de nota de NPS | Ação tomada sobre uma nota, com responsável e resultado. | Não | Não | Sim |
| Configuração/parâmetro | Valor configurável do sistema (tempos, limites, percentuais). | Não | Não | Sim (quem alterou) |
| Execução de sincronização | Registro de cada execução da sincronização com o Uniplus. | Não | Não | Sim |
| Evento de segurança | Registro de eventos sensíveis (login, permissão, opt-out, sessão do WhatsApp). | Não | Não | Sim (é o próprio log) |

**Regras gerais de criação, edição, exclusão e visualização:**
- Entidades marcadas como "espelho" nunca são criadas, editadas ou excluídas pela interface do CRM Live — apenas pelo job de sincronização.
- Entidades próprias do CRM Live (réguas, templates, cupons, giftback, vendedores, segmentos) usam o campo "ativo" para desativação lógica simples; exclusão definitiva só é permitida quando não há histórico vinculado (ex.: template nunca usado em uma mensagem enviada).
- Registros de auditoria (mensagens, execuções de régua, tratamentos de NPS, eventos de segurança, execuções de sincronização) nunca são editáveis ou excluíveis pela interface.

---

## 11. Modelo de Dados Proposto

### 11.1 Convenções

- Nomes de tabelas e colunas em inglês, no padrão `snake_case`; comentários de código em português quando necessário para explicar regras de negócio não óbvias.
- Toda tabela própria do CRM Live (não-espelho) possui campos de auditoria mínimos: `created_at` (timestamp), `updated_at` (timestamp), e, quando fizer sentido, `created_by` / `updated_by` (referência ao usuário do CRM Live).
- Tabelas-espelho do Uniplus possuem, adicionalmente, `synced_at` (timestamp da última sincronização) e um identificador do registro de origem no Uniplus (ex.: `uniplus_id`), com restrição de unicidade.
- Soft delete não é utilizado (seção 9.4); entidades configuráveis usam campo booleano `active`.

### 11.2 Tabelas principais (nível funcional)

**users** (usuários do CRM Live)
- `id` (PK), `google_subject` (identificador único da conta Google, unique, not null), `email` (unique, not null), `name`, `avatar_url`, `role` (enum: `admin`, `limited`, not null), `active` (boolean, default true), `created_at`, `last_login_at`.
- Índice único em `google_subject` e em `email`.
- Regra: apenas um registro pode ter `role = admin` — deve ser garantido pela lógica de criação do primeiro usuário, não apenas por constraint de banco.

**customers** (clientes — espelho + campos complementares)
- `id` (PK), `uniplus_id` (unique, not null), `name`, `phone_e164`, `whatsapp_validated` (boolean, default false), `document`, `email`, `first_purchase_at`, `last_purchase_at`, `average_ticket` (numeric), `purchase_frequency_days` (integer), `rfm_segment` (text/enum), `birth_date` (campo complementar próprio), `preferences` (jsonb, campo complementar próprio), `preferred_channel` (campo complementar próprio), `synced_at`, `created_at`, `updated_at`.
- Índices: `phone_e164` (busca), índice de texto para busca por `name`, índice em `last_purchase_at` (elegibilidade de réguas de reativação), índice em `rfm_segment`.
- Constraint: `uniplus_id` unique e not null — reforça que todo cliente tem origem no Uniplus.

**customer_tags** (associação cliente–tag)
- `customer_id` (FK → customers), `tag_id` (FK → tags), chave primária composta.

**tags**
- `id` (PK), `name` (unique), `created_at`.

**dynamic_segments** (segmentos dinâmicos salvos)
- `id` (PK), `name`, `filter_criteria` (jsonb — critérios combináveis: categoria de produto, faixa de ticket médio, período, bairro/cidade, tags), `active` (boolean, default true), `created_by` (FK → users), `created_at`, `updated_at`.
- Índice em `active`.
- Usada pela tela de Segmentação (12.4) para listar, reutilizar e editar segmentos salvos; uma campanha pode referenciar um segmento salvo (`campaigns.segment_id`) ou usar um filtro ad-hoc não salvo.

**sellers** (vendedores)
- `id` (PK), `uniplus_seller_id` (nullable — vínculo ao vendedor do Uniplus), `name`, `whatsapp_phone`, `active` (boolean), `rotation_last_assigned_at` (timestamp, nullable — usado para calcular o próximo da fila de rodízio), `created_at`, `updated_at`.
- Índice em `active` e em `rotation_last_assigned_at` (consulta do próximo da fila).

**sales** (vendas — espelho)
- `id` (PK), `uniplus_id` (unique, not null), `customer_id` (FK → customers, nullable até vínculo), `seller_id` (FK → sellers, nullable), `sale_date` (timestamp, not null), `total_amount` (numeric), `synced_at`, `created_at`.
- Índices: `sale_date` (usado em atribuição de campanha e relatórios), `customer_id`, `seller_id`.

**sale_items**
- `id` (PK), `sale_id` (FK → sales), `product_id` (FK → products), `quantity`, `unit_price`.
- Índice em `sale_id` e em `product_id`.

**products** (produtos — espelho)
- `id` (PK), `uniplus_id` (unique, not null), `name`, `category`, `price` (numeric), `active` (boolean), `synced_at`, `created_at`, `updated_at`.
- Índice em `category`.

**stock_snapshots** (estoque — espelho)
- `id` (PK), `product_id` (FK → products), `quantity` (integer), `synced_at`.
- Índice em `product_id` + `synced_at` (para detectar transição de "sem estoque" para "com estoque").

**complementary_products** (relação de cross-sell)
- `id` (PK), `product_id` (FK → products), `complementary_product_id` (FK → products), `source` (enum: `manual`, `suggested`), `active` (boolean), `created_by` (FK → users), `created_at`.
- Constraint de unicidade em (`product_id`, `complementary_product_id`).

**automation_rules** (réguas de relacionamento)
- `id` (PK), `name`, `trigger_type` (enum: `sale_created`, `days_without_purchase`, `birthday`, `stock_replenished`, `nps_survey`, `consumption_cycle`, `first_identified_purchase`), `conditions` (jsonb), `action_type` (enum: `send_message`), `message_template_id` (FK → message_templates), `cascade_step` (integer, nullable — para réguas em cascata como o win-back), `delay_minutes` (integer, nullable — ex.: 30 minutos para NPS), `active` (boolean), `created_by` (FK → users), `created_at`, `updated_at`.
- O gatilho `first_identified_purchase` implementa o incentivo ao cadastro (seção 6.1): dispara quando uma venda sincronizada é a primeira venda vinculada a um cliente que nunca teve venda anterior vinculada no CRM Live.

**automation_rule_executions** (controle de execução, evita duplicidade)
- `id` (PK), `automation_rule_id` (FK → automation_rules), `customer_id` (FK → customers), `trigger_reference` (texto/UUID — ex.: id da venda que originou o disparo), `executed_at`, `status` (enum: `sent`, `skipped_no_consent`, `skipped_suppressed`, `failed`).
- Constraint de unicidade em (`automation_rule_id`, `customer_id`, `trigger_reference`) — impede duplicidade de disparo para o mesmo evento.
- Índice em `customer_id` e em `executed_at`.

**message_templates** (modelos de mensagem)
- `id` (PK), `name`, `body_text`, `variables` (jsonb — lista de variáveis suportadas), `image_attachment_id` (FK → attachments, nullable), `link_url` (nullable), `active` (boolean), `created_by` (FK → users), `created_at`, `updated_at`.

**attachments** (uploads de imagem de template)
- `id` (PK), `template_id` (FK → message_templates, nullable até vínculo), `file_path` (caminho interno, fora de pasta pública), `original_filename`, `mime_type`, `size_bytes`, `uploaded_by` (FK → users), `created_at`.
- Constraint: `mime_type` restrito a `image/jpeg`, `image/png`, `image/webp`; `size_bytes` com verificação de limite máximo de 5MB.

**campaigns** (campanhas manuais)
- `id` (PK), `name`, `segment_id` (FK → dynamic_segments, nullable — preenchido quando a campanha usa um segmento salvo), `segment_filter` (jsonb — critério de segmentação usado, congelado no momento da criação, copiado do segmento salvo ou definido ad-hoc), `message_template_id` (FK → message_templates), `coupon_id` (FK → coupons, nullable), `giftback_rule_id` (FK → giftback_credits, nullable, conforme modelagem de emissão em massa), `scheduled_at` (timestamp, nullable), `status` (enum: `draft`, `scheduled`, `sending`, `sent`, `canceled`), `created_by` (FK → users), `created_at`, `sent_at`.
- Índice em `status`, em `scheduled_at` e em `segment_id`.

**campaign_recipients**
- `id` (PK), `campaign_id` (FK → campaigns), `customer_id` (FK → customers), `status` (enum: `pending`, `sent`, `delivered`, `responded`, `failed`, `suppressed`), `sent_at`, `delivered_at`, `responded_at`.
- Constraint de unicidade em (`campaign_id`, `customer_id`).
- Índice em `campaign_id` e em `status`.

**coupons**
- `id` (PK), `code` (unique, not null), `description`, `discount_type` (enum: `percent`, `fixed`), `discount_value` (numeric), `valid_from`, `valid_until`, `campaign_id` (FK → campaigns, nullable), `status` (enum: `active`, `used`, `expired`, default `active`), `used_by_customer_id` (FK → customers, nullable), `used_in_sale_id` (FK → sales, nullable), `redeemed_at` (timestamp, nullable), `created_by` (FK → users), `created_at`.
- Índice em `status` e em `used_by_customer_id`.
- Regra de uso: um cupom só pode ser marcado como `used` uma vez; a venda usada para identificar o resgate (`used_in_sale_id`) segue o mesmo critério de atribuição por período descrito na seção 14.5, já que o Uniplus não registra o código do cupom aplicado a uma venda.

**giftback_credits**
- `id` (PK), `customer_id` (FK → customers), `campaign_id` (FK → campaigns, nullable), `credit_percent` (numeric, nullable), `credit_value` (numeric, nullable), `valid_until`, `status` (enum: `available`, `used`, `expired`), `used_in_sale_id` (FK → sales, nullable), `created_at`.
- Índice em `customer_id` + `status`.

**consents** (opt-in/opt-out)
- `id` (PK), `customer_id` (FK → customers, unique), `opted_in` (boolean, default false), `opted_in_at`, `opted_in_source`, `opted_out` (boolean, default false), `opted_out_at`, `opted_out_source`.
- Índice em `opted_out` (consultado a cada disparo, deve ser rápido).

**conversations**
- `id` (PK), `customer_id` (FK → customers), `status` (enum: `automated`, `awaiting_human`, `answered`, `closed`), `last_message_at`, `created_at`.
- Índice em `customer_id` e em `status`.

**messages** (mensagens trocadas — também serve de log de disparo)
- `id` (PK), `conversation_id` (FK → conversations), `customer_id` (FK → customers), `direction` (enum: `outbound`, `inbound`), `body`, `template_id` (FK → message_templates, nullable), `automation_rule_id` (FK → automation_rules, nullable), `campaign_id` (FK → campaigns, nullable), `trigger_source` (enum: `automation`, `campaign`, `manual`, `customer`), `status` (enum: `queued`, `sent`, `delivered`, `read`, `failed`), `external_message_id` (nullable), `sent_at`, `created_at`.
- Índices: `customer_id` + `created_at` (linha do tempo), `campaign_id`, `automation_rule_id`, `created_at` (log de disparos por período).

**lead_forwards** (encaminhamento de lead ao vendedor)
- `id` (PK), `conversation_id` (FK → conversations), `customer_id` (FK → customers), `seller_id` (FK → sellers), `reason` (enum: `purchase_intent`, `doubt`), `routing_method` (enum: `last_sale_seller`, `rotation_queue`), `forwarded_at`.
- Índice em `customer_id` e em `seller_id`.

**nps_responses**
- `id` (PK), `customer_id` (FK → customers), `sale_id` (FK → sales), `survey_sent_at`, `responded_at` (nullable), `score` (integer 0–10, nullable até resposta), `status` (enum: `pending`, `answered`, `low_score_open`, `low_score_treated`).
- Índices: `score`, `responded_at`, e índices combinados para os filtros de vendedor/categoria de produto via `sale_id`/`sale_items`.

**nps_treatments**
- `id` (PK), `nps_response_id` (FK → nps_responses), `action_type` (enum: `message`, `discount`, `voucher`, `other`), `description`, `performed_by` (FK → users), `result`, `created_at`.
- Índice em `nps_response_id`.

**system_settings** (configurações/parâmetros)
- `id` (PK), `key` (unique, not null), `value` (jsonb), `description`, `updated_by` (FK → users), `updated_at`.

**sync_runs** (status de sincronização com o Uniplus)
- `id` (PK), `started_at`, `finished_at` (nullable), `status` (enum: `running`, `success`, `partial_error`, `failed`), `records_imported` (jsonb — contagem por entidade), `errors` (jsonb, nullable), `triggered_by` (enum: `scheduler`, `manual`).
- Índice em `started_at`.

**security_events** (log de segurança)
- `id` (PK), `event_type` (enum: `login_success`, `login_failed`, `permission_denied`, `customer_opt_out`, `user_access_changed`, `whatsapp_session_down`), `user_id` (FK → users, nullable), `customer_id` (FK → customers, nullable), `ip_address` (nullable), `details` (jsonb), `created_at`.
- Índice em `event_type` + `created_at`.

**schema_migrations** (controle de migrations executadas)
- `id` (PK), `migration_name` (unique, not null), `executed_at` (timestamp, not null).

### 11.3 Observações sobre integridade dos dados

- Toda tabela que referencia `customers`, `sellers`, `products` ou `sales` deve usar chave estrangeira com `ON DELETE RESTRICT` para tabelas de histórico (mensagens, execuções de régua, tratamentos de NPS, destinatários de campanha), preservando a integridade da auditoria mesmo sem soft delete.
- As tabelas-espelho (`customers`, `sales`, `sale_items`, `products`, `stock_snapshots`) nunca devem ser alteradas por uma rota de escrita comum da API — apenas pelo job de sincronização, que deve rodar com um usuário de banco de dados com permissão de escrita apenas nessas tabelas específicas.
- O acesso ao banco do Uniplus deve usar um usuário de banco de dados dedicado, com permissão de **somente leitura**, configurado no arquivo de configuração do backend (seção 5.5).

### 11.4 Estratégia de migrations

O projeto deve utilizar uma arquitetura de migrations versionadas para criar e atualizar a estrutura do banco de dados próprio do CRM Live, evitando que o usuário precise criar tabelas, campos ou índices manualmente em qualquer ferramenta de administração de banco.

- As migrations devem contemplar, quando aplicável: criação das tabelas descritas na seção 11.2; criação dos campos e seus tipos; definição de chaves primárias e estrangeiras; criação dos índices citados; criação das constraints (unicidade, `NOT NULL`, restrições de enum/domínio); criação dos campos de auditoria (`created_at`, `updated_at`, `created_by`); dados iniciais obrigatórios apenas quando estritamente necessários (ex.: valores padrão de `system_settings`, se a operação do sistema depender deles para não falhar no primeiro uso).
- As migrations devem ficar em uma pasta interna do projeto: `backend/app/database/migrations/`, protegida contra acesso direto por URL conforme a seção 5.4.
- O controle de execução deve ser feito por uma tabela própria (`schema_migrations`), registrando o nome de cada migration já executada, para impedir execução duplicada.
- A execução das migrations deve ocorrer apenas por um meio controlado: um comando interno de linha de comando executado dentro do container do backend (ex.: `docker compose exec backend node app/database/migrate.js`), disparado manualmente pelo responsável técnico durante o deploy ou a atualização do sistema. Não deve existir nenhuma rota HTTP pública que execute migrations. Caso, no futuro, seja necessário oferecer esse controle por uma tela administrativa, ela deve ser restrita ao Administrador, exigir autenticação válida e confirmação explícita antes da execução — mas a forma padrão recomendada por este FSD é a execução por linha de comando controlada.

---

## 12. Módulos e Telas

Para cada tela, os campos de layout detalhado (cores, tipografia, espaçamento, raio, componentes) devem seguir o design system definido em `docs/Design/design.md` ("Admin Logic"), implementado como tema customizado do Material UI (MUI) — não o tema padrão do MUI. As descrições abaixo definem o conteúdo funcional de cada tela; a aparência segue os tokens e diretrizes de componentes do design.md.

### 12.1 Login
- **Objetivo:** autenticar o usuário via Google.
- **Usuários:** todos (ponto de entrada).
- **Ações principais:** botão "Entrar com Google".
- **Campos/informações exibidas:** nome e breve descrição do sistema.
- **Estados importantes:** carregando (aguardando retorno do Google); erro (falha de autenticação, com mensagem genérica e seção "tentar novamente"); sucesso (redirecionamento ao dashboard).

### 12.2 Dashboard geral
- **Objetivo:** visão geral da saúde do relacionamento com os clientes.
- **Usuários:** Administrador, Acesso limitado.
- **Ações principais:** filtrar por período; exportar em PDF/CSV.
- **Campos/informações exibidas:** taxa de recompra, ticket médio, frequência de compra, clientes ativos x inativos, NPS médio.
- **Filtros e buscas:** período.
- **Estados importantes:** carregando; vazio (base ainda sem dados suficientes, ex.: antes da primeira sincronização); erro ao carregar indicadores.

### 12.3 Clientes — lista e ficha 360º
- **Objetivo:** consultar e gerenciar a base de clientes.
- **Usuários:** Administrador, Acesso limitado.
- **Ações principais:** buscar por nome/telefone; filtrar por segmento, tag, RFM; abrir ficha do cliente; editar campos complementares.
- **Campos/informações exibidas (lista):** nome, telefone, última compra, segmento RFM, status de consentimento.
- **Campos/informações exibidas (ficha):** dados cadastrais, histórico de compras, ticket médio, frequência, linha do tempo de interações, campos complementares (aniversário, preferências, tags, canal preferido), status de consentimento.
- **Botões e ações:** editar campos complementares; adicionar/remover tag.
- **Mensagens esperadas:** confirmação ao salvar campos complementares; aviso quando o telefone não está validado como WhatsApp.
- **Estados importantes:** vazio (nenhum cliente sincronizado ainda); carregando; sem permissão (não se aplica — visível a ambos os perfis).

### 12.4 Segmentação
- **Objetivo:** consultar classificação RFM e criar segmentos dinâmicos.
- **Usuários:** Administrador, Acesso limitado.
- **Ações principais:** criar/editar segmento com filtros combináveis; salvar segmento para uso em campanhas.
- **Campos/informações exibidas:** lista de segmentos salvos, quantidade de clientes por segmento, critérios usados.
- **Filtros e buscas:** categoria de produto, faixa de ticket, período, bairro/cidade, tags.
- **Estados importantes:** vazio; carregando; erro de validação (filtro sem nenhum cliente correspondente — aviso, não bloqueio).

### 12.5 Réguas de relacionamento
- **Objetivo:** configurar e gerenciar automações.
- **Usuários:** Administrador, Acesso limitado.
- **Ações principais:** criar régua (escolher gatilho, condição, ação/modelo de mensagem); para a régua de reativação em cascata, definir o número de dias sem comprar de cada etapa diretamente na condição da régua (editável por Administrador e Acesso limitado, e não pela tela de Configurações — seção 20); ativar/desativar régua; para a régua de reativação, consultar tela de clientes elegíveis por etapa, com filtro por tempo sem comprar, opção de reenvio manual e consulta às interações.
- **Campos/informações exibidas:** nome da régua, gatilho, condição (incluindo dias sem comprar, quando aplicável), modelo de mensagem associado, status (ativa/inativa).
- **Filtros e buscas:** por tipo de gatilho, por status.
- **Mensagens esperadas:** confirmação ao ativar/desativar; aviso ao tentar ativar régua sem modelo de mensagem associado.
- **Estados importantes:** vazio; carregando; erro de validação (régua incompleta).

### 12.6 Campanhas
- **Objetivo:** criar, agendar e acompanhar campanhas manuais.
- **Usuários:** Administrador, Acesso limitado.
- **Ações principais:** selecionar segmento; escolher/criar modelo de mensagem; associar cupom/giftback (se existente); definir envio imediato ou agendado; confirmar disparo.
- **Campos/informações exibidas:** nome da campanha, segmento, modelo, status, quantidade de destinatários, resultado (enviadas, entregues, respondidas, vendas atribuídas, receita).
- **Filtros e buscas:** por status, por período.
- **Botões e ações:** salvar rascunho; agendar; enviar agora; cancelar (se ainda não enviada); exportar resultado.
- **Mensagens esperadas:** aviso de quantos destinatários foram removidos por falta de consentimento antes da confirmação do disparo; confirmação de agendamento/envio.
- **Estados importantes:** vazio; carregando; erro (falha ao validar destinatários); sem permissão (bloquear campos exclusivos do Administrador, como associar cupom novo, se a criação de cupom for exclusiva).

### 12.7 Modelos de mensagem (templates)
- **Objetivo:** gerenciar textos reutilizáveis com variáveis, imagem e link.
- **Usuários:** Administrador (edição); Acesso limitado (somente visualização).
- **Ações principais:** criar/editar template; inserir variáveis (nome, produto, desconto); anexar imagem; definir link.
- **Campos/informações exibidas:** nome, corpo do texto, variáveis suportadas, imagem anexada, status (ativo/inativo).
- **Mensagens esperadas:** erro ao anexar arquivo fora do tipo/tamanho permitido (seção 21); confirmação ao salvar.
- **Estados importantes:** vazio; carregando; sem permissão (Acesso limitado vê os campos desabilitados).

### 12.8 Cupons e Giftback/Cashback
- **Objetivo:** gerenciar ofertas de desconto e crédito.
- **Usuários:** Administrador (edição); Acesso limitado (somente visualização).
- **Ações principais:** criar cupom (código, tipo e valor de desconto, validade); criar regra de giftback (percentual/valor, validade).
- **Campos/informações exibidas:** código, tipo, valor, validade, status, campanha de origem (se houver), quantidade de usos.
- **Mensagens esperadas:** erro ao tentar criar código duplicado; aviso de cupom vencido.
- **Estados importantes:** vazio; carregando; sem permissão.

### 12.9 Cross-sell (produtos complementares)
- **Objetivo:** configurar quais produtos são oferecidos juntos.
- **Usuários:** Administrador, Acesso limitado.
- **Ações principais:** associar produto complementar manualmente; revisar sugestões automáticas baseadas em histórico de vendas; definir, diretamente nesta tela, o percentual de desconto do cross-sell (editável por Administrador e Acesso limitado — não faz parte da tela de Configurações, seção 12.13, que é exclusiva do Administrador).
- **Campos/informações exibidas:** produto, complemento(s) associado(s), origem (manual/sugerido), status, percentual de desconto vigente.
- **Estados importantes:** vazio; carregando.

### 12.10 Caixa de entrada (conversas)
- **Objetivo:** centralizar e responder mensagens recebidas dos clientes.
- **Usuários:** Administrador (exclusivo).
- **Ações principais:** visualizar lista de conversas (priorizando as aguardando atendimento humano); abrir conversa; responder ao cliente; visualizar se um lead já foi encaminhado a um vendedor.
- **Campos/informações exibidas:** nome do cliente, última mensagem, horário, status da conversa.
- **Filtros e buscas:** por status (aguardando, respondida, encerrada).
- **Mensagens esperadas:** confirmação de envio da resposta; aviso de falha de envio.
- **Estados importantes:** vazio (nenhuma conversa); carregando; sem permissão (Acesso limitado não vê esta tela no menu, e uma tentativa direta de acesso deve ser bloqueada).

### 12.11 Vendedores e fila de rodízio
- **Objetivo:** gerenciar o cadastro de vendedores e a fila de rodízio de leads.
- **Usuários:** Administrador, Acesso limitado.
- **Ações principais:** cadastrar/editar vendedor (nome, WhatsApp, vínculo com o Uniplus); ativar/desativar vendedor; visualizar posição atual na fila de rodízio.
- **Campos/informações exibidas:** nome, WhatsApp, status, data do último lead recebido pela fila.
- **Estados importantes:** vazio; carregando; erro de validação (WhatsApp inválido).

### 12.12 Gestão de satisfação (NPS)
- **Objetivo:** acompanhar e tratar notas de satisfação.
- **Usuários:** Administrador (exclusivo para ações).
- **Ações principais:** visualizar notas agrupadas por faixa; filtrar por período, vendedor, categoria de produto; a partir de uma nota, enviar mensagem padronizada, oferecer desconto/voucher, localizar vendedor responsável; consultar histórico de tratamento.
- **Campos/informações exibidas:** cliente, nota, data, produto/categoria, vendedor, status de tratamento.
- **Filtros e buscas:** faixa de nota, período, vendedor, categoria de produto.
- **Mensagens esperadas:** alerta destacado para notas baixas (6 ou menos) ainda não tratadas; confirmação ao registrar uma ação.
- **Estados importantes:** vazio; carregando; sem permissão (Acesso limitado vê a lista, mas sem os botões de ação).

### 12.13 Configurações e parâmetros
- **Objetivo:** ajustar os parâmetros técnicos e operacionais de escopo global do sistema (não inclui os parâmetros específicos de régua ou de cross-sell, editados em seus próprios módulos — ver 12.5 e 12.9).
- **Usuários:** Administrador (exclusivo).
- **Ações principais:** editar limite de mensagens por cliente/mês, janela de horário de envio, cadência de disparo, período de atribuição de venda a campanha, prazo de envio da pesquisa de satisfação e limite de nota baixa do NPS (detalhados na seção 20).
- **Campos/informações exibidas:** lista de parâmetros com valor atual, descrição e data da última alteração.
- **Mensagens esperadas:** confirmação ao salvar; validação de valores fora de faixa aceitável (ex.: percentual negativo).
- **Estados importantes:** carregando; sem permissão (Acesso limitado não acessa esta tela).

### 12.14 Painel de status de sincronização
- **Objetivo:** dar visibilidade sobre a saúde da integração com o Uniplus.
- **Usuários:** Administrador, Acesso limitado.
- **Ações principais:** consultar última execução; consultar histórico de execuções e erros.
- **Campos/informações exibidas:** data/hora da última execução, quantidade de registros importados por entidade, lista de erros (se houver).
- **Estados importantes:** vazio (nenhuma sincronização executada ainda); carregando; erro (última execução falhou — destaque visual).

### 12.15 Relatório de consentimento (LGPD)
- **Objetivo:** dar visibilidade sobre a base de consentimento.
- **Usuários:** Administrador, Acesso limitado.
- **Ações principais:** consultar/exportar lista de quem consentiu, quem saiu (opt-out) e quem nunca foi contatado.
- **Filtros e buscas:** por status de consentimento, por período.
- **Estados importantes:** vazio; carregando.

### 12.16 Relatório de vendas sem cliente identificado
- **Objetivo:** apoiar a captação de cadastros.
- **Usuários:** Administrador, Acesso limitado.
- **Ações principais:** consultar/exportar lista de vendas do Uniplus sem cliente vinculado.
- **Filtros e buscas:** por período.
- **Estados importantes:** vazio; carregando.

### 12.17 Gestão de usuários do CRM Live
- **Objetivo:** revisar e controlar acessos ao sistema (seção 6.12).
- **Usuários:** Administrador (exclusivo).
- **Ações principais:** visualizar lista de usuários; desativar acesso de um usuário de Acesso limitado.
- **Campos/informações exibidas:** e-mail, nome, papel, data do primeiro acesso, data do último acesso, status (ativo/inativo).
- **Mensagens esperadas:** confirmação ao desativar um usuário.
- **Estados importantes:** vazio (apenas o Administrador cadastrado até o momento); carregando; sem permissão.

---

## 13. Fluxos Funcionais

### 13.1 Login (OAuth Google)
- **Perfil que executa:** qualquer pessoa com uma conta Google.
- **Pré-condições:** nenhuma.
- **Passo a passo:**
  1. O usuário acessa a tela de login e clica em "Entrar com Google".
  2. O sistema redireciona ao fluxo de autenticação do Google.
  3. O Google retorna ao sistema com os dados da conta autenticada (identificador único, e-mail, nome).
  4. O backend verifica se já existe algum usuário cadastrado no CRM Live.
     - Se **não existir nenhum usuário**, o backend cria o novo usuário com papel `admin`.
     - Se **já existir ao menos um usuário**, o backend cria (ou reconhece, se já existir) o usuário com papel `limited`.
  5. O backend gera a sessão (token assinado, cookie `httpOnly`/`secure`) e registra o evento `login_success` no log de segurança.
  6. O usuário é redirecionado ao Dashboard.
- **Resultado esperado:** sessão válida criada; usuário reconhecido com o papel correto.
- **Erros possíveis:** falha na autenticação do Google (mensagem genérica de erro, opção de tentar novamente; evento `login_failed` registrado no log de segurança).
- **Regras de permissão:** não se aplica antes do login.
- **Logs gerados:** `login_success` ou `login_failed` no log de segurança.

### 13.2 Agradecimento automático pós-venda
- **Perfil que executa:** sistema (job automático), sem intervenção do usuário.
- **Pré-condições:** venda sincronizada da base do Uniplus; régua de agradecimento pós-venda ativa.
- **Passo a passo:**
  1. Uma venda é registrada no Uniplus.
  2. O job de sincronização detecta a nova venda durante a próxima execução.
  3. O sistema identifica o cliente relacionado à venda.
  4. O sistema verifica se o cliente tem consentimento válido e não está na lista de supressão.
  5. O sistema verifica se já existe uma execução da régua de agradecimento para aquela venda específica (evita duplicidade).
  6. O sistema seleciona o modelo de mensagem correto (diferenciando primeira compra de compra recorrente).
  7. O sistema envia a mensagem via camada de abstração de mensageria, respeitando os limites de cadência e o limite mensal por cliente.
  8. O sistema registra o envio na tabela de mensagens (log de disparo) e na linha do tempo do cliente.
- **Resultado esperado:** mensagem de agradecimento enviada uma única vez por venda, apenas a clientes com consentimento válido.
- **Erros possíveis:** cliente sem WhatsApp validado (mensagem não enviada, execução registrada como `skipped`); falha temporária de envio (mensagem reenfileirada para nova tentativa).
- **Regras de permissão:** não se aplica (processo automático).
- **Logs gerados:** registro em `automation_rule_executions` e em `messages`.

### 13.3 Campanha de reativação (win-back)
- **Perfil que executa:** sistema (job periódico) + Administrador/Acesso limitado (acompanhamento manual).
- **Pré-condições:** régua de reativação configurada com as etapas em cascata (ex.: 30/60/90/180 dias).
- **Passo a passo:**
  1. O sistema verifica periodicamente há quanto tempo cada cliente não compra.
  2. Ao atingir o tempo parametrizado de uma etapa, o sistema identifica a etapa correspondente da régua.
  3. O sistema verifica consentimento e lista de supressão.
  4. O sistema envia a mensagem de reativação com o incentivo da etapa correspondente.
  5. O sistema registra o envio e atualiza o status do cliente naquela régua.
  6. Se o cliente comprar após o envio, o sistema encerra a régua para aquele cliente (nenhuma etapa seguinte é aplicada).
  7. O usuário pode consultar, na tela de réguas (seção 12.5), os clientes elegíveis em cada etapa, filtrando por tempo sem comprar, e consultar as interações já realizadas.
- **Resultado esperado:** clientes inativos recontatados de forma progressiva, sem envio após retomada de compra.
- **Erros possíveis:** cliente sem consentimento (envio pulado); falha de envio (reenfileirado).
- **Regras de permissão:** consulta e reenvio manual disponíveis a Administrador e Acesso limitado.
- **Logs gerados:** `automation_rule_executions`, `messages`.

### 13.4 Cross-sell pós-compra
- **Perfil que executa:** sistema (job automático).
- **Pré-condições:** produto vendido possui produto complementar cadastrado; percentual de desconto de cross-sell configurado.
- **Passo a passo:**
  1. Uma venda é registrada no Uniplus e detectada pela sincronização.
  2. O sistema verifica se algum produto da venda possui produto complementar cadastrado.
  3. O sistema verifica consentimento do cliente.
  4. O sistema monta a oferta do produto complementar com o desconto parametrizado.
  5. O sistema envia a mensagem via camada de abstração de mensageria.
  6. O sistema registra o envio; se o cliente comprar o produto complementar dentro do período de atribuição parametrizado, a venda futura é associada a essa oferta para fins de relatório.
- **Resultado esperado:** oferta de cross-sell enviada corretamente, com desconto parametrizado.
- **Erros possíveis:** cliente sem consentimento (pulado); ausência de produto complementar cadastrado (nenhuma ação).
- **Regras de permissão:** configuração do cross-sell disponível a Administrador e Acesso limitado.
- **Logs gerados:** `automation_rule_executions`, `messages`.

### 13.5 Aviso de volta ao estoque
- **Perfil que executa:** sistema (job automático).
- **Pré-condições:** cliente com interesse registrado (compra anterior ou interação) em um produto que estava sem estoque.
- **Passo a passo:**
  1. O sistema sincroniza o estoque a partir do Uniplus.
  2. O sistema identifica que um produto de interesse de um ou mais clientes passou de "sem estoque" para "com estoque".
  3. O sistema verifica consentimento de cada cliente interessado.
  4. O sistema envia a mensagem de aviso a cada cliente elegível.
  5. O sistema registra o envio.
- **Resultado esperado:** clientes avisados assim que o produto de interesse volta a ter estoque.
- **Erros possíveis:** cliente sem consentimento (pulado).
- **Regras de permissão:** não se aplica (processo automático).
- **Logs gerados:** `automation_rule_executions`, `messages`.

### 13.6 Criação e disparo de campanha manual
- **Perfil que executa:** Administrador ou Acesso limitado.
- **Pré-condições:** existir ao menos um segmento e um modelo de mensagem.
- **Passo a passo:**
  1. O usuário acessa a área de campanhas e inicia uma nova campanha.
  2. O usuário seleciona um segmento existente ou cria um novo filtro.
  3. O usuário escolhe um modelo de mensagem existente (não pode criar um novo template, salvo se for Administrador).
  4. O usuário define data/hora de envio (imediato ou agendado, respeitando a janela de 8h às 18h) e, se aplicável, associa um cupom ou giftback já existente.
  5. O sistema valida quais destinatários têm consentimento válido, removendo automaticamente quem está na lista de supressão, e exibe o total final ao usuário antes da confirmação.
  6. O usuário confirma o disparo.
  7. O sistema envia as mensagens respeitando os limites de cadência e registra o resultado por destinatário (enviada, entregue, respondida).
- **Resultado esperado:** campanha enviada apenas a destinatários elegíveis, com resultado consultável.
- **Erros possíveis:** nenhum destinatário elegível após a validação de consentimento (o sistema impede a confirmação e avisa o usuário); falha de envio pontual (registrada por destinatário, sem interromper o restante do disparo).
- **Regras de permissão:** criação e disparo de campanha disponíveis a Administrador e Acesso limitado; criação de novo template, cupom ou giftback durante o fluxo é exclusiva do Administrador.
- **Logs gerados:** `campaign_recipients`, `messages`.

### 13.7 Atendimento e encaminhamento de lead
- **Perfil que executa:** cliente (responde) → sistema (processa) → Administrador (atende) → sistema (encaminha, se aplicável).
- **Pré-condições:** existir ao menos uma conversa em andamento com o cliente (originada por régua, campanha ou mensagem manual anterior).
- **Passo a passo:**
  1. Um cliente responde a uma mensagem recebida.
  2. O sistema identifica a resposta e interrompe qualquer automação em andamento para aquele cliente.
  3. A conversa aparece na caixa de entrada do Administrador, sinalizada para atendimento humano.
  4. O sistema avalia se a resposta demonstra intenção de compra ou dúvida.
  5. Se sim, o sistema identifica o vendedor responsável: o da última venda do cliente (via dados do Uniplus) ou, se não houver venda anterior, o próximo da fila de rodízio.
  6. O sistema envia ao vendedor, por WhatsApp, o nome e o número do cliente.
  7. O Administrador também pode responder diretamente pela caixa de entrada do CRM Live.
  8. O sistema registra a interação na linha do tempo do cliente.
- **Resultado esperado:** conversa sinalizada para atendimento humano; lead encaminhado ao vendedor correto quando aplicável; fila de rodízio avançada quando usada.
- **Erros possíveis:** nenhum vendedor ativo cadastrado (o sistema registra a falha e mantém a conversa apenas na caixa de entrada, sem encaminhamento).
- **Regras de permissão:** resposta pela caixa de entrada exclusiva do Administrador.
- **Logs gerados:** `lead_forwards`, `messages`.

### 13.8 Opt-out (saída da lista de comunicações)
- **Perfil que executa:** cliente (solicita) → sistema (processa).
- **Pré-condições:** nenhuma.
- **Passo a passo:**
  1. O cliente responde a uma mensagem com um termo de saída (ex.: "SAIR").
  2. O sistema identifica a solicitação.
  3. O sistema marca o cliente na lista de supressão (`consents.opted_out = true`, com data e origem).
  4. O sistema bloqueia automaticamente qualquer campanha futura, automática ou manual, para esse cliente.
  5. O sistema registra o evento no log de segurança (`customer_opt_out`).
- **Resultado esperado:** cliente bloqueado de forma imediata para novos disparos.
- **Erros possíveis:** nenhum aplicável — a operação deve ser sempre bem-sucedida, dado que é uma obrigação legal (LGPD).
- **Regras de permissão:** não se aplica (processo automático).
- **Logs gerados:** `consents`, `security_events`.

### 13.9 Gestão de nota de satisfação baixa
- **Perfil que executa:** cliente (responde) → sistema (processa/alerta) → Administrador (trata).
- **Pré-condições:** pesquisa de satisfação enviada 30 minutos após uma compra.
- **Passo a passo:**
  1. Um cliente responde à pesquisa de satisfação com uma nota.
  2. O sistema registra a nota; se a nota for 6 ou menos, dispara um alerta imediato ao Administrador.
  3. O Administrador acessa a tela de gestão de NPS.
  4. O Administrador visualiza a nota, o cliente e, se necessário, localiza o vendedor responsável pela venda relacionada.
  5. O Administrador escolhe uma ação: enviar mensagem padronizada, oferecer desconto/voucher ou outra ação disponível.
  6. O sistema executa a ação escolhida e registra o resultado no histórico daquela nota.
- **Resultado esperado:** toda nota baixa tratada, com histórico completo (quem tratou, ação, resultado).
- **Erros possíveis:** falha ao enviar a mensagem de tratamento (registrada, com opção de nova tentativa).
- **Regras de permissão:** ações sobre NPS exclusivas do Administrador.
- **Logs gerados:** `nps_treatments`, `messages` (se a ação envolver envio de mensagem).

### 13.10 Sincronização com o Uniplus
- **Perfil que executa:** sistema (job automático/periódico).
- **Pré-condições:** conexão somente leitura com o banco do Uniplus configurada e disponível.
- **Passo a passo:**
  1. O sistema executa a sincronização periódica (polling parametrizável) no banco de dados do Uniplus.
  2. O sistema lê clientes, vendas, produtos e estoque novos ou alterados.
  3. O sistema atualiza sua própria base (tabelas-espelho) com essas informações, sem alterar os dados de origem.
  4. O sistema recalcula a classificação RFM e atualiza os segmentos dinâmicos afetados.
  5. O sistema aciona as automações relacionadas às novas vendas (agradecimento, cross-sell) e às mudanças de estoque (aviso de volta ao estoque).
  6. O sistema registra o resultado da execução (`sync_runs`): registros importados por entidade e eventuais erros.
- **Resultado esperado:** base do CRM Live sempre alinhada ao Uniplus, sem escrita na origem.
- **Erros possíveis:** falha de conexão com o Uniplus (execução marcada como `failed`, alerta ao Administrador); erro parcial em um subconjunto de registros (execução marcada como `partial_error`, com detalhamento).
- **Regras de permissão:** consulta ao painel de status disponível a Administrador e Acesso limitado.
- **Logs gerados:** `sync_runs`.

---

## 14. Validações e Regras de Negócio

### 14.1 Clientes
- Todo cliente tem origem obrigatória em uma importação do Uniplus (`uniplus_id` not null e unique) — não há criação manual de cliente pela interface.
- Um número de telefone só pode ser usado em disparos se `whatsapp_validated = true`.
- Contatos duplicados ou inválidos devem ser sinalizados na ficha do cliente e não podem ser usados em réguas ou campanhas até serem corrigidos/validados.
- Campos complementares (aniversário, preferências, tags, canal preferido) são opcionais e não bloqueiam nenhuma outra funcionalidade quando ausentes.

### 14.2 Consentimento (LGPD)
- Nenhuma mensagem (automática ou manual) pode ser enviada a cliente sem `consents.opted_in = true` ou com `consents.opted_out = true`.
- A resposta "SAIR" (ou variações reconhecidas, configuráveis) aplica `opted_out = true` de forma imediata, sem exigir confirmação adicional do cliente.
- A lista de supressão é verificada em todo ponto de envio, sem exceção — inclusive em reenvios manuais originados da tela de NPS.

### 14.3 Réguas de relacionamento
- Uma régua não pode ser ativada sem um modelo de mensagem associado.
- Um mesmo evento (ex.: uma venda específica) não pode gerar duas execuções da mesma régua para o mesmo cliente (garantido pela constraint de unicidade em `automation_rule_executions`).
- A régua de reativação em cascata deve ser interrompida automaticamente para o cliente assim que uma nova venda for sincronizada para ele.
- Mensagens automáticas só podem ser enviadas dentro da janela de horário configurada (8h às 18h, por padrão) — mensagens geradas fora dessa janela devem ser enfileiradas para envio no próximo horário permitido, não descartadas.

### 14.4 Campanhas
- Uma campanha não pode ser confirmada para envio sem ao menos um destinatário elegível (com consentimento válido) após a validação automática.
- O status de uma campanha só avança para `sending`/`sent` após confirmação explícita do usuário.
- Uma campanha agendada pode ser cancelada até o momento anterior ao início do envio.

### 14.5 Cupons e Giftback
- O código de um cupom deve ser único em todo o sistema.
- Um cupom ou giftback vencido (`valid_until` no passado) não pode ser aplicado a uma nova campanha nem exibido como disponível na ficha do cliente.
- A atribuição de uma venda a uma campanha usa o critério de período: a venda do cliente deve ocorrer dentro de um número de dias parametrizável após o envio da campanha, já que o Uniplus não registra o código de cupom aplicado a uma venda.

### 14.6 Cross-sell
- O percentual de desconto aplicado ao cross-sell é sempre o valor parametrizado na tela de Cross-sell (seção 12.9) no momento do envio, não um valor fixo no código. Essa edição está disponível a Administrador e Acesso limitado.
- Um produto só gera oferta de cross-sell se possuir ao menos um produto complementar ativo cadastrado.

### 14.7 Atendimento e encaminhamento de leads
- Toda resposta de cliente interrompe automações em andamento para aquele cliente antes de qualquer outra ação.
- O vendedor responsável pelo encaminhamento é sempre determinado no momento do encaminhamento (não fixado previamente): vendedor da última venda do cliente, ou próximo da fila de rodízio se não houver venda anterior.
- A fila de rodízio deve avançar apenas quando efetivamente usada (cliente sem venda anterior) — encaminhamentos para o vendedor da última venda não alteram a posição da fila.

### 14.8 NPS
- A pesquisa de satisfação é enviada, por padrão, 30 minutos após o registro da venda correspondente; esse prazo é um parâmetro configurável pelo Administrador (seção 20), não um valor fixo no código.
- Nota de 6 ou menos, em escala de 0 a 10, é obrigatoriamente classificada como baixa e gera alerta imediato; o limite de nota baixa também é configurável pelo Administrador (seção 20).
- Uma nota não pode ser marcada como tratada sem ao menos um registro em `nps_treatments`.

### 14.9 Autenticação e usuários
- A primeira conta Google autenticada com sucesso em produção recebe o papel `admin` de forma permanente — não existe mecanismo de transferência desse papel nesta versão.
- Toda conta Google autenticada após a primeira recebe automaticamente o papel `limited`.
- Um usuário desativado pelo Administrador (seção 6.12) não pode gerar nova sessão até ser reativado.

### 14.10 Mensagens gerais de erro esperadas
- Falha de validação de campo obrigatório: mensagem específica indicando o campo.
- Falha de permissão: mensagem genérica de acesso negado, sem detalhar estrutura interna do sistema.
- Falha de comunicação com o WhatsApp Web (sessão caída): mensagem clara ao Administrador, com orientação para reconectar a sessão.
- Falha de sincronização com o Uniplus: mensagem no painel de status, sem expor detalhes técnicos sensíveis (como credenciais ou estrutura interna do banco) na interface.

---

## 15. Autenticação e Sessão

- **Tipo de autenticação:** OAuth 2.0 via Google ("Entrar com Google"), sem senha própria do sistema.
- **Fluxo de login:** detalhado na seção 13.1. Qualquer conta Google pode iniciar o fluxo; o papel (`admin` ou `limited`) é definido automaticamente conforme a ordem de primeiro acesso.
- **Fluxo de logout:** o usuário pode encerrar a sessão a qualquer momento por um botão de "Sair"; o backend invalida o token/cookie de sessão correspondente.
- **Recuperação de acesso:** não aplicável — a recuperação de senha é responsabilidade do próprio Google, já que o CRM Live não armazena senha.
- **Bloqueio por tentativas:** não aplicável a senha (não existe). Tentativas de autenticação que falhem na validação do Google, ou tokens inválidos/expirados usados para acessar rotas protegidas, devem ser registradas no log de segurança (`login_failed`, `permission_denied`) para permitir revisão posterior pelo Administrador.
- **Tempo de sessão:** sessão baseada em token assinado (ex.: JWT), com expiração sugerida de 12 horas e renovação automática enquanto houver atividade do usuário (sliding expiration); após esse período de inatividade, o usuário deve autenticar novamente. Este valor é um parâmetro técnico de implementação, ajustável pela equipe de desenvolvimento conforme necessidade, sem impacto em regra de negócio.
- **Proteção de rotas:** toda rota da API, exceto o próprio fluxo de login, deve exigir sessão válida; o frontend deve redirecionar ao login qualquer usuário sem sessão válida.
- **Comportamento para usuário sem permissão:** ao tentar acessar uma tela ou executar uma ação sem permissão (ex.: Acesso limitado tentando abrir a caixa de entrada), o frontend deve ocultar/desabilitar o recurso e o backend deve recusar a chamada correspondente com erro 403, exibindo uma mensagem genérica de acesso negado.

**Observação de segurança registrada:** como qualquer conta Google pode se autenticar e se tornar automaticamente um usuário de "Acesso limitado" — sem lista de permissão, convite ou aprovação prévia —, este FSD inclui a tela de "Gestão de usuários do CRM Live" (seção 6.12 e 12.17) para que o Administrador possa revisar e desativar acessos indesejados após o fato. Esse comportamento de autoprovisionamento foi mantido conforme definido nas decisões técnicas do projeto; um mecanismo preventivo (ex.: lista de e-mails autorizados) não foi incluído nesta versão por não ter sido solicitado, mas fica registrado como recomendação de melhoria futura na seção 27.

---

## 16. Controle de Acesso

- **Papéis:** Administrador e Acesso limitado (seção 8).
- **Permissões:** detalhadas na matriz da seção 8.5.
- **Matriz de acesso:** ver seção 8.5.
- **Menus por perfil:** o menu principal deve ocultar, para o Acesso limitado, os itens exclusivos do Administrador (Caixa de entrada, Gestão de usuários) e deve desabilitar, dentro das telas compartilhadas, os controles de edição exclusivos (ex.: botão "Novo template" na tela de Modelos de mensagem).
- **Telas bloqueadas:** Caixa de entrada e Gestão de usuários do CRM Live, para o perfil Acesso limitado.
- **Ações protegidas:** todas as listadas como exclusivas do Administrador na seção 8.1.
- **Validação no backend:** obrigatória em todo Controller, independentemente da ocultação feita na interface — nenhuma ação exclusiva deve depender apenas do frontend para ser bloqueada.
- **Mensagens para acesso negado:** mensagem genérica, sem detalhar a estrutura interna do sistema (ex.: "Você não tem permissão para executar esta ação.").

---

## 17. Auditoria e Histórico

- **Registros auditados:** disparos de mensagens (`messages`), execuções de réguas (`automation_rule_executions`), campanhas e seus destinatários (`campaigns`, `campaign_recipients`), tratamentos de notas de NPS (`nps_treatments`), encaminhamentos de lead (`lead_forwards`), alterações de consentimento (`consents`), execuções de sincronização (`sync_runs`) e eventos de segurança (`security_events`).
- **Ações registradas:** todo envio de mensagem (automática, de campanha ou manual), toda ação tomada sobre uma nota de NPS, toda alteração de status de acesso de um usuário, toda ocorrência de opt-out, toda execução de sincronização com o Uniplus.
- **Campos mínimos usados:** quem (usuário ou processo automático), quando (timestamp), o quê (tipo de evento/ação), origem (régua, campanha, manual ou automática), resultado.
- **Quem pode visualizar:** log de disparos (`messages`) e painel de sincronização, disponíveis a Administrador e Acesso limitado; log de segurança e gestão de usuários, exclusivos do Administrador; histórico de tratamento de NPS, exclusivo do Administrador (mesma permissão da tela de NPS).
- **Como aparece nos CRUDs:** a ficha do cliente exibe a linha do tempo de interações (mensagens e vendas) diretamente; a tela de NPS exibe o histórico de tratamento de cada nota; a tela de campanhas exibe o resultado consolidado por destinatário.
- **Regras de retenção:** não foi definida uma política de expurgo/retenção nesta versão — todos os registros de auditoria permanecem armazenados indefinidamente, salvo decisão futura em contrário.

---

## 18. Soft Delete e Exclusões

- **Soft delete não é utilizado nesta versão** (decisão explícita do projeto).
- Entidades configuráveis (réguas, templates, cupons, giftback, vendedores, segmentos, produtos complementares) usam um campo booleano `active` para desativação lógica, permitindo que o usuário "desligue" um recurso sem apagar seu histórico de uso.
- **Quem pode desativar:** Administrador e Acesso limitado, conforme a matriz de permissões da seção 8.5 (cada perfil só desativa o que também pode criar/editar).
- **Exclusão definitiva:** só é permitida para registros sem qualquer histórico vinculado (ex.: um template que nunca foi usado em uma mensagem enviada). Registros com histórico vinculado não podem ser excluídos — a tentativa deve ser bloqueada pela integridade referencial do banco de dados (`ON DELETE RESTRICT`) e pela validação do backend, com mensagem explicando o motivo do bloqueio.
- **Restauração:** não aplicável, já que não há exclusão lógica — reativar um registro desativado (`active = false → true`) é a forma equivalente de "restaurar" um recurso configurável.
- **Como registros desativados aparecem:** por padrão, ocultos das listas de seleção ativa (ex.: um template inativo não aparece na lista de escolha ao criar uma nova campanha), mas visíveis em listagens de consulta/histórico com um filtro explícito "mostrar inativos".
- **Cuidados contra desativação indevida:** desativar uma régua ou template não afeta o histórico de mensagens já enviadas por ele; a interface deve avisar, ao desativar um recurso em uso ativo (ex.: régua ativa aplicada a clientes elegíveis no momento), que a desativação impede novos disparos, mas não cancela nada retroativamente.

---

## 19. Logs

### Log de erros
Não foi incluído como recurso estrutural formal nesta versão — decisão explícita registrada nas decisões técnicas do projeto. Isso significa que, nesta primeira versão, o CRM Live não terá uma tabela dedicada de log de erros técnicos gravada no banco de dados nem uma estratégia formal de contingência em arquivo.

Ainda assim, por se tratar de um sistema que roda continuamente e sem supervisão constante (seção 1), a IA codificadora deve adotar, como prática mínima de implementação (não como recurso funcional exposto ao usuário nesta versão): registrar exceções não tratadas do backend e falhas dos jobs automáticos (sincronização, envio de mensagens, cálculo de réguas) em arquivo de log local, dentro de `backend/app/storage/logs/`, fora de qualquer rota pública, protegida conforme a seção 5.4. Esse registro em arquivo é uma prática técnica recomendada de robustez operacional, e não substitui nem antecipa a decisão de implementar um recurso formal de log de erros com interface de consulta — esse recurso formal fica registrado como pendência não bloqueante na seção 27.

### Log de segurança
O sistema deve registrar, na tabela `security_events`, os seguintes eventos:
- login bem-sucedido (`login_success`);
- falha de autenticação Google (`login_failed`);
- tentativa de ação sem permissão suficiente (`permission_denied`);
- opt-out de cliente (`customer_opt_out`);
- alteração de status de acesso de um usuário do CRM Live, incluindo desativação (`user_access_changed`);
- queda da sessão do WhatsApp Web (`whatsapp_session_down`).

O log de segurança é consultável exclusivamente pelo Administrador, na tela de Gestão de usuários (seção 12.17) e, quando aplicável, no contexto da funcionalidade relacionada (ex.: alerta de sessão do WhatsApp caída é exibido de forma destacada assim que detectado, não apenas no log).

---

## 20. Configurações Globais

| Parâmetro | Descrição | Impacto | Quem altera |
| --- | --- | --- | --- |
| Dias sem comprar por etapa da régua de reativação | Define os intervalos da régua de win-back em cascata (ex.: 30/60/90/180 dias) | Determina quando cada etapa da reativação é disparada | Administrador |
| Limite de mensagens por cliente/mês | Máximo de mensagens que um cliente pode receber em um mês (valor de referência: 20) | Impede excesso de comunicação e reduz risco de denúncia/bloqueio do número | Administrador |
| Percentual de desconto do cross-sell | Desconto aplicado na oferta automática de produto complementar | Usado em toda oferta de cross-sell disparada | Administrador |
| Janela de horário de envio | Intervalo permitido para disparo de mensagens (padrão: 8h às 18h) | Mensagens fora da janela são enfileiradas para o próximo horário permitido | Administrador |
| Cadência de disparo (intervalo entre mensagens e limite diário) | Controla a velocidade de envio para reduzir risco de bloqueio do número de WhatsApp | Afeta a fila de envio de todas as mensagens automáticas e de campanha | Administrador |
| Período de atribuição de venda a campanha | Número de dias após o envio de uma campanha dentro do qual uma compra é atribuída a ela | Usado no relatório de desempenho por campanha | Administrador |
| Prazo de envio da pesquisa de satisfação | Tempo após a compra para envio da pesquisa NPS (padrão: 30 minutos) | Determina o disparo da régua de NPS | Administrador |
| Limite de nota baixa (NPS) | Nota igual ou inferior a este valor é considerada baixa (padrão: 6, em escala de 0 a 10) | Determina quando o alerta imediato é disparado | Administrador |
| Percentual de desconto de incentivo ao cadastro (primeira compra identificada) | Desconto aplicado como incentivo quando uma venda é identificada pela primeira vez a um cliente (seção 6.1) | Usado na geração automática do cupom de incentivo | Administrador |
| Critérios de classificação RFM (recência, frequência e valor por faixa) | Define os limites (ex.: dias desde a última compra, quantidade de compras no período, ticket acumulado) que separam os clientes em cada faixa de `rfm_segment` (VIP, fiel, em risco, inativo) — ver seção 6.2 e 11.2. *(Decisão de 07/08/2026: os critérios ficam aqui, como parâmetro geral ajustável pelo Administrador, em vez de fixos no código, permitindo recalibrar a segmentação conforme o comportamento real da base de clientes.)* | Usado a cada recálculo automático de RFM (após cada sincronização), refletindo em segmentação, dashboard e filtros de campanha | Administrador |

**Parâmetros que NÃO ficam nesta tela, por serem específicos de um módulo que o Acesso limitado também pode editar** (ver seção 6.11):

| Parâmetro | Descrição | Impacto | Onde é editado | Quem altera |
| --- | --- | --- | --- | --- |
| Dias sem comprar por etapa da régua de reativação | Define os intervalos da régua de win-back em cascata (ex.: 30/60/90/180 dias) | Determina quando cada etapa da reativação é disparada | Tela de Réguas de relacionamento (12.5), na condição da própria régua | Administrador e Acesso limitado |
| Percentual de desconto do cross-sell | Desconto aplicado na oferta automática de produto complementar | Usado em toda oferta de cross-sell disparada | Tela de Cross-sell (12.9) | Administrador e Acesso limitado |

**Valores padrão:** os valores indicados como "padrão" nesta tabela refletem o que já foi confirmado no levantamento de requisitos do cliente; os demais parâmetros não possuem valor padrão pré-definido e devem ser configurados pelo Administrador antes da primeira ativação da funcionalidade correspondente (ex.: percentual de desconto do cross-sell).

**Validações:** todo parâmetro numérico deve ser validado quanto a faixa aceitável (ex.: percentuais entre 0 e 100; tempos e limites sempre positivos).

**Fallback quando uma configuração estiver ausente:** funcionalidades que dependem de um parâmetro ainda não configurado (ex.: cross-sell sem percentual definido) devem ficar bloqueadas para disparo automático, com aviso claro ao Administrador na tela correspondente, em vez de assumir um valor arbitrário não configurado pelo usuário.

**Estratégia de configuração técnica do projeto:** parâmetros técnicos sensíveis (credenciais de banco de dados, caminhos internos de armazenamento) não são armazenados nesta tabela de configurações de negócio — ficam exclusivamente no arquivo de configuração em código do backend (`backend/app/config/settings.js`), nunca em arquivo `.env`, conforme detalhado na seção 5.5. Esse arquivo fica dentro do `[Diretório do Projeto - Repositório]`, protegido contra acesso direto por URL, e é carregado apenas por importação interna do código.

---

## 21. Uploads, Anexos e Arquivos

- **Onde são usados:** exclusivamente em modelos de mensagem (templates), que suportam uma imagem opcional além do texto e do link.
- **Tipos permitidos:** JPG, PNG e WEBP.
- **Tamanho máximo:** 5MB por arquivo.
- **Local lógico de armazenamento:** `backend/app/storage/attachments/`, fora de qualquer rota estática pública (seção 5.4).
- **Permissões:** upload e substituição de imagem de template são exclusivos do Administrador (mesma permissão de edição de templates, seção 8.1).
- **Validações:** o backend deve validar o tipo real do arquivo (verificação do conteúdo binário, não apenas a extensão informada) antes de aceitar o upload, além do limite de tamanho.
- **Regras de visualização:** a imagem só é exibida dentro do próprio CRM Live (prévia do template) e enviada ao cliente como parte da mensagem; não há galeria pública de anexos.
- **Regras de download:** o download/visualização de um anexo específico deve sempre passar por uma rota de Controller autenticada, que valida a permissão do usuário antes de servir o arquivo — nunca por link direto ao caminho do arquivo no servidor.
- **Regras de exclusão:** um anexo vinculado a um template já usado em alguma mensagem enviada não pode ser excluído — apenas substituído por um novo upload, preservando o arquivo original na tabela de histórico (`messages` referencia o `template_id` e mantém o conteúdo enviado no momento do disparo).
- **Preservação de arquivos:** anexos vinculados a mensagens já enviadas devem ser preservados, mesmo que o template seja posteriormente desativado.
- **Riscos de segurança:** upload de arquivo malicioso disfarçado de imagem — mitigado pela validação do tipo real do conteúdo, não apenas pela extensão; exposição indevida do arquivo — mitigada por não haver rota estática pública para a pasta de anexos.
- **Proteção contra acesso direto indevido:** conforme seção 5.4 — nenhuma pasta de armazenamento de anexos deve ser servida como estática pela API.

---

## 22. Relatórios, Consultas e Exportações

Todos os relatórios abaixo estão disponíveis a Administrador e Acesso limitado, salvo indicação em contrário.

### 22.1 Dashboard geral de relacionamento
- **Objetivo:** visão consolidada da saúde do relacionamento com os clientes.
- **Filtros:** período (opcional; padrão: últimos 30 dias).
- **Filtros obrigatórios:** nenhum.
- **Colunas/indicadores:** taxa de recompra, ticket médio, frequência de compra, clientes ativos x inativos, NPS médio.
- **Formatos de exportação:** CSV e PDF.

### 22.2 Desempenho por campanha
- **Objetivo:** avaliar o resultado de cada campanha.
- **Filtros:** período, campanha específica (opcionais).
- **Filtros obrigatórios:** nenhum.
- **Colunas:** mensagens enviadas, entregues, respondidas, vendas atribuídas, receita gerada.
- **Formatos de exportação:** CSV e PDF.

### 22.3 Relatório de consentimento (LGPD)
- **Objetivo:** dar visibilidade sobre a base de consentimento.
- **Filtros:** status de consentimento (consentiu/saiu/nunca contatado), período (opcionais).
- **Filtros obrigatórios:** nenhum.
- **Colunas:** cliente, status, data e origem do consentimento/opt-out.
- **Formatos de exportação:** CSV.

### 22.4 Relatório de vendas sem cliente identificado
- **Objetivo:** apoiar a captação de cadastros.
- **Filtros:** período (opcional).
- **Filtros obrigatórios:** nenhum.
- **Colunas:** data da venda, valor, produtos.
- **Formatos de exportação:** CSV.

### 22.5 Painel de status da sincronização
- **Objetivo:** visibilidade sobre a saúde da integração com o Uniplus.
- **Filtros:** período (opcional).
- **Filtros obrigatórios:** nenhum.
- **Colunas:** data/hora, status, registros importados por entidade, erros.
- **Formatos de exportação:** não aplicável (consulta operacional, sem exportação nesta versão).

### 22.6 Tela de gestão de notas de satisfação (NPS)
- **Objetivo:** agir sobre notas baixas e acompanhar a satisfação geral.
- **Filtros:** faixa de nota, período, vendedor, categoria de produto.
- **Filtros obrigatórios:** nenhum (todos os filtros são opcionais e combináveis).
- **Colunas:** cliente, nota, data, produto/categoria, vendedor, status de tratamento.
- **Formatos de exportação:** CSV.
- **Permissão:** consulta disponível a ambos os perfis; ações exclusivas do Administrador.

**Regras gerais de exportação:**
- Todo dado exportado em CSV deve respeitar exatamente os mesmos filtros e permissões aplicados na tela de origem — nenhuma exportação pode conter dados que o usuário não teria acesso de ver na tela.
- Consultas usadas por relatórios com maior volume de dados (log de disparos, NPS, vendas por período) devem se apoiar nos índices definidos na seção 11.2, para evitar lentidão.

---

## 23. APIs e Integrações Externas

Nesta primeira versão, o CRM Live **não expõe nenhuma API pública** e **não possui integrações externas** além das duas descritas abaixo, que não são APIs no sentido de serviço exposto pelo CRM Live, e sim consumos realizados pelo próprio sistema:

- **Leitura do banco de dados PostgreSQL do Uniplus:** conexão direta ao banco, com usuário de menor privilégio (somente leitura), sem escrita em nenhuma hipótese. Não é uma API REST/HTTP — é uma conexão de banco de dados.
- **Conexão com WhatsApp Web:** biblioteca de automação de navegador/protocolo do WhatsApp Web, isolada atrás da camada de abstração de mensageria (seção 9.11). Não é uma API oficial exposta pelo WhatsApp — é uma automação não oficial, com os riscos e mitigações descritos na seção 24.

Integrações com marketplaces, com o sistema "Integrar", com hospedagem Hostinger, ou qualquer API oficial do WhatsApp **não fazem parte desta versão** e não devem ser implementadas.

---

## 24. Segurança Funcional

- **Proteção de rotas:** toda rota da API exige sessão válida, exceto o fluxo de login (seção 15).
- **Validação de permissões no backend:** toda ação exclusiva de um perfil deve ser validada no Controller correspondente, independentemente do que a interface esconde (seção 16).
- **Proteção contra acesso indevido:** pastas internas (config, models, services, migrations, integrations, jobs, logs, anexos) nunca são expostas como conteúdo estático (seção 5.4); arquivos baixáveis (anexos, exportações) são sempre servidos por rota de Controller autenticada.
- **Cuidado com dados sensíveis:** dados de clientes (protegidos pela LGPD) só podem ser lidos por usuários autenticados do CRM Live; nenhum dado de cliente é exposto por rota pública sem autenticação.
- **Cuidado com mensagens de erro:** mensagens de erro exibidas ao usuário devem ser genéricas e acionáveis, sem expor detalhes internos (estrutura de banco, stack trace, credenciais).
- **Proteção de uploads:** ver seção 21 (validação de tipo real do arquivo, tamanho máximo, armazenamento fora de rota pública).
- **Proteção de exportações:** exportações respeitam os mesmos filtros e permissões da tela de origem (seção 22).
- **Registro de eventos sensíveis:** ver seção 19 (log de segurança).
- **Risco específico do WhatsApp Web (não oficial):** a biblioteca de automação usada viola os termos de serviço do WhatsApp, com risco real de banimento do número usado. As mitigações obrigatórias já incorporadas neste FSD são: cadência de envio controlada e parametrizável (seção 20); envio apenas para clientes com consentimento válido (seção 14.2); número de WhatsApp dedicado, distinto do número principal de atendimento da loja; e camada de abstração de mensageria (seção 9.11), que permite migrar para a API oficial no futuro sem retrabalho nas regras de negócio.
- **Revisão de segurança recomendada:** antes da entrega, revisar especificamente: (1) se nenhuma pasta interna está acessível por URL; (2) se toda ação exclusiva do Administrador está bloqueada no backend para o perfil Acesso limitado; (3) se a lista de supressão é respeitada em 100% dos pontos de envio, sem exceção; (4) se o usuário de banco de dados usado para ler o Uniplus realmente não possui permissão de escrita.

---

## 25. Organização Sugerida da Implementação

A organização a seguir considera que o desenvolvimento ocorrerá em ambiente local via Docker Compose, com publicação futura no PC Windows da loja.

1. Preparação do `[Diretório do Projeto - Repositório]` e inicialização do controle de versão (Git).
2. Criação da estrutura inicial de pastas (seção 5.3), incluindo backend, frontend e docs.
3. Configuração inicial do projeto (Docker Compose com os três serviços: backend, banco de dados, frontend).
4. Criação do arquivo de configuração em código (`backend/app/config/settings.js`), sem uso de `.env`, e de seu exemplo versionável (`settings.example.js`).
5. Proteção das pastas internas contra acesso direto pelo navegador (seção 5.4).
6. Estrutura arquitetural MVC (controllers, models, services, camada de integração).
7. Banco de dados: criação da conexão com a base própria do CRM Live e da conexão somente leitura com o Uniplus.
8. Criação da estrutura de migrations (`backend/app/database/migrations/`) e da tabela de controle `schema_migrations`.
9. Criação das migrations de todas as tabelas, campos, índices e constraints descritos na seção 11.
10. Definição do mecanismo de controle de migrations executadas (evitar execução duplicada) e do comando interno de execução.
11. Autenticação via OAuth Google, incluindo a lógica de primeiro-acesso-vira-administrador.
12. Controle de acesso (RBAC) para os dois perfis, aplicado a cada Controller.
13. Recursos estruturais: auditoria (log de disparos), log de segurança, configurações globais.
14. Job de sincronização com o Uniplus (leitura somente-leitura, tabelas-espelho, painel de status).
15. Entidades principais e seus CRUDs (clientes — edição de campos complementares; vendedores; segmentos; tags; produtos complementares).
16. Camada de abstração de mensageria (`integrations/whatsapp/`) e fila de envio com controle de cadência.
17. Réguas de relacionamento (motor de automações) e cada régua específica (agradecimento, aniversário, recompra por ciclo, NPS, reativação em cascata, aviso de volta ao estoque).
18. Campanhas manuais, modelos de mensagem, cupons e giftback/cashback.
19. Caixa de entrada, detecção de resposta, interrupção de automações e encaminhamento de leads (incluindo fila de rodízio).
20. Gestão de satisfação (NPS): alerta de nota baixa, tela de gestão e ações.
21. Relatórios e consultas (dashboard, desempenho de campanha, consentimento, vendas sem cliente, status de sincronização) com exportação CSV/PDF.
22. Uploads de imagem em templates, com validações de tipo e tamanho.
23. Log de contingência técnica em arquivo (prática recomendada, seção 19) e revisão da estratégia formal de log de erros como pendência.
24. Revisão de segurança (checklist da seção 24).
25. Revisão de qualidade (validações, mensagens de erro, estados de tela vazios/carregando/sem permissão).
26. Preparação da entrega e do processo de instalação no PC Windows da loja.

---

## 26. Critérios de Aceitação Técnica e Funcional

- Todas as funcionalidades da primeira versão (seção 6) implementadas conforme descrito.
- Arquitetura MVC respeitada, com separação clara entre Controllers, Models/Services e Views, conforme seção 5.2.
- Permissões dos dois perfis (Administrador e Acesso limitado) respeitadas tanto na interface quanto no backend, conforme seção 8.5.
- Validações e regras de negócio da seção 14 implementadas e verificáveis.
- Banco de dados coerente com o modelo proposto na seção 11, incluindo chaves, constraints e integridade referencial.
- Índices criados para as consultas críticas identificadas na seção 11.2 (busca de clientes, elegibilidade de réguas, log de disparos, NPS, atribuição de campanha).
- Log de disparos (auditoria de mensagens) funcionando e consultável.
- Log de segurança funcionando e consultável pelo Administrador.
- Prática de registro de erros técnicos em arquivo local implementada como medida de robustez (seção 19), mesmo sem constituir recurso formal exposto ao usuário nesta versão.
- Soft delete não implementado; desativação lógica (`active`) funcionando para as entidades configuráveis, com bloqueio de exclusão de registros com histórico vinculado.
- Telas aderentes ao design system de `docs/Design/design.md` (paleta, tipografia, espaçamento, raio e componentes) e às regras funcionais deste FSD.
- Erros tratados de forma segura, sem exposição de detalhes internos ao usuário (seção 14.10 e 24).
- Ausência de funcionalidades inventadas fora deste FSD (ex.: nenhuma integração com marketplaces, carrinho abandonado, API oficial do WhatsApp, acesso de vendedores ao sistema, ou cadastro manual de clientes).
- Revisão de segurança concluída conforme checklist da seção 24.
- Revisão de qualidade concluída (validações, mensagens, estados de tela).
- Estrutura do projeto organizada a partir do `[Diretório do Projeto - Repositório]`, sem dependência de nomes fixos como `public_html`, `public`, `htdocs` ou `www` na arquitetura descrita.
- Arquivo de configuração em código criado e protegido, sem uso de `.env`, conforme seção 5.5.
- Credenciais sensíveis (banco do CRM Live, banco do Uniplus) não expostas em nenhum arquivo acessível diretamente pelo navegador.
- Pastas internas (config, models, services, database/migrations, integrations, jobs, storage/logs, storage/attachments) protegidas contra acesso direto por URL.
- Migrations criadas para toda a estrutura do banco de dados própria do CRM Live, contemplando tabelas, campos, índices e constraints necessários.
- Mecanismo definido (`schema_migrations`) para evitar execução duplicada de migrations.
- Migrations não acessíveis diretamente pelo navegador.
- Execução de migrations feita exclusivamente por comando interno controlado (linha de comando dentro do container do backend), nunca por rota HTTP pública.
- Camada de abstração de mensageria implementada, sem nenhuma régua, campanha ou funcionalidade de atendimento referenciando diretamente a biblioteca de automação do WhatsApp Web.

---

## 27. Pontos Pendentes e Decisões Futuras

- ~~**Atualização do PRD quanto ao número de perfis de usuário:**~~ **Resolvida em 06/08/2026.** O `PRD.md` foi atualizado para refletir os dois perfis (Administrador e Acesso limitado) já consolidados neste FSD.
- ~~**Linguagem de backend (Python vs. Node.js):**~~ **Resolvida em 07/08/2026.** A revisão da especificação identificou que não há biblioteca madura e mantida de automação de WhatsApp Web em Python puro (as opções robustas — `whatsapp-web.js`, Baileys — são em Node.js). Em vez de isolar apenas essa automação em um serviço auxiliar separado (o que exigiria um quarto container além dos três previstos no Docker Compose), o responsável optou por unificar todo o backend em Node.js. Todas as referências a Python, `.py`, `requirements.txt` etc. foram substituídas por Node.js, `.js`/`package.json` em todo este documento (seções 3, 4, 5.2, 5.3, 5.4, 5.5, 9.11, 11.4, 20 e 25). A escolha do framework HTTP específico (Express, Fastify etc.) e da biblioteca de automação de WhatsApp Web específica (`whatsapp-web.js` vs. Baileys) fica para a fase de codificação.
- ~~**Cores divergentes em `docs/Design/design.md`:**~~ **Resolvida em 07/08/2026.** O texto descritivo do design system citava valores hexadecimais (ex.: `#2C4593`, `#95358B`, `#F8FAFC`/`#F1F5F9`) diferentes dos tokens do front-matter (ex.: `primary: #0f2d7b`, `secondary: #97378d`, `background: #f7f9fb`), que são os valores efetivamente usados no esboço já validado (`mockup-dashboard-geral.html`). O responsável confirmou que os tokens do front-matter são a fonte da verdade; o texto descritivo foi corrigido para usar os mesmos valores.
- ~~**Critérios de classificação RFM:**~~ **Resolvida em 07/08/2026.** Os limites de recência/frequência/valor que definem as faixas RFM (VIP, fiel, em risco, inativo) não estavam definidos. O responsável decidiu que esses critérios ficam como parâmetro configurável pelo Administrador na tela de Configurações (seção 20), sem valor padrão pré-definido, e ajustáveis conforme o comportamento real da base de clientes — mesmo padrão de fallback já usado para outros parâmetros sem valor padrão (ex.: percentual de cross-sell).
- **Mapeamento do schema do banco de dados do Uniplus (e, se aplicável, do Integrar):** este FSD assume a existência de tabelas-espelho no CRM Live (`customers`, `sales`, `sale_items`, `products`, `stock_snapshots`) alimentadas pela sincronização somente-leitura com o Uniplus, mas não mapeia as tabelas e colunas reais do banco do Uniplus às colunas dessas tabelas-espelho (seção 11.2). O responsável confirmou que o repositório `https://github.com/lifangbiz/dbskill`, citado nas instruções gerais do projeto, **não** é a fonte desse mapeamento — o schema real do Uniplus será levantado por outro meio, ainda a definir. Este é um ponto que **bloqueia especificamente a implementação do job de sincronização (seção 6.9/13.10)** e deve ser resolvido antes dessa etapa da organização sugerida (seção 25, itens 7 e 14), mas não bloqueia as etapas anteriores (estrutura do projeto, autenticação, RBAC, modelo de dados próprio do CRM Live).
- **Log de erros técnicos como recurso formal:** não foi incluído nesta versão como recurso estrutural com interface de consulta. Como o sistema roda continuamente e sem supervisão constante, recomenda-se revisitar esse ponto com o responsável do projeto logo após a primeira versão em produção, avaliando a criação de uma tabela de log de erros consultável pelo Administrador, com a mesma estratégia de contingência em arquivo já adotada como prática técnica mínima (seção 19).
- **Mecanismo preventivo de controle de acesso (allowlist):** atualmente, qualquer conta Google pode se autenticar e se tornar automaticamente um usuário de "Acesso limitado". Este FSD mitiga esse ponto com a tela de Gestão de usuários (seção 6.12), que permite revisão e desativação após o fato. Uma melhoria futura seria restringir o autoprovisionamento a uma lista de e-mails autorizados pelo Administrador antes do primeiro acesso, reduzindo o risco de acesso indevido a dados de clientes protegidos pela LGPD. Fica registrado como recomendação, não como requisito desta versão.
- **Soft delete:** não incluído nesta versão. Se, durante a implementação, alguma entidade exigir exclusão com necessidade de recuperação/auditoria além do que a desativação lógica (`active`) já oferece, esse ponto deve ser reaberto com o responsável do projeto.
- ~~**`docs/DESIGN.md`:** ainda não existe.~~ **Resolvida em 07/08/2026.** O design system "Admin Logic" foi recebido, confirmado pelo responsável e está disponível em `docs/Design/design.md`, com um esboço da tela de Dashboard geral já validado.
- **Detalhamento do processo de deploy no PC Windows da loja:** este FSD descreve a arquitetura e a estrutura do projeto, mas o passo a passo operacional de instalação no ambiente de produção (configuração do Docker Desktop no Windows, inicialização automática dos containers, backup local) deve ser detalhado em uma etapa própria de preparação da entrega (seção 25, item 26).
- **Backup da base de dados do CRM Live:** citado como requisito não funcional no levantamento original (RNF-07), mas sem uma estratégia técnica detalhada (frequência, retenção, local de armazenamento). Recomenda-se definir essa estratégia antes da entrega em produção.

---

## 28. Conclusão

Este FSD está pronto para orientar uma IA codificadora na implementação completa do CRM Live, cobrindo arquitetura, estrutura de diretórios, configuração segura sem uso de `.env`, modelo de dados, estratégia de migrations, autenticação, controle de acesso, todos os módulos e telas da primeira versão, fluxos funcionais, validações, logs, configurações globais, uploads, relatórios/exportações e critérios de aceitação.

Os documentos que devem ser entregues junto com este FSD para a IA codificadora são:

- `docs/FSD.md` (este documento);
- `docs/Design/design.md`, já disponível e confirmado.

Nenhum outro documento de levantamento de requisitos ou de decisões técnicas é necessário para a implementação — todo o conteúdo relevante já foi consolidado diretamente nas seções deste FSD.

---

## 29. Glossário de Siglas

- **CRM (Customer Relationship Management):** gestão de relacionamento com o cliente — nome que dá origem ao produto "CRM Live".
- **FSD (Functional Specification Document):** este documento — especificação funcional e técnica consolidada para implementação.
- **PRD (Product Requirements Document):** documento de requisitos do produto (`docs/PRD-CRM-Live.md`), fonte funcional deste FSD.
- **ERP (Enterprise Resource Planning):** sistema de gestão empresarial — no caso, o Uniplus, sistema de origem dos dados de clientes, vendas, produtos e estoque.
- **RFM (Recência, Frequência, Valor Monetário):** técnica de segmentação de clientes usada para classificá-los em grupos como VIP, fiel, em risco ou inativo (seção 6.2).
- **NPS (Net Promoter Score):** nota de satisfação do cliente, em escala de 0 a 10, usada na pesquisa pós-compra (seção 6.8).
- **LGPD (Lei Geral de Proteção de Dados):** legislação brasileira de proteção de dados pessoais, base para as regras de consentimento (opt-in/opt-out) descritas na seção 6.6.
- **RBAC (Role-Based Access Control):** controle de acesso baseado em papel/perfil de usuário — neste sistema, Administrador e Acesso limitado (seção 8).
- **MVC (Model-View-Controller):** padrão arquitetural de separação entre dados/regras de negócio (Model), interface (View) e orquestração de requisições (Controller), adotado na seção 5.
- **OAuth 2.0:** protocolo de autenticação usado para o login "Entrar com Google" (seção 15), sem senha própria do sistema.
- **Win-back:** régua de reativação de clientes inativos, com mensagens progressivas em cascata (seção 6.3).
- **Cross-sell:** oferta de produto complementar a um cliente logo após uma compra (seção 6.4).
- **Giftback/Cashback:** crédito percentual sobre uma compra, disponível para uso em uma compra futura (seção 6.4).
- **Opt-in / Opt-out:** consentimento (opt-in) ou solicitação de saída (opt-out) do cliente para receber comunicações (seção 6.6).
