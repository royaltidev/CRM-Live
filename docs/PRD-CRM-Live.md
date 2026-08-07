# DOCUMENTO DE REQUISITOS DO PRODUTO (PRD)

**Sistema:** CRM Live
**Cliente-alvo:** Lojas de comércio varejista que usam o ERP Uniplus
**Responsável:** Wilian — Royal Tecnologia
**Base deste documento:** Levantamento de Requisitos validado com o cliente em 06/08/2026
**Data de elaboração do PRD:** 06/08/2026

---

## 1. Visão Geral do Produto

**CRM Live** é o nome já definido para o sistema (não é provisório — foi usado desde o levantamento de requisitos com o cliente).

O CRM Live é um sistema de relacionamento com o cliente (CRM — sigla em inglês para "Customer Relationship Management", ou "Gestão de Relacionamento com o Cliente") voltado para lojas de comércio varejista que usam o ERP Uniplus. Ele lê os dados de clientes, vendas, produtos e estoque diretamente do banco de dados do Uniplus e, a partir desses dados, dispara mensagens automáticas de WhatsApp para gerar recompra e fidelizar clientes — por exemplo, agradecendo uma compra, avisando quando um produto de interesse voltou ao estoque, ou lembrando um cliente que está há muito tempo sem comprar.

- **Público principal:** o dono da loja (perfil Administrador) e, eventualmente, um colaborador de confiança com acesso mais restrito (perfil Acesso limitado) — ver seção 4.
- **Benefício principal esperado:** aumentar a recompra e a retenção de clientes por meio de comunicação automática, personalizada e oportuna via WhatsApp, sem que o lojista precise fazer esse trabalho manualmente.
- **Contexto de uso:** o sistema roda de forma contínua em segundo plano, monitorando as vendas do Uniplus e disparando mensagens conforme regras configuradas. O dono da loja acessa o sistema para configurar réguas de relacionamento, criar campanhas, acompanhar conversas, tratar avaliações de clientes e consultar relatórios. O volume inicial estimado é de aproximadamente 60 vendas por dia — um volume baixo, compatível com o envio controlado de mensagens exigido pelas regras de cadência (seção 7.3).
- **Facilidade de uso:** a interface deve ser simples, em português, pensada para um usuário com pouca experiência em sistemas — princípio da Royal Tecnologia aplicado a todos os seus produtos.

---

## 2. Problema que o Sistema Resolve

Hoje, o relacionamento pós-venda da loja depende inteiramente de ação manual (ou simplesmente não acontece). Isso gera as seguintes dores, já identificadas no levantamento com o cliente:

- **Nenhum acompanhamento automático do cliente após a compra.** Não existe agradecimento, pesquisa de satisfação ou lembrete de recompra — o relacionamento termina no caixa.
- **Clientes que param de comprar não são identificados nem reengajados.** Não há como saber, de forma automática, quem está "sumindo" da base para agir antes de perdê-lo.
- **Oportunidades de venda cruzada (cross-sell) são perdidas.** Quando um cliente compra um produto que normalmente é vendido junto com outro, ninguém oferece o complemento no momento certo.
- **Reposição de estoque não é comunicada a quem tem interesse.** Um cliente que quis comprar um produto em falta não é avisado quando ele volta a existir em estoque.
- **A maior parte dos clientes não se cadastra**, o que limita a base disponível para qualquer ação de relacionamento (decisão D-05).
- **Qualidade dos dados de contato é incerta** — telefones desatualizados ou inválidos comprometem qualquer tentativa de comunicação (risco R-02).
- **Não há controle de consentimento (LGPD)** — disparar mensagens de marketing sem controle de opt-in/opt-out expõe a loja a risco legal (risco R-04).
- **Não há visão consolidada do cliente.** Hoje as informações de compra estão no Uniplus, mas não existe uma "ficha" que junte histórico, preferências e interações num único lugar.
- **Feedback de clientes insatisfeitos não gera ação imediata.** Uma nota baixa de satisfação pode passar despercebida, sem que o dono seja avisado a tempo de reverter a situação.

---

## 3. Objetivos do Sistema

### Objetivo principal

Aumentar a recompra e a retenção de clientes da loja por meio de comunicação automática, personalizada e controlada via WhatsApp, a partir dos dados de vendas já existentes no Uniplus.

### Objetivos específicos

- Automatizar o contato pós-venda (agradecimento, pesquisa de satisfação) sem exigir ação manual do lojista.
- Identificar automaticamente clientes que pararam de comprar e reengajá-los com campanhas de reativação.
- Aproveitar oportunidades de venda cruzada logo após uma compra.
- Avisar clientes interessados quando um produto voltar ao estoque.
- Construir uma visão única e organizada de cada cliente (dados, histórico, interações).
- Segmentar a base de clientes automaticamente para permitir campanhas direcionadas.
- Permitir que o lojista crie campanhas manuais (promoções, datas comemorativas) para grupos específicos de clientes.
- Garantir que toda comunicação respeite o consentimento do cliente (opt-in/opt-out), conforme a LGPD.
- Dar visibilidade ao dono sobre o desempenho das campanhas e a saúde do relacionamento com os clientes (dashboards e indicadores).
- Encaminhar aos vendedores, via WhatsApp, os clientes que demonstrarem intenção de compra ao responder a uma mensagem.
- Identificar e tratar rapidamente clientes insatisfeitos (nota de satisfação baixa).
- Permitir, no futuro, a troca do mecanismo de envio de WhatsApp (de conexão não oficial para a API oficial) sem impacto para o usuário do sistema.

---

## 4. Personas e Perfis de Usuário

Nesta primeira versão, foi decidido (decisão D-02, refinada tecnicamente em `DECISOES_TECNICAS.md`) que o CRM Live terá **dois perfis de acesso ao sistema**: **Administrador** (a primeira conta Google a autenticar em produção, normalmente o dono da loja) e **Acesso limitado** (qualquer conta Google que autentique depois da primeira, por exemplo um colaborador de confiança). Os vendedores não acessam o CRM Live — eles apenas recebem mensagens de WhatsApp geradas pelo sistema quando um lead precisa de atendimento. Os clientes da loja também não acessam o sistema; eles são o público que recebe as mensagens e pode responder por WhatsApp.

| Perfil | Descrição simples | Principais ações no sistema | Permissões básicas |
| ------ | ----------------- | --------------------------- | ------------------- |
| **Administrador** | Primeira conta Google a autenticar no sistema em produção — normalmente o dono da loja. Permanece Administrador de forma definitiva. | Tudo o que o perfil Acesso limitado pode fazer, além de: gerenciar modelos de mensagem, cupons/vouchers e giftback/cashback; responder clientes na caixa de entrada; tratar notas de satisfação (NPS); configurar parâmetros globais do sistema (tempos, limites, cadência); revisar e desativar acessos de usuários de Acesso limitado. | Acesso completo a todas as funcionalidades do sistema. |
| **Acesso limitado** | Qualquer conta Google que autentique com sucesso após a primeira. Papel atribuído automaticamente, sem necessidade de convite prévio. | Editar campos complementares do cliente; criar/editar segmentos; criar/editar/ativar réguas de relacionamento; criar, disparar e agendar campanhas manuais; configurar produtos complementares (cross-sell) e o percentual de desconto associado; cadastrar e editar vendedores. Pode visualizar as demais telas e relatórios do sistema. | Acesso amplo de visualização; edição restrita às funcionalidades listadas — não altera o que é exclusivo do Administrador. |
| **Vendedor (perfil sem acesso ao sistema)** | Vendedor da loja, já cadastrado no Uniplus. Não faz login no CRM Live. | Recebe, pelo próprio WhatsApp, o nome e o número de um cliente que demonstrou intenção de compra ou dúvida, para assumir o atendimento fora do sistema. | Não acessa o CRM Live. Não visualiza dados além do que recebe na mensagem de encaminhamento de lead. |
| **Cliente da loja** | Pessoa que compra na loja e é cadastrada (ou não) no Uniplus. Não acessa o sistema. | Recebe mensagens automáticas e campanhas via WhatsApp; pode responder mensagens (o que pode gerar encaminhamento a um vendedor); pode solicitar saída da lista de comunicações ("SAIR"). | Não acessa o CRM Live. É o titular dos dados tratados pelo sistema (LGPD). |

> **Observação:** a matriz completa de permissões (tela a tela, ação a ação) está detalhada no `FSD.md`.

---

## 5. Escopo da Primeira Versão

### 5.1 Cadastro e visão 360º do cliente

- **Importação e consolidação de dados de clientes vindos do Uniplus**, incluindo dados cadastrais, histórico de compras, ticket médio, frequência e data da última compra. *(Quem usa: dono da loja. Resolve: falta de visão unificada do cliente.)* Todo cliente do CRM Live tem origem no Uniplus — não há cadastro manual de clientes nesta versão.
- **Linha do tempo de interações** por cliente: compras, mensagens enviadas e recebidas, campanhas recebidas e respostas. *(Resolve: dificuldade de acompanhar o histórico de relacionamento.)*
- **Campos complementares próprios do CRM**, que não existem no Uniplus: data de aniversário, preferências, tags livres e canal de contato preferido.
- **Validação e limpeza de contatos importados**: identificação de telefones inválidos ou duplicados e validação de número de WhatsApp. *Regra de negócio: nenhuma campanha deve ser enviada para um número inválido ou não confirmado como WhatsApp.*
- **Apoio à captação de cadastros**: relatório de vendas realizadas sem cliente identificado, e mecânica de incentivo ao cadastro por meio de **desconto na primeira compra identificada** (decisão confirmada, Q-03).

### 5.2 Segmentação de clientes

- **Segmentação automática por RFM** (Recência, Frequência e Valor Monetário), classificando clientes em grupos como VIP, fiel, em risco ou inativo.
- **Segmentos dinâmicos por filtros combináveis**: categoria de produto comprado, faixa de ticket médio, período, localização (bairro/cidade) e tags.
- **Atualização automática dos segmentos** conforme novas vendas entram pela sincronização com o Uniplus.

### 5.3 Réguas de relacionamento (automações)

- **Motor de automações configurável pelo lojista, sem necessidade de programação**, no formato gatilho + condição + ação (ex.: "quando uma venda ocorrer" + "se o cliente tiver comprado X" + "enviar mensagem Y").
- **Mensagem automática de agradecimento pós-venda** sempre que ocorrer uma compra (RF-001).
- **Régua de boas-vindas na primeira compra**, com mensagem diferente da usada para clientes recorrentes.
- **Mensagem de aniversário**, com oferta opcional.
- **Lembrete de recompra por ciclo de consumo do produto** (ex.: produtos que costumam ser recomprados em um prazo estimado, como ração ou perfume).
- **Pesquisa de satisfação pós-compra**, enviada **30 minutos após a compra**, com nota em **escala de 0 a 10 (NPS)** e alerta imediato ao dono quando a nota for **6 ou menos** (decisão D-07, confirmada).
- **Campanha de reativação (win-back)** quando o cliente ficar um tempo parametrizável sem comprar (RF-002), incluindo **régua em cascata** com mensagens progressivas e incentivo crescente (ex.: 30/60/90/180 dias sem comprar). O dono acompanha os clientes elegíveis a cada etapa em uma tela própria, com filtro pelo tempo sem comprar e opções de envio e de consulta às interações.
- **Aviso de volta ao estoque** para clientes que compraram ou demonstraram interesse em um produto que estava em falta (RF-003).
- **Agendamento de campanhas** para data/hora futura, respeitando a janela de envio permitida das **8h às 18h** (decisão confirmada).

### 5.4 Campanhas e ofertas

- **Envio de campanhas em massa para segmentos** (lançamentos, promoções, datas comemorativas), com personalização por variáveis como nome do cliente, produto e percentual de desconto.
- **Biblioteca de modelos de mensagem reutilizáveis**, com suporte a texto, imagem e link.
- **Cupom/voucher de desconto** com código único e prazo de validade. Como o Uniplus não possui campo para registrar o código do cupom aplicado numa venda (confirmado com o cliente), o resgate não pode ser lido diretamente do Uniplus — a atribuição da venda à campanha é feita pelo critério de período (ver RF-072/seção 5.7).
- **Giftback/cashback**: crédito percentual sobre a compra, disponível para uso em uma compra futura, com prazo de validade.
- **Relação de produtos complementares ("comprados juntos")**, configurável manualmente pelo lojista e/ou sugerida a partir da análise do histórico de vendas.
- **Cross-sell pós-compra automático** (RF-004): ao ocorrer a compra de um produto que costuma ser vendido junto com outro, o sistema oferece o item complementar com desconto. *Regra de negócio: o percentual de desconto adicional é parametrizável nas preferências do administrador (decisão D-04).*

### 5.5 Atendimento (conversas)

- **Caixa de entrada de respostas dos clientes**, para que o dono responda diretamente pelo CRM Live.
- **Interrupção automática de automações** quando o cliente responder a uma mensagem, sinalizando a conversa para atendimento humano (RF-051).
- **Cadastro de vendedores no CRM Live**, com número de WhatsApp, vinculado ao vendedor correspondente no Uniplus.
- **Encaminhamento de lead ao vendedor**: quando um cliente responder demonstrando intenção de compra ou dúvida, o sistema envia por WhatsApp ao vendedor o nome e o número do cliente, para que ele assuma o atendimento (decisão D-02, RF-053). O lead é encaminhado ao **vendedor que realizou a última venda para aquele cliente**, identificado a partir dos dados do Uniplus (decisão confirmada, Q-02). Quando o cliente não tem nenhuma venda anterior registrada, o lead é encaminhado ao **próximo vendedor de uma fila de rodízio** entre os vendedores cadastrados (decisão confirmada).

### 5.6 Consentimento e LGPD

- **Registro de consentimento (opt-in)** por cliente, com data e origem do consentimento.
- **Opt-out simples**: quando o cliente responde algo como "SAIR", ele é automaticamente bloqueado para receber novas campanhas.
- **Lista de supressão** respeitada por todos os disparos, tanto automáticos quanto manuais — nenhuma mensagem pode ser enviada a quem está na lista.
- **Relatório de base de consentimento**: quem consentiu, quem saiu (opt-out) e quem nunca foi contatado.

### 5.7 Métricas e dashboards

- **Painel com indicadores gerais**: taxa de recompra, ticket médio, frequência de compra, quantidade de clientes ativos x inativos e NPS.
- **Desempenho por campanha**: mensagens enviadas, entregues, respondidas, vendas atribuídas e receita gerada.
- **Atribuição de venda a campanha**: identificação de uma venda como resultado de uma campanha por ela ocorrer dentro de um número de dias parametrizável após o envio da campanha. *(O Uniplus não possui campo de código de cupom, então a atribuição não pode se basear em resgate de cupom — apenas no critério de período.)*

### 5.8 Gestão de satisfação (NPS)

- **Tela de gestão de notas de satisfação**, com agrupamento por faixa de nota e filtros por período, vendedor e categoria de produto.
- **Ações diretas a partir da tela de NPS**: enviar mensagem padronizada ao cliente, oferecer desconto/voucher, e localizar o vendedor responsável pela venda relacionada (via dados do Uniplus).
- **Estrutura de ações extensível**: a tela deve permitir adicionar novas ações no futuro sem necessidade de retrabalho (decisão D-07).
- **Histórico de tratamento de cada nota baixa**: quem tratou, qual ação foi tomada e qual foi o resultado.

### 5.9 Integração com o Uniplus

- **Sincronização de clientes, produtos, vendas e estoque** a partir do banco de dados PostgreSQL do Uniplus. *Regra de negócio crítica: a integração é somente de leitura — o CRM Live nunca modifica dados de origem no Uniplus (decisão arquitetural do projeto).*
- **Detecção de novas vendas em tempo quase real**, para acionar automaticamente a mensagem de agradecimento pós-venda e demais réguas.
- **Armazenamento de todos os dados próprios do CRM** (interações, campanhas, respostas, consentimentos) em base de dados própria do CRM Live, separada da base do Uniplus.
- **Painel de status da sincronização**: última execução, quantidade de registros importados e eventuais erros.

### 5.10 Envio de mensagens (regras de operação)

- **Disparo de mensagens via conexão de WhatsApp Web** nesta primeira fase (decisão D-01), com plano de migração futura para a API oficial do WhatsApp.
- **Número de WhatsApp dedicado**: o número usado para os disparos é novo e exclusivo do CRM Live, não sendo o número principal de atendimento da loja (decisão confirmada, Q-05 — mitigação obrigatória do risco de banimento R-01).
- **Controle de cadência de envio**: intervalos entre mensagens e limite diário parametrizável, para reduzir o risco de bloqueio do número usado.
- **Limite de mensagens por cliente**: no máximo **20 mensagens por cliente a cada mês**, para reduzir o risco de excesso de comunicação e denúncias (decisão confirmada, Q-04 — mitigação do risco R-03).
- **Fila de envio com nova tentativa em caso de falha**, sem gerar mensagens duplicadas para o mesmo evento.
- **Alerta ao dono quando a sessão do WhatsApp cair** (ex.: QR code expirado ou celular desconectado).
- **Registro (log) de todo disparo realizado**: quem dependeu do disparo, quando ocorreu, qual modelo de mensagem e qual regra (gatilho) o originou.

---

## 6. Funcionalidades Fora de Escopo

- **Integração com marketplaces.** O cliente pretende futuramente vender também no **Mercado Livre**, mas essa integração fica registrada como fase futura (decisão D-03, marketplace confirmado em Q-01).
- **Recuperação de carrinho abandonado.** Fora de escopo porque a loja não possui e-commerce próprio hoje (decisão D-03).
- **Envio via API oficial do WhatsApp.** A primeira versão utiliza a conexão de WhatsApp Web; a migração para a API oficial é um passo futuro, condicionado à decisão do cliente de investir nessa mudança (decisão D-01).
- **Acesso de vendedores ao sistema.** Nesta versão, apenas os perfis Administrador e Acesso limitado operam o CRM Live; vendedores apenas recebem notificações por WhatsApp (decisão D-02).
- **Cadastro manual de clientes.** O CRM Live não permite criar um cliente diretamente no sistema. Todo cliente tem origem em uma importação do Uniplus — decisão confirmada com o cliente.

Não foram identificadas outras funcionalidades discutidas e explicitamente adiadas além das listadas acima.

---

## 7. Regras de Negócio

### 7.1 Acesso e operação

- O CRM Live tem dois perfis com acesso de login: Administrador (a primeira conta Google autenticada, normalmente o dono da loja) e Acesso limitado (demais contas autenticadas) — decisão D-02, detalhada tecnicamente em `DECISOES_TECNICAS.md` e no `FSD.md`.
- Vendedores não acessam o sistema; recebem apenas notificações pontuais via WhatsApp quando um lead precisa de atendimento.

### 7.2 Integração com o Uniplus

- A integração com o banco de dados do Uniplus é **somente de leitura**. O CRM Live nunca deve alterar, excluir ou sobrescrever dados de clientes, vendas, produtos ou estoque de origem no Uniplus.
- Todos os dados gerados pelo CRM Live (interações, campanhas, consentimentos, conversas, notas de satisfação) ficam armazenados em base própria do CRM Live, nunca misturados à base do Uniplus.

### 7.3 Envio de mensagens e consentimento (LGPD)

- Nenhuma mensagem de campanha (automática ou manual) pode ser enviada a um cliente que não tenha consentimento registrado (opt-in) ou que esteja na lista de supressão (opt-out).
- Quando um cliente responde solicitando sair (ex.: "SAIR"), ele deve ser bloqueado automaticamente e de forma imediata para novas campanhas.
- O envio de mensagens deve respeitar um limite diário e intervalos entre mensagens, para reduzir o risco de bloqueio do número usado para disparo.
- Cada cliente pode receber, no máximo, **20 mensagens por mês** — limite usado para reduzir o risco de excesso de comunicação e denúncias (mitigação do risco R-03).
- O número de WhatsApp usado nos disparos é dedicado exclusivamente ao CRM Live, e não o número principal de atendimento da loja (mitigação do risco R-01).
- Não deve haver envio duplicado de mensagem para o mesmo evento (ex.: a mesma venda não pode gerar dois agradecimentos).
- Quando o cliente responde a qualquer mensagem, as automações daquela conversa devem ser interrompidas, e a conversa deve ser sinalizada para atendimento humano do dono.

### 7.4 Cross-sell e campanhas

- O percentual de desconto adicional oferecido no cross-sell pós-compra é parametrizável nas preferências do administrador (decisão D-04).
- Cupons/vouchers precisam de código único e prazo de validade. Como o Uniplus não registra o código do cupom aplicado, a atribuição da venda a uma campanha usa o critério de período (compra do cliente dentro de um número de dias após o envio).

### 7.5 Atendimento e encaminhamento de leads

- Quando um cliente responder demonstrando intenção de compra ou dúvida, o sistema deve identificar isso e encaminhar o nome e o número do cliente ao vendedor responsável, por WhatsApp.
- O vendedor responsável é aquele que realizou a última venda para aquele cliente, identificado a partir dos dados do Uniplus (decisão confirmada, Q-02).
- Quando o cliente não tiver nenhuma venda anterior registrada, o lead é encaminhado ao próximo vendedor de uma fila de rodízio entre os vendedores cadastrados (decisão confirmada).
- A fila de rodízio avança a cada encaminhamento, garantindo distribuição equilibrada entre os vendedores cadastrados.

### 7.6 Satisfação (NPS)

- A pesquisa de satisfação é enviada **30 minutos após a compra**, com nota em escala de **0 a 10**.
- Uma nota de **6 ou menos** é considerada baixa e deve gerar um alerta imediato ao dono da loja.
- Toda ação tomada a partir de uma nota baixa (mensagem enviada, desconto oferecido, vendedor identificado) deve ficar registrada no histórico daquela nota, incluindo quem tratou e qual foi o resultado.

### 7.7 Dados obrigatórios

- Um número de telefone só pode ser usado para disparo se for validado como número de WhatsApp.
- Contatos duplicados ou inválidos devem ser identificados antes de entrarem em qualquer régua de comunicação.
- Não há cadastro manual de clientes: todo cliente do CRM Live tem origem em uma importação do Uniplus.

---

## 8. Informações que o Sistema Precisa Controlar

| Informação | Para que serve no sistema | Observações importantes |
| ---------- | -------------------------- | ------------------------ |
| **Clientes** | Base central para toda comunicação e segmentação; combina dados importados do Uniplus com dados complementares próprios do CRM. | Dados de origem (nome, telefone, histórico de compras) vêm do Uniplus e não podem ser alterados pelo CRM Live; não há cadastro manual de clientes — todo cliente tem origem em uma importação do Uniplus; campos complementares (aniversário, tags, preferências) são próprios do CRM. |
| **Vendedores** | Permite o encaminhamento de leads via WhatsApp, tanto pela última venda do cliente quanto pela fila de rodízio (quando não há venda anterior). | Cadastro próprio do CRM Live, vinculado ao vendedor correspondente no Uniplus. O sistema precisa guardar a posição atual na fila de rodízio. |
| **Vendas** | Aciona automações (pós-venda, cross-sell) e alimenta segmentação, relatórios e atribuição de campanhas. | Importadas do Uniplus, somente leitura. |
| **Produtos e estoque** | Base para réguas de reposição de estoque, cross-sell e sugestão de produtos complementares. | Importados do Uniplus, somente leitura. |
| **Relação de produtos complementares** | Define quais produtos devem ser oferecidos juntos no cross-sell. | Pode ser configurada manualmente pelo lojista ou sugerida pela análise de histórico de vendas. |
| **Segmentos e tags** | Agrupam clientes para campanhas direcionadas (RFM ou filtros combinados). | Atualizados automaticamente conforme novas vendas entram do Uniplus. |
| **Réguas de relacionamento (automações)** | Definem gatilho, condição e ação de cada mensagem automática. | Configuráveis pelo dono, sem necessidade de programação. |
| **Campanhas manuais** | Registram campanhas em massa criadas pelo dono, incluindo segmento-alvo, mensagem e agendamento. | Deve registrar status de envio, entrega e resposta por cliente. |
| **Modelos de mensagem (templates)** | Reutilização de textos padronizados com variáveis personalizáveis. | Suporta texto, imagem e link. |
| **Cupons/vouchers e giftback/cashback** | Controlam ofertas de desconto ou crédito, seu resgate e validade. | Necessário para atribuir vendas a campanhas. |
| **Consentimento (opt-in/opt-out)** | Garante conformidade com a LGPD em todos os disparos. | Deve registrar data e origem do consentimento; lista de supressão deve ser respeitada por todo o sistema. |
| **Conversas e mensagens trocadas** | Histórico de comunicação com cada cliente, exibido na caixa de entrada e na linha do tempo do cliente. | Inclui mensagens automáticas, campanhas e respostas do cliente. |
| **Notas de satisfação (NPS) e histórico de tratamento** | Permite identificar clientes insatisfeitos e acompanhar as ações tomadas. | Deve registrar nota, data, ação tomada, responsável pelo tratamento e resultado. |
| **Configurações e parâmetros** | Controlam tempos (ex.: dias sem comprar), limites (ex.: mensagens por mês) e percentuais (ex.: desconto de cross-sell). | Ajustáveis pelo dono, sem necessidade de suporte técnico. |
| **Log de disparos (auditoria de envio)** | Garante rastreabilidade de todo envio realizado. | Deve registrar quem/quando/qual modelo/qual gatilho originou cada mensagem. |
| **Status de sincronização com o Uniplus** | Dá visibilidade sobre a saúde da integração. | Deve mostrar última execução, registros importados e erros. |

---

## 9. Fluxos Principais de Uso

### Agradecimento automático pós-venda

1. Uma venda é registrada no Uniplus.
2. O sistema detecta a nova venda durante a sincronização.
3. O sistema identifica o cliente relacionado à venda.
4. O sistema verifica se o cliente tem consentimento válido e não está na lista de supressão.
5. O sistema seleciona o modelo de mensagem de agradecimento (diferenciando primeira compra de compra recorrente).
6. O sistema envia a mensagem de WhatsApp ao cliente, respeitando os limites de cadência.
7. O sistema registra o envio no log de disparos e na linha do tempo do cliente.

### Campanha de reativação (win-back)

1. O sistema verifica periodicamente há quanto tempo cada cliente não compra.
2. Quando um cliente atinge o tempo parametrizado sem comprar, o sistema identifica a etapa da régua de reativação a ser aplicada (ex.: 30, 60 ou 90 dias).
3. O sistema verifica consentimento e lista de supressão.
4. O sistema envia a mensagem de reativação com o incentivo correspondente à etapa.
5. O sistema registra o envio e atualiza o status do cliente na régua.
6. Se o cliente comprar após o envio, o sistema encerra a régua para aquele cliente.

### Cross-sell pós-compra

1. Uma venda é registrada no Uniplus e detectada pelo sistema.
2. O sistema verifica se o produto vendido possui um produto complementar cadastrado.
3. O sistema verifica consentimento do cliente.
4. O sistema monta a oferta do produto complementar com o desconto parametrizado.
5. O sistema envia a mensagem ao cliente.
6. O sistema registra o envio e associa a eventual venda futura a essa oferta, se resgatada.

### Aviso de volta ao estoque

1. O sistema sincroniza o estoque a partir do Uniplus.
2. O sistema identifica que um produto de interesse de um ou mais clientes voltou a ter estoque.
3. O sistema verifica consentimento de cada cliente interessado.
4. O sistema envia a mensagem de aviso a cada cliente.
5. O sistema registra o envio.

### Criação e disparo de campanha manual

1. O dono acessa a área de campanhas.
2. O dono seleciona um segmento de clientes (ou cria um novo filtro).
3. O dono escolhe um modelo de mensagem ou cria uma nova mensagem, com variáveis de personalização.
4. O dono define data/hora de envio (imediato ou agendado) e, se aplicável, cupom ou giftback associado.
5. O sistema valida se todos os destinatários têm consentimento válido, removendo automaticamente quem está na lista de supressão.
6. O dono confirma o disparo.
7. O sistema envia as mensagens respeitando os limites de cadência e registra o resultado (enviadas, entregues, respondidas).

### Atendimento e encaminhamento de lead

1. Um cliente responde a uma mensagem recebida.
2. O sistema identifica a resposta e interrompe qualquer automação em andamento para aquele cliente.
3. A conversa aparece na caixa de entrada do dono, sinalizada para atendimento humano.
4. O sistema avalia se a resposta demonstra intenção de compra ou dúvida.
5. Se sim, o sistema identifica o vendedor responsável — o da última venda do cliente ou, se não houver venda anterior, o próximo da fila de rodízio — e envia a ele, por WhatsApp, o nome e o número do cliente.
6. O dono também pode responder diretamente pela caixa de entrada do CRM Live.
7. O sistema registra a interação na linha do tempo do cliente.

### Opt-out (saída da lista de comunicações)

1. O cliente responde a uma mensagem com um termo de saída (ex.: "SAIR").
2. O sistema identifica a solicitação.
3. O sistema marca o cliente na lista de supressão.
4. O sistema bloqueia automaticamente qualquer campanha futura, automática ou manual, para esse cliente.
5. O sistema registra a data e a origem do opt-out.

### Gestão de nota de satisfação baixa

1. Um cliente responde à pesquisa de satisfação com uma nota considerada baixa.
2. O sistema registra a nota e dispara um alerta imediato ao dono.
3. O dono acessa a tela de gestão de NPS.
4. O dono visualiza a nota, o cliente e, se necessário, localiza o vendedor responsável pela venda relacionada.
5. O dono escolhe uma ação: enviar mensagem padronizada, oferecer desconto/voucher ou outra ação disponível.
6. O sistema executa a ação escolhida e registra o resultado no histórico daquela nota.

### Sincronização com o Uniplus

1. O sistema executa a sincronização periódica (ou detecta alterações) no banco de dados do Uniplus.
2. O sistema lê clientes, vendas, produtos e estoque novos ou alterados.
3. O sistema atualiza sua própria base com essas informações, sem alterar os dados de origem.
4. O sistema atualiza segmentos automaticamente conforme os novos dados.
5. O sistema aciona as automações relacionadas às novas vendas (ex.: agradecimento, cross-sell).
6. O sistema registra o resultado da sincronização (registros importados, erros) no painel de status.

---

## 10. Histórias de Usuário

- Como **dono da loja**, eu quero que o sistema agradeça automaticamente cada compra por WhatsApp para manter um relacionamento ativo sem esforço manual.
- Como **dono da loja**, eu quero ser avisado automaticamente quando um cliente ficar muito tempo sem comprar, para poder reengajá-lo antes de perdê-lo.
- Como **dono da loja**, eu quero que o sistema ofereça automaticamente um produto complementar com desconto após uma compra, para aumentar o valor de cada venda.
- Como **dono da loja**, eu quero avisar automaticamente um cliente quando um produto de interesse voltar ao estoque, para não perder a venda.
- Como **dono da loja**, eu quero visualizar o histórico completo de cada cliente (compras, mensagens, campanhas) em um único lugar, para entender melhor seu comportamento.
- Como **dono da loja**, eu quero que os clientes sejam segmentados automaticamente (VIP, em risco, inativo, etc.), para direcionar campanhas de forma mais eficiente.
- Como **dono da loja**, eu quero criar campanhas manuais para grupos específicos de clientes, para divulgar promoções e datas comemorativas.
- Como **dono da loja**, eu quero responder às mensagens dos clientes dentro do próprio sistema, para centralizar o atendimento.
- Como **dono da loja**, eu quero que o sistema encaminhe automaticamente ao vendedor os clientes que demonstrarem interesse de compra, para agilizar o atendimento.
- Como **dono da loja**, eu quero que os clientes possam sair da lista de comunicações a qualquer momento, para respeitar a vontade deles e cumprir a LGPD.
- Como **dono da loja**, eu quero ser alertado imediatamente quando um cliente der uma nota de satisfação baixa, para agir antes de perder o cliente.
- Como **dono da loja**, eu quero acompanhar indicadores de recompra, ticket médio e desempenho de campanhas, para tomar decisões com base em dados.
- Como **dono da loja**, eu quero saber quando a sincronização com o Uniplus falhar, para garantir que as automações continuem funcionando corretamente.
- Como **cliente da loja**, eu quero poder pedir para sair da lista de mensagens a qualquer momento, para não ser mais contatado se não quiser.

---

## 11. Critérios de Aceitação

### Agradecimento automático pós-venda
- [ ] Toda venda registrada no Uniplus gera uma mensagem de agradecimento ao cliente correspondente, quando ele tem consentimento válido.
- [ ] O sistema não envia mensagem duplicada para a mesma venda.
- [ ] O sistema não envia mensagem a clientes sem consentimento ou na lista de supressão.
- [ ] O envio fica registrado no log de disparos e na linha do tempo do cliente.

### Campanha de reativação (win-back)
- [ ] O sistema identifica corretamente clientes que atingiram o tempo parametrizado sem comprar; esse parâmetro aparece como um filtro na mesma tela em que são exibidos os clientes elegíveis, com opções de envio e de consulta às interações.
- [ ] As mensagens seguem a régua em cascata configurada (ex.: 30/60/90/180 dias).
- [ ] O sistema interrompe a régua quando o cliente volta a comprar.

### Cross-sell pós-compra
- [ ] O sistema identifica corretamente produtos complementares cadastrados.
- [ ] O desconto aplicado respeita o percentual parametrizado pelo administrador.
- [ ] O sistema permite identificar se uma venda futura do cliente ocorreu dentro do período de atribuição da oferta, mesmo sem um campo de código de cupom no Uniplus.

### Campanhas manuais
- [ ] O dono consegue selecionar um segmento e enviar uma campanha personalizada.
- [ ] O sistema impede o envio a clientes sem consentimento ou na lista de supressão.
- [ ] O sistema exibe o resultado da campanha (enviadas, entregues, respondidas, vendas atribuídas).

### Consentimento e opt-out (LGPD)
- [ ] O sistema registra data e origem do consentimento de cada cliente.
- [ ] Um cliente que responde com termo de saída é bloqueado automaticamente para novas campanhas.
- [ ] Nenhum disparo, automático ou manual, ocorre para clientes na lista de supressão.

### Atendimento e encaminhamento de leads
- [ ] Ao responder uma mensagem, a automação em andamento para aquele cliente é interrompida.
- [ ] A conversa aparece na caixa de entrada do dono.
- [ ] Quando a resposta demonstra intenção de compra, o vendedor correspondente recebe o nome e número do cliente por WhatsApp.
- [ ] Se o cliente tem venda anterior no Uniplus, o lead vai para o vendedor daquela venda; se não tem, vai para o próximo vendedor da fila de rodízio.
- [ ] A fila de rodízio avança a cada lead encaminhado sem venda anterior, distribuindo os leads de forma equilibrada entre os vendedores.

### Gestão de satisfação (NPS)
- [ ] A pesquisa é enviada 30 minutos após a compra, com nota em escala de 0 a 10.
- [ ] Uma nota de 6 ou menos gera alerta imediato ao dono.
- [ ] O dono consegue visualizar, filtrar e agrupar notas por faixa, período, vendedor e categoria de produto.
- [ ] Toda ação tomada a partir de uma nota fica registrada no histórico, com responsável e resultado.

### Sincronização com o Uniplus
- [ ] O sistema nunca altera dados de origem no Uniplus (somente leitura).
- [ ] O painel de status exibe última execução, registros importados e erros.
- [ ] Novas vendas detectadas acionam corretamente as automações relacionadas (agradecimento, cross-sell).

---

## 12. Consultas, Relatórios e Indicadores

O sistema precisa oferecer, para o dono da loja, os seguintes painéis e consultas:

- **Dashboard geral de relacionamento**: taxa de recompra, ticket médio, frequência de compra, quantidade de clientes ativos x inativos e NPS médio. Ajuda o dono a entender a saúde geral da base de clientes.
- **Desempenho por campanha**: quantidade de mensagens enviadas, entregues, respondidas, vendas atribuídas e receita gerada por campanha. Ajuda a decidir quais campanhas repetir ou ajustar.
- **Relatório de consentimento**: quem consentiu em receber comunicações, quem saiu (opt-out) e quem nunca foi contatado. Ajuda a garantir conformidade com a LGPD e dimensionar o alcance real das campanhas.
- **Relatório de vendas sem cliente identificado**: vendas do Uniplus que não têm cliente vinculado. Ajuda o dono a entender o tamanho do problema de captação de cadastro e acompanhar a evolução desse indicador.
- **Painel de status da sincronização**: última execução, registros importados e erros da integração com o Uniplus. Ajuda o dono a confiar que as automações estão funcionando corretamente.
- **Tela de gestão de notas de satisfação**: notas agrupadas por faixa, com filtros por período, vendedor e categoria de produto. Ajuda o dono a agir rapidamente sobre insatisfações.

Essas consultas e relatórios estão disponíveis aos dois perfis com acesso ao sistema (Administrador e Acesso limitado); ações e telas exclusivas do Administrador estão detalhadas na seção 13 e no `FSD.md`.

---

## 13. Permissões e Segurança Funcional

O CRM Live tem dois perfis de acesso ao sistema (decisão D-02, refinada tecnicamente em `DECISOES_TECNICAS.md`): Administrador e Acesso limitado. A matriz completa de permissões (tela a tela) está no `FSD.md`; esta tabela resume o nível de acesso de cada perfil:

| Perfil | Pode fazer | Não pode fazer | Observações |
| ------ | ---------- | --------------- | ------------ |
| **Administrador** | Tudo o que o Acesso limitado pode fazer, além de: gerenciar modelos de mensagem, cupons/vouchers e giftback/cashback; responder clientes pela caixa de entrada; tratar notas de satisfação (NPS); configurar parâmetros globais do sistema; revisar e desativar acessos de usuários de Acesso limitado. | Alterar dados de origem no Uniplus (a integração é somente leitura, por regra do projeto). | É a primeira conta Google a autenticar em produção; permanece Administrador de forma definitiva. |
| **Acesso limitado** | Visualizar todas as telas e relatórios; editar campos complementares do cliente; criar/editar segmentos; criar/editar/ativar réguas de relacionamento; criar, disparar e agendar campanhas manuais; configurar cross-sell; cadastrar e editar vendedores. | Gerenciar modelos de mensagem, cupons/vouchers, giftback/cashback; acessar a caixa de entrada; executar ações sobre notas de NPS; alterar parâmetros globais; acessar a gestão de usuários do CRM Live. | Papel atribuído automaticamente a qualquer conta Google que autentique após a primeira, sem convite prévio. |
| **Vendedor** | Receber notificações de leads por WhatsApp. | Acessar o sistema, visualizar relatórios, configurar automações ou responder pela caixa de entrada do CRM Live. | Interage com o sistema apenas de forma passiva, via WhatsApp. |
| **Cliente** | Responder mensagens recebidas; solicitar saída da lista de comunicações. | Acessar o sistema ou qualquer informação armazenada sobre si além do que recebe por mensagem. | É o titular dos dados tratados pelo sistema. |

---

## 14. Limitações da Primeira Versão

- **Não haverá integração com marketplaces** nesta versão — fica registrada como fase futura (decisão D-03).
- **Não haverá recuperação de carrinho abandonado**, pois a loja não possui e-commerce próprio (decisão D-03).
- **O disparo de mensagens usará a conexão de WhatsApp Web**, não a API oficial do WhatsApp, nesta primeira fase — com os riscos assumidos e mitigações descritas na decisão D-01. A migração para a API oficial é um passo futuro, condicionado à decisão do cliente.
- **O sistema terá dois perfis de acesso interno** — Administrador e Acesso limitado (decisão D-02, refinada tecnicamente em `DECISOES_TECNICAS.md`) — sem previsão de um terceiro perfil nesta versão.
- **Vendedores não têm acesso ao sistema** — recebem apenas notificações pontuais por WhatsApp.
- **O sistema é pensado para uma única loja/operação**, consistente com o contexto do cliente atual.

---

## 15. Pontos Pendentes Antes do FSD

Não foram identificadas dúvidas funcionais pendentes para a criação do FSD. Todas as questões levantadas nas versões anteriores deste PRD foram respondidas pelo cliente e incorporadas ao documento: mecânica de incentivo ao cadastro (Q-03 → desconto na primeira compra identificada), limite de mensagens por cliente/mês (Q-04 → 20), número de WhatsApp dedicado (Q-05 → sim), escala da pesquisa de satisfação (0–10), limite de nota baixa (6 ou menos), prazo de envio da pesquisa (30 minutos após a compra), marketplace de interesse (Q-01 → Mercado Livre, integração fica para fase futura), regra de roteamento de leads (Q-02 → vendedor da última venda; sem venda anterior → fila de rodízio entre vendedores), rastreio de cupom (Uniplus não possui esse campo — atribuição por período) e janela de horário comercial (8h às 18h).

---

## 16. Resumo Final do PRD

O **CRM Live** será um sistema que lê dados de clientes, vendas, produtos e estoque do ERP Uniplus e dispara mensagens automáticas de WhatsApp para gerar recompra e fidelizar clientes de lojas de comércio varejista. O sistema terá dois perfis de acesso — Administrador (a primeira conta Google autenticada, normalmente o dono da loja) e Acesso limitado (para eventuais colaboradores de confiança) —, que poderão configurar automações (agradecimento pós-venda, reativação, cross-sell, aviso de volta ao estoque, pesquisa de satisfação), criar campanhas manuais e acompanhar relatórios de desempenho; algumas ações, como atender clientes na caixa de entrada, tratar avaliações de satisfação e configurar parâmetros globais, são exclusivas do Administrador — sempre respeitando o consentimento do cliente conforme a LGPD.

Ficam fora da primeira versão: integração com marketplaces, recuperação de carrinho abandonado, uso da API oficial do WhatsApp (a primeira fase usa WhatsApp Web) e acesso de vendedores ao sistema.

Todas as definições que estavam pendentes já foram confirmadas pelo cliente: mecânica de incentivo ao cadastro, limite de mensagens por cliente/mês, uso de número de WhatsApp dedicado, parâmetros da pesquisa de satisfação (escala, prazo de envio e limite de nota baixa), marketplace de interesse futuro, regra de roteamento de leads (incluindo o caso de cliente sem venda anterior, resolvido pela fila de rodízio entre vendedores), rastreio de cupom e janela de horário comercial de envio.

Não há pontos funcionais pendentes. O projeto está pronto para avançar integralmente para o FSD.
