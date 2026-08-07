# DECISÕES TÉCNICAS DO PROJETO

**Sistema:** CRM Live
**Etapa:** Decisões técnicas (preparação para o FSD)
**Data:** 06/08/2026
**Responsável:** Wilian — Royal Tecnologia

---

## 1. Documentos recebidos

- **PRD.md**: recebido (`docs/PRD-CRM-Live.md`), elaborado a partir do levantamento de requisitos validado com o cliente em 06/08/2026 (`docs/levantamento-requisitos.md`).
- **DESIGN.md**: **recebido em 07/08/2026**, em `docs/design/design.md` (design system "Admin Logic": paleta de cores, tipografia — Public Sans + Inter —, raio, espaçamento e diretrizes de componentes). Confirmado pelo responsável como o padrão visual definitivo do CRM Live, após validação de um esboço de tela (Dashboard geral), substituindo as opções recomendadas registradas na seção 6.
- **Observação**: as instruções gerais do projeto CRM-Live mencionavam um segundo sistema de origem ("Integrar") e um ambiente de hospedagem "Hostinger", ausentes do PRD. Foi confirmado com o responsável que isso **não se aplica a esta primeira versão** — é contexto que não faz parte do escopo do PRD atual.

---

## 2. Identificação do sistema

O **CRM Live** é um sistema de relacionamento com o cliente para lojas de comércio varejista que usam o ERP Uniplus. Ele lê clientes, vendas, produtos e estoque diretamente do banco PostgreSQL do Uniplus (somente leitura) e dispara mensagens automáticas de WhatsApp para gerar recompra e fidelização (agradecimento pós-venda, reativação, cross-sell, aviso de volta ao estoque, pesquisa de satisfação), além de permitir campanhas manuais, atendimento centralizado e gestão de satisfação (NPS) — sempre respeitando consentimento (LGPD).

- **Público usuário:** dono da loja (usuário principal/administrador) e, por decisão tomada nesta etapa, um segundo perfil de acesso limitado (ver seção 8).
- **Contexto de uso:** sistema roda continuamente em segundo plano no PC da própria loja, monitorando vendas do Uniplus quase em tempo real e disparando mensagens conforme réguas configuráveis. Volume inicial baixo (~60 vendas/dia).

---

## 3. Decisões técnicas confirmadas

### Stack
- Backend, API e jobs de automação/sincronização em **Python**.
- Frontend em **React**, consumindo a API do backend.
- Banco de dados próprio do CRM Live em **PostgreSQL** (mesmo SGBD do Uniplus).
- Biblioteca de componentes de interface: **Material UI (MUI)**.

### Ambientes
- **Desenvolvimento local:** Docker Compose (backend Python, PostgreSQL e frontend React sobem juntos, isolados, com o mesmo arquivo podendo ser reaproveitado na produção).
- **Testes/homologação:** não haverá ambiente separado nesta primeira versão. Testes ocorrem localmente (Docker Compose) antes de publicar.
- **Produção:** PC da própria loja (cliente), sistema operacional Windows 10 Pro, rodando continuamente (24/7), na mesma rede/máquina de onde o CRM Live acessa o PostgreSQL do Uniplus. Deploy detalhado fica para etapa própria do fluxo.

### Arquitetura
- Organização obrigatória inspirada em **MVC** (Model – regras e acesso a dados; View – interface React; Controller – recebe ações e aciona regras), mesmo sem um framework MVC "pronto" — a separação entre banco, regra de negócio e interface deve ser preservada no FSD.
- Integração com o Uniplus é **somente leitura**; nenhum dado de origem no Uniplus pode ser alterado, excluído ou sobrescrito.
- Camada de abstração de envio de mensagens (WhatsApp Web nesta fase, com possibilidade de migrar para API oficial no futuro sem retrabalho) — já prevista no PRD (RNF-08).

### Autenticação
- Login via **OAuth Google** ("Entrar com Google"), sem senha própria do sistema.
- Qualquer conta Google pode tentar autenticar.

### Usuários e permissões (RBAC)
- **Divergência com o PRD original, já corrigida:** o PRD (seções 4 e 13) previa originalmente um único usuário com acesso ao sistema, sem necessidade de perfis diferenciados. Nesta etapa, o responsável confirmou uma mudança de modelo: **2 perfis de acesso**, descritos na seção 8. Essa mudança já foi refletida no `PRD.md` (atualizado em 06/08/2026), que agora descreve os perfis Administrador e Acesso limitado.

### Auditoria
- Já prevista funcionalmente no PRD: log de todo disparo de mensagem (quem/quando/modelo/gatilho) e histórico de tratamento de cada nota de satisfação baixa (quem tratou, ação, resultado).

### Soft delete
- **Não incluído** como recurso estrutural adicional nesta versão (decisão explícita). Não foi identificada, no PRD, necessidade clara de exclusão lógica de registros.

### Logs
- Log de disparos (auditoria de envio) e alerta de queda de sessão do WhatsApp: já confirmados no PRD (RNF-04 e RNF-03).
- Log de erros técnicos com contingência em arquivo (fora da pasta pública, para quando o banco estiver indisponível): **não foi incluído como item formal adicional** nesta etapa (decisão explícita do responsável). Registrado como ponto de atenção na seção 15, por o sistema rodar sem supervisão constante.
- Log de segurança: eventos de LGPD (opt-in/opt-out), autenticação Google (sucesso/falha) e alteração de permissões entre perfis devem ser registrados — ver seção 13.

### Configurações globais
- Já previstas funcionalmente no PRD: tempos (dias sem comprar), limites (mensagens por cliente/mês), percentuais (desconto de cross-sell), janela de horário de envio (8h–18h) e cadência de disparo — todos parametrizáveis, sem suporte técnico.
- **Esclarecimento de escopo (evita ambiguidade com a seção 8):** parâmetros específicos de um módulo que o Acesso limitado já pode editar — como os dias de cada etapa de uma régua (ex.: win-back) ou o percentual de desconto do cross-sell — são editados dentro do próprio módulo (réguas / cross-sell), por quem tiver permissão de editar aquele módulo (Administrador e Acesso limitado, conforme seção 8). Os demais parâmetros — limite de mensagens/mês, janela de horário de envio e cadência de disparo — afetam o funcionamento técnico do disparo e o risco de bloqueio do número de WhatsApp, e por isso são exclusivos do Administrador.

### Uploads
- Confirmado: modelos de mensagem suportam imagem (além de texto e link). Regras básicas: tipos jpg/png/webp, tamanho máximo de 5MB, arquivo vinculado ao template. Ver seção 12.

### Exportações
- Relatórios/listagens: exportação em **CSV**.
- Relatórios gerenciais (dashboard geral e desempenho de campanha): exportação também em **PDF**.

### APIs e integrações externas
- Nenhuma API externa ou integração adicional nesta versão, além da leitura direta do PostgreSQL do Uniplus e da conexão com WhatsApp Web (biblioteca de automação, não uma API exposta pelo CRM Live).
- Sistema "Integrar" e hospedagem Hostinger: confirmados como fora de escopo desta versão (ver seção 1).

### Segurança
- Acesso ao PostgreSQL do Uniplus deve usar usuário de menor privilégio (somente leitura).
- Número de WhatsApp usado nos disparos é dedicado, distinto do número principal da loja.
- Nenhum segredo, token ou credencial deve constar em código, log ou documentação.

### Desempenho
- Ver alertas na seção 11.

### Fora de escopo técnico
- Integração com marketplaces, recuperação de carrinho abandonado, API oficial do WhatsApp e acesso de vendedores ao sistema seguem fora de escopo, conforme o PRD.

---

## 4. Decisões adotadas por padrão

- **Ambiente de testes/homologação:** nenhum ambiente obrigatório nesta primeira versão — padrão do processo, confirmado pelo responsável.
- **Padrão de entrega para a IA codificadora:** o FSD deverá incluir implementação sugerida em etapas pequenas, progressivas e testáveis, começando pela estrutura/MVC, depois banco de dados, depois autenticação, depois sincronização com o Uniplus, e por fim cada funcionalidade — padrão do processo, confirmado pelo responsável.

Nenhuma outra decisão foi assumida apenas por padrão nesta etapa: todas as demais foram respondidas explicitamente pelo responsável.

---

## 5. Stack e ambientes

- **Linguagem/backend:** Python.
- **Frontend:** React + Material UI (MUI).
- **Banco de dados:** PostgreSQL (base própria do CRM Live, separada da base do Uniplus).
- **Ambiente local:** Docker Compose (backend, banco e frontend).
- **Ambiente de testes/homologação:** inexistente nesta versão; validação local antes de publicar.
- **Ambiente de produção:** PC Windows 10 Pro na loja do cliente, rodando continuamente, mesma rede/máquina do Uniplus.
- **Observações sobre deploy:** processo de publicação/instalação no PC da loja será tratado em etapa própria do fluxo, fora do escopo desta etapa.

---

## 6. Arquitetura obrigatória

O sistema deve seguir organização inspirada em **MVC**:
- **Model:** regras de negócio e acesso a dados (leitura do Uniplus e escrita na base própria do CRM Live).
- **View:** interface React (MUI).
- **Controller:** camada da API Python que recebe ações do frontend, aciona as regras e retorna respostas.

A separação entre banco de dados, regra de negócio e interface deve ser preservada no FSD, mesmo sem um framework MVC "pronto". A estrutura de pastas será detalhada no FSD, não neste documento.

---

## 7. Recursos estruturais definidos

| Recurso | Decisão |
| --- | --- |
| Autenticação | OAuth Google, sem senha própria do sistema. |
| RBAC | Sim — 2 perfis (Administrador e Acesso limitado). Divergia do PRD original; PRD já atualizado (06/08/2026). |
| Auditoria | Sim, básica — já prevista no PRD (log de disparos, histórico de tratamento de NPS). |
| Soft delete | Não incluído nesta versão. |
| Log de erros | Não incluído formalmente como item estrutural adicional nesta etapa (ponto de atenção — seção 15). |
| Log de segurança | Sim — eventos de LGPD, autenticação e alteração de permissões (seção 13). |
| Configurações globais | Sim — parâmetros funcionais já previstos no PRD (tempos, limites, percentuais, janela de envio, cadência). |
| Uploads e anexos | Sim — imagens em modelos de mensagem. |
| Exportações | Sim — CSV (geral) e PDF (relatórios gerenciais). |
| APIs | Não há nesta versão. |
| Integrações externas | Apenas leitura do PostgreSQL do Uniplus e conexão com WhatsApp Web. |

---

## 8. Perfis e permissões em nível alto

| Perfil | Descrição | Pode alterar |
| --- | --- | --- |
| **Administrador** | Primeira conta Google a autenticar em produção. Permanece administrador definitivamente. | Tudo — inclusive o que é exclusivo dele: modelos de mensagem (templates), cupom/voucher, giftback/cashback, caixa de entrada (atendimento ao cliente), ações sobre notas de NPS e parâmetros globais do sistema. |
| **Acesso limitado** | Qualquer outra conta Google autenticada após a primeira. | Campos complementares do cliente; segmentos dinâmicos; réguas de automação (criar/editar/ativar); campanhas manuais (criar, disparar e agendar); cross-sell (produtos complementares e desconto); cadastro/edição de vendedores. Pode visualizar tudo, mas não altera o que é exclusivo do Administrador (ver coluna anterior). |

A matriz completa de permissões (tela a tela, ação a ação) será detalhada no FSD.

---

## 9. Entidades prováveis em nível alto

- **Clientes** (importados do Uniplus + campos complementares do CRM: aniversário, preferências, tags, canal preferido).
- **Vendedores** (cadastro próprio do CRM, vinculado ao Uniplus, com posição na fila de rodízio).
- **Vendas** e **Produtos/Estoque** (leitura do Uniplus).
- **Produtos complementares** (relação para cross-sell).
- **Segmentos e tags**.
- **Réguas de relacionamento** (automações: gatilho + condição + ação).
- **Campanhas manuais** e **Modelos de mensagem** (templates, com upload de imagem).
- **Cupons/vouchers** e **Giftback/cashback**.
- **Consentimento** (opt-in/opt-out, lista de supressão).
- **Conversas e mensagens** (caixa de entrada, linha do tempo do cliente).
- **Notas de satisfação (NPS)** e histórico de tratamento.
- **Configurações e parâmetros**.
- **Log de disparos**.
- **Status de sincronização** com o Uniplus.
- **Usuários do CRM Live** (Administrador / Acesso limitado, vinculados a conta Google).

O modelo de dados completo (campos, chaves, relacionamentos) será definido no FSD.

---

## 10. Módulos, telas e fluxos esperados em nível alto

O FSD deverá detalhar:
- Login (OAuth Google) e gestão do perfil do usuário autenticado.
- Dashboard geral de relacionamento (indicadores).
- Módulo de clientes (visão 360º, linha do tempo).
- Segmentação (RFM e filtros dinâmicos).
- Réguas de relacionamento (configuração das automações).
- Campanhas (criação, agendamento, modelos de mensagem, cupom/giftback).
- Caixa de entrada (atendimento e encaminhamento de leads).
- Cadastro de vendedores (incluindo fila de rodízio).
- Gestão de satisfação (NPS).
- Relatório de consentimento (LGPD).
- Configurações e parâmetros do sistema.
- Painel de status da sincronização com o Uniplus.
- Relatórios com exportação (CSV/PDF).
- **Gestão de usuários do CRM Live** (decisão confirmada): tela exclusiva do Administrador para revisar quem já autenticou no sistema e desativar acessos de usuários de Acesso limitado quando necessário. Justificativa: como qualquer conta Google pode se autenticar e se tornar automaticamente um usuário de Acesso limitado (sem convite ou aprovação prévia), esta tela viabiliza, na prática, o evento de log de segurança "alteração de permissões entre perfis" já previsto na seção 13, e dá ao Administrador uma forma de revisar acessos indevidos a dados de clientes protegidos pela LGPD.

---

## 11. Alertas para relatórios, consultas, exportações e desempenho

- **Relatórios/painéis definidos no PRD:** dashboard geral, desempenho por campanha, relatório de consentimento, relatório de vendas sem cliente identificado, painel de status de sincronização, tela de gestão de NPS.
- **Exportações confirmadas:** CSV em relatórios/listagens; PDF em dashboard geral e desempenho de campanha.
- **Filtros importantes a considerar no FSD:** data/período (venda, última compra, envio de campanha), etapa da régua de reativação (30/60/90/180 dias sem comprar), segmento/tags, categoria de produto, vendedor responsável, faixa de nota de NPS, status de consentimento, validade de número WhatsApp.
- **Alerta de desempenho:** o FSD deverá avaliar a necessidade de índices para consultas críticas, especialmente em: busca/filtro de clientes por nome ou telefone; clientes elegíveis por tempo sem comprar (réguas de reativação); log de disparos filtrado por data/cliente/campanha; notas de NPS filtradas por faixa/período/vendedor/categoria; vendas usadas na atribuição de campanha por período. Índices específicos não são definidos nesta etapa.

---

## 12. Alertas para uploads, anexos e arquivos

- **Onde é usado:** modelos de mensagem (templates), que suportam imagem além de texto e link.
- **Regras já confirmadas:** tipos permitidos jpg/png/webp; tamanho máximo de 5MB; arquivo vinculado ao template correspondente.
- **Quem envia:** apenas o perfil Administrador (criação/edição de templates é item exclusivo dele, conforme seção 8).
- **Cuidados que o FSD deverá detalhar:** armazenamento fora de pasta publicamente acessível pela web; proteção contra acesso direto/indevido ao arquivo; validação do tipo real do arquivo (não confiar apenas na extensão).

---

## 13. Alertas para logs, auditoria e segurança

- **Auditoria:** log de disparos (quem/quando/modelo/gatilho originou cada mensagem) e histórico de tratamento de notas de NPS (quem tratou, ação tomada, resultado) — já confirmados no PRD; o FSD deve detalhar a estrutura desses registros.
- **Log de erros:** não foi incluído formalmente como item estrutural adicional nesta etapa. Como o sistema roda sozinho em segundo plano (monitorando vendas e disparando mensagens sem supervisão constante), este é um ponto de atenção — ver pendência na seção 15.
- **Log de segurança — eventos que o FSD deve prever:** falha de autenticação Google; tentativa de acesso de conta não autorizada; opt-out de cliente (LGPD); alteração de permissões entre perfis (Administrador/Acesso limitado), registrada a partir de ações feitas na tela de Gestão de usuários do CRM Live (seção 10); queda de sessão do WhatsApp (já previsto no PRD).
- **Contingência de log em arquivo:** não decidida nesta etapa (ver seção 15).

---

## 14. Itens que não devem ser inventados

- Integração com o sistema "Integrar" (confirmado fora de escopo).
- Hospedagem em servidor Hostinger (confirmado fora de escopo — produção é o PC local da loja).
- APIs externas ou webhooks além da leitura do PostgreSQL do Uniplus.
- Integração com marketplaces (fase futura, conforme PRD).
- Recuperação de carrinho abandonado (fora de escopo, conforme PRD).
- API oficial do WhatsApp (fase futura, conforme PRD — nesta versão usa-se WhatsApp Web).
- Acesso de vendedores ao sistema (fora de escopo, conforme PRD).
- Cadastro manual de clientes (fora de escopo, conforme PRD — todo cliente vem do Uniplus).
- Soft delete (não incluído nesta etapa).
- Log de erros com contingência em arquivo (não incluído formalmente nesta etapa).
- Qualquer terceiro perfil de acesso além de Administrador e Acesso limitado.

---

## 15. Pendências não bloqueantes

- ~~**Divergência com o PRD sobre número de perfis de usuário:**~~ **Resolvida em 06/08/2026.** O `PRD.md` foi atualizado para refletir os 2 perfis (Administrador e Acesso limitado) confirmados nesta etapa.
- **Log de erros com contingência em arquivo:** não foi incluído formalmente nesta etapa. Como o sistema roda sem supervisão constante, recomenda-se revisitar esse ponto — mesmo que informalmente — durante o FSD ou logo após a primeira versão em produção.
- **Soft delete:** não incluído nesta etapa. Se, durante o FSD, alguma entidade (réguas, campanhas, vendedores, templates) exigir exclusão com necessidade de recuperação/auditoria, esse ponto deve ser reaberto com o responsável.
- ~~**DESIGN.md:** ainda não existe.~~ **Resolvida em 07/08/2026.** O design system "Admin Logic" foi recebido e confirmado em `docs/design/design.md`, com um esboço da tela de Dashboard geral validado pelo responsável.

---

## 16. Pronto para o FSD

As decisões técnicas estão prontas para a criação do FSD. O próximo passo será gerar `docs/FSD.md`, com base em:

- `PRD.md`;
- `DECISOES_TECNICAS.md` (este documento);
- `DESIGN.md` (`docs/design/design.md`), já disponível e confirmado.
