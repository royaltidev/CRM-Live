# CRM Live — Levantamento de Requisitos

**Projeto:** CRM Live
**Cliente-alvo:** Lojas de comércio varejista (usuário do ERP Uniplus)
**Responsável:** Wilian — Royal Tecnologia
**Data:** 06/08/2026
**Status:** Validado com o cliente em 06/08/2026 — pronto para virar PRD

---

## 1. Contexto e objetivo

O cliente deseja um CRM integrado ao banco de dados PostgreSQL do sistema Uniplus, capaz de disparar mensagens de WhatsApp automaticamente a partir de eventos de venda e de regras de relacionamento. O objetivo do produto é gerar recompra e retenção por meio de comunicação ativa e personalizada com os clientes da loja.

Este documento consolida: (a) requisitos coletados diretamente com o cliente; (b) requisitos sugeridos com base em pesquisa de soluções de mercado (Zoppy, Smartbis, SocialHub, GoHighLevel, RetailCRM, Kommo, entre outras) e boas práticas de CRM para varejo.

---

## 2. Requisitos coletados com o cliente

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-001 | Enviar mensagem WhatsApp ao cliente sempre que ocorrer uma compra na loja (agradecimento/pós-venda) | Alta |
| RF-002 | Enviar mensagem quando o cliente ficar X tempo sem comprar (tempo parametrizável) — campanha de reativação (win-back) | Alta |
| RF-003 | Notificar cliente quando entrar no estoque produto relacionado a outro que ele já comprou | Alta |
| RF-004 | Ao ocorrer compra de um produto que costuma ser vendido junto com outro, oferecer o item complementar com desconto (cross-sell pós-compra) | Alta |
| RF-005 | Integração com o banco de dados do Uniplus (clientes, vendas, produtos, estoque) | Alta |
| RF-006 | Disparo via conexão WhatsApp Web (decisão D-01 — cliente ciente do risco R-01; migração futura para API oficial) | Alta |

---

## 3. Requisitos sugeridos (pesquisa de mercado)

### 3.1 Cadastro e visão 360º do cliente

| ID | Requisito |
|----|-----------|
| RF-010 | Perfil unificado do cliente: dados cadastrais (importados do Uniplus), histórico de compras, ticket médio, frequência, última compra, mensagens trocadas e campanhas recebidas |
| RF-011 | Linha do tempo de interações (compras, mensagens enviadas/recebidas, respostas a campanhas) |
| RF-012 | Campos complementares próprios do CRM: data de aniversário, preferências, tags livres, canal preferido |
| RF-013 | Deduplicação/higienização de contatos importados (telefones inválidos, duplicados) e validação de número WhatsApp |
| RF-014 | Apoio à captação de cadastros (decisão D-05 — maioria dos clientes não se cadastra): relatório de vendas sem cliente identificado e mecânica de incentivo ao cadastro (ex.: giftback/desconto condicionado ao cadastro) |

### 3.2 Segmentação

| ID | Requisito |
|----|-----------|
| RF-020 | Segmentação RFM automática (Recência, Frequência, Valor Monetário): classificar clientes em grupos como VIP, fiel, em risco, inativo |
| RF-021 | Criação de segmentos dinâmicos por filtros combináveis: categoria de produto comprado, faixa de ticket, período, bairro/cidade, tags |
| RF-022 | Segmentos atualizados automaticamente conforme novas vendas entram do Uniplus |

### 3.3 Réguas de relacionamento (automações)

| ID | Requisito |
|----|-----------|
| RF-030 | Motor de automações por gatilho + condição + ação, com fluxos configuráveis pelo lojista sem programação |
| RF-031 | Régua de boas-vindas na primeira compra (mensagem diferente de cliente recorrente) |
| RF-032 | Mensagem de aniversário com oferta opcional |
| RF-033 | Lembrete de recompra por ciclo de consumo do produto (ex.: ração, perfume, filtro — prazo estimado por produto/categoria) |
| RF-034 | Pesquisa de satisfação pós-compra (NPS ou avaliação simples 1–5) com registro da nota; alerta imediato ao dono em caso de nota baixa (decisão D-07) |
| RF-035 | Régua de reativação em cascata (ex.: 30/60/90 dias sem comprar, mensagens progressivas com incentivo crescente) |
| RF-036 | Aviso de volta ao estoque de produto que o cliente comprou ou demonstrou interesse |
| RF-037 | Agendamento de campanhas em data/hora futura e janela de envio permitida (ex.: só em horário comercial) |

### 3.4 Campanhas e ofertas

| ID | Requisito |
|----|-----------|
| RF-040 | Campanhas em massa para segmentos (lançamentos, promoções, datas comemorativas) com personalização por variáveis ({{nome}}, {{produto}}, {{desconto}}) |
| RF-041 | Biblioteca de modelos de mensagem reutilizáveis, com suporte a texto, imagem e link |
| RF-042 | Cupom/voucher de desconto com código único, validade e rastreio de resgate no Uniplus (identificar venda originada da campanha) |
| RF-043 | Giftback/cashback: crédito percentual sobre a compra para uso em compra futura, com validade (mecanismo forte de recompra usado por Zoppy e similares) |
| RF-044 | Relação de produtos complementares ("comprados juntos") configurável manualmente e/ou sugerida por análise do histórico de vendas |
| RF-045 | Percentual de desconto adicional do cross-sell (RF-004) parametrizável nas preferências do administrador (decisão D-04) |

### 3.5 Atendimento (conversas)

| ID | Requisito |
|----|-----------|
| RF-050 | Caixa de entrada das respostas dos clientes, para que o lojista responda dentro do CRM Live |
| RF-051 | Detecção de resposta a campanha: se cliente responder, interromper automações daquela conversa e sinalizar para atendimento humano |
| RF-052 | Cadastro de vendedores no CRM Live com número de WhatsApp, vinculado ao vendedor correspondente no Uniplus |
| RF-053 | Encaminhamento de lead (decisão D-02): quando um cliente responder demonstrando intenção de compra ou dúvida, enviar por WhatsApp ao vendedor o nome e número do cliente para que ele assuma o atendimento |
| RF-054 | Regra de roteamento do lead ao vendedor parametrizável (ver questão em aberto Q-02: vendedor da última venda, rodízio ou número único) |

### 3.6 Consentimento e LGPD

| ID | Requisito |
|----|-----------|
| RF-060 | Registro de consentimento (opt-in) por cliente para receber comunicações, com data e origem |
| RF-061 | Opt-out simples: cliente responde "SAIR" (ou similar) e é bloqueado automaticamente para campanhas |
| RF-062 | Lista de supressão respeitada por todos os disparos (automáticos e manuais) |
| RF-063 | Relatório de base: quem consentiu, quem saiu, quem nunca foi contatado |

### 3.7 Métricas e dashboards

| ID | Requisito |
|----|-----------|
| RF-070 | Dashboard com: taxa de recompra, ticket médio, frequência de compra, clientes ativos × inativos, NPS |
| RF-071 | Desempenho por campanha: enviadas, entregues, respondidas, vendas atribuídas, receita gerada |
| RF-072 | Atribuição de venda a campanha (via cupom resgatado ou compra em até N dias após o envio) |

### 3.8 Gestão de satisfação (NPS)

| ID | Requisito |
|----|-----------|
| RF-090 | Tela de gestão de notas de satisfação com agrupamento (por faixa de nota, período, vendedor, produto/categoria) |
| RF-091 | Ações diretas a partir da tela de NPS: enviar mensagem padronizada ao cliente, oferecer desconto/voucher, localizar o vendedor que realizou o atendimento (via venda no Uniplus) |
| RF-092 | Estrutura de ações extensível — novas ações poderão ser adicionadas sem retrabalho na tela (decisão D-07: "entre outras ações que podem ser necessárias") |
| RF-093 | Histórico de tratamento de cada nota baixa: quem tratou, ação tomada, resultado |

### 3.9 Integração Uniplus

| ID | Requisito |
|----|-----------|
| RF-080 | Sincronização de clientes, produtos, vendas e estoque a partir do PostgreSQL do Uniplus (leitura apenas — nunca modificar dados de origem, conforme decisão arquitetural do projeto) |
| RF-081 | Detecção de nova venda em tempo quase real (polling parametrizável ou mecanismo de captura de alterações) para acionar RF-001 |
| RF-082 | Armazenamento de todos os dados próprios do CRM (interações, campanhas, respostas, consentimentos) em base própria do CRM Live |
| RF-083 | Painel de status da sincronização: última execução, registros importados, erros |

---

## 4. Requisitos não funcionais

| ID | Requisito |
|----|-----------|
| RNF-01 | Controle de cadência de envio (rate limiting): intervalos aleatórios entre mensagens e limite diário parametrizável, para reduzir risco de bloqueio do número |
| RNF-02 | Fila de envio com retentativa e registro de falhas; nenhuma mensagem duplicada para o mesmo evento |
| RNF-03 | Monitoramento da sessão WhatsApp Web: alerta ao lojista quando a sessão cair (QR code expirado, celular offline) |
| RNF-04 | Log auditável de todo disparo: quem/quando/qual template/qual gatilho |
| RNF-05 | Interface simples em português, pensada para usuário com pouca experiência (princípio da Royal Tecnologia) |
| RNF-06 | Segredos e credenciais fora do código; acesso ao banco Uniplus com usuário de menor privilégio (somente leitura) |
| RNF-07 | Backup da base própria do CRM Live |
| RNF-08 | Camada de abstração de envio de mensagens (interface única de provedor, com implementações `whatsapp_web` e, futuramente, `cloud_api`), permitindo migrar para a API oficial por configuração, sem retrabalho (decisão D-01) |
| RNF-09 | Dimensionamento inicial: ~60 vendas/dia (decisão D-05) — volume baixo, favorável à cadência controlada de envios (RNF-01) |

---

## 5. Riscos e pontos de atenção

**R-01 — WhatsApp Web (não oficial) tem risco real de banimento do número.** Bibliotecas que automatizam o WhatsApp Web (whatsapp-web.js, Baileys etc.) violam os Termos de Serviço do WhatsApp. A detecção é automatizada (volume alto, mensagens para números não salvos, taxa de denúncias) e contas costumam ser banidas em semanas.
**DECISÃO (D-01, 06/08/2026):** cliente foi informado do risco e dos custos da API oficial e optou por iniciar com WhatsApp Web, migrando para a Cloud API quando decidir investir. Em consequência, as mitigações passam a ser obrigatórias: RNF-01 (cadência com intervalos aleatórios e limite diário), envio somente para opt-in (RF-060), conteúdo personalizado, número dedicado (não o principal da loja) e RNF-08 (camada de abstração para migração sem retrabalho).

**R-02 — Qualidade dos dados do Uniplus.** Telefones desatualizados/sem WhatsApp comprometem as campanhas. Prever RF-013 desde o início.

**R-03 — Excesso de mensagens gera denúncia e desgaste.** Limitar frequência global por cliente (ex.: no máximo N mensagens/mês, parametrizável) — sugerido incluir como requisito.

**R-04 — LGPD.** Disparo de marketing sem consentimento é passivo de sanção. RF-060 a RF-063 não são opcionais.

---

## 6. Decisões registradas (validadas com o cliente em 06/08/2026)

| ID | Decisão |
|----|---------|
| D-01 | WhatsApp Web na fase inicial, ciente do risco R-01; migração futura para API oficial. Mitigações obrigatórias e camada de abstração (RNF-08) |
| D-02 | Único usuário operador: o dono. Vendedores não acessam o sistema, mas recebem por WhatsApp o contato do cliente que responder com intenção de compra ou dúvida (RF-053) |
| D-03 | Venda física hoje; pretensão de vender em marketplaces — integração com marketplaces fica registrada como fase futura (fora do escopo inicial). Carrinho abandonado fora do escopo (sem e-commerce próprio) |
| D-04 | Cross-sell com desconto adicional parametrizável nas preferências do administrador (RF-045) |
| D-05 | Maioria dos clientes não se cadastra — haverá trabalho de estímulo ao cadastro (RF-014). Volume atual: ~60 vendas/dia |
| D-06 | Uniplus registra celular de forma consistente no cadastro de clientes |
| D-07 | NPS confirmado: alerta de nota baixa ao dono + tela de gestão com notas agrupadas e ações (mensagem padrão, desconto, localizar vendedor do atendimento) — RF-090 a RF-093 |

## 6.1 Novas questões em aberto

| ID | Questão |
|----|---------|
| Q-01 | Quais marketplaces o cliente pretende usar? (define a integração da fase futura) |
| Q-02 | Regra de roteamento do lead ao vendedor (RF-054): vendedor da última venda, rodízio, ou número único da loja? |
| Q-03 | Qual a mecânica de incentivo ao cadastro (RF-014)? Ex.: giftback só para cadastrados, desconto na primeira compra identificada |
| Q-04 | Limite máximo de mensagens por cliente/mês (mitigação do R-03) — qual valor inicial? |
| Q-05 | O número de WhatsApp usado no disparo será um número novo dedicado? (mitigação obrigatória do R-01) |

---

## 7. Fontes da pesquisa

- [Zoppy — Ecossistema de fidelização para varejo](https://www.zoppy.com.br/)
- [Zoppy — Principais funcionalidades de um CRM de varejo](https://blog.zoppy.com.br/crm-varejo-principais-funcionalidades-e-como-escolher-o-melhor-para-sua-empresa/)
- [Zoppy — Cashback para lojas](https://blog.zoppy.com.br/cashback-para-lojas-como-funciona-e-quais-os-beneficios/)
- [Compara SaaS — Melhor CRM para varejo Brasil 2026](https://www.comparasaas.com.br/melhor/crm-varejo)
- [Smartbis — Plataformas de automação para WhatsApp Business](https://smartbis.com/blog/as-10-melhores-plataformas-de-automacao-para-whatsapp-business-em-2025/)
- [SocialHub — Fidelizar clientes pelo WhatsApp](https://www.socialhub.pro/blog/fidelizar-clientes-servico-whatsapp-2026/)
- [SocialHub — Recuperar carrinho abandonado no WhatsApp](https://www.socialhub.pro/blog/recuperar-carrinho-abandonado-whatsapp/)
- [Salesmate — Best CRM for retail stores 2026](https://www.salesmate.io/blog/best-crm-for-retail/)
- [Zoho RetailIQ — Retail CRM engagement stack](https://www.zoho.com/retailiq/retailcrm/turn-footfall-into-customer-intelligence.html)
- [ToolRadar — Best CRM for retail 2026](https://toolradar.com/guides/best-crm-for-retail)
- [WhatsApp Cloud API vs bibliotecas não oficiais](https://whatsapp.checkleaked.cc/blog/whatsapp-cloud-api-vs-unofficial)
- [Bot.space — WhatsApp API vs unofficial tools: risk analysis](https://www.bot.space/blog/whatsapp-api-vs-unofficial-tools-a-complete-risk-reward-analysis-for-2025)
