# Inventário de insumos do projeto

**Sistema:** CRM Live
**Data:** 07/08/2026
**Escopo:** todos os arquivos hoje presentes em `docs/` (documentação e apoio — não é a pasta pública/assets do sistema).

| Arquivo | O que é | Usado pelo sistema em execução? | Onde será usado | Observações |
|---|---|---|---|---|
| `docs/FSD.md` | Especificação funcional e técnica principal do CRM Live — documento consolidado que orienta toda a implementação. | Não (documentação) | Referência para a IA codificadora | Revisado e ajustado em 07/08/2026 (stack Node.js, cores, RFM, pendência de schema do Uniplus — ver seção 27). |
| `docs/Design/design.md` | Design system "Admin Logic" (tokens de cor, tipografia, raio, espaçamento e diretrizes de componentes). | Não (documentação) | Base para o tema customizado do MUI no frontend | Corrigido em 07/08/2026: o texto descritivo (prosa) citava hex diferentes dos tokens do front-matter; agora ambos usam os mesmos valores, que são os já validados no mockup. |
| `docs/Design/mockup-dashboard-geral.html` | Esboço estático (HTML/CSS) da tela de Dashboard geral, usado para validar visualmente o design system antes da aprovação. | Não (protótipo estático, não faz parte do sistema) | Referência visual para a IA codificadora ao montar o tema/telas | Foi a peça usada para confirmar os tokens de `design.md` em 07/08/2026 — serviu de "prova" para resolver a divergência de cores. |
| `docs/PRD-CRM-Live.md` | Documento de Requisitos do Produto (PRD) — visão de produto, personas, escopo, histórias de usuário, critérios de aceitação. Predecessor do FSD. | Não (documentação/histórico) | Consulta de contexto, se necessário | O FSD já declara que todo o conteúdo relevante foi consolidado nele; este arquivo ainda cita "Python" como linguagem de backend (desatualizado após a decisão de 07/08/2026) — não foi editado por estar fora do escopo desta revisão (que cobre apenas FSD.md e design.md). |
| `docs/DECISOES_TECNICAS.md` | Registro das decisões técnicas tomadas antes de redigir o FSD (stack, ambientes, arquitetura, perfis etc.). | Não (documentação/histórico) | Consulta de contexto, se necessário | Mesma observação do PRD: ainda cita "Python" e não foi atualizado (fora do escopo desta revisão). |
| `docs/levantamento-requisitos.md` | Levantamento de requisitos original, validado com o cliente em 06/08/2026 — base para o PRD. | Não (documentação/histórico) | Consulta de contexto, se necessário | Documento mais bruto/antigo da cadeia; superado por PRD e FSD. |
| `docs/Design/Logomarcas/logo-oval.svg` | Logomarca principal, versão colorida, vetor. | Provável sim | A confirmar (ex.: cabeçalho/sidebar sobre fundo claro, tela de login) | — |
| `docs/Design/Logomarcas/logo-oval.png` | Logomarca principal, versão colorida, raster 1600×1726. | Provável sim | A confirmar | Mesma arte do SVG acima, em raster. |
| `docs/Design/Logomarcas/logo-oval-monocromatica.svg` | Logomarca em versão monocromática (um só tom). | A confirmar | A confirmar (ex.: impressão P&B, e-mail em texto simples) | — |
| `docs/Design/Logomarcas/logo-oval-monocromatica.png` | Mesma arte acima, raster 1600×1726. | A confirmar | A confirmar | — |
| `docs/Design/Logomarcas/logo-oval-branca.svg` | Logomarca em versão branca (para fundos escuros). | A confirmar | A confirmar (o sidebar do mockup validado é claro — não fica óbvio onde a versão branca entraria na tela) | — |
| `docs/Design/Logomarcas/logo-oval-branca.png` | Mesma arte acima, raster 1600×1726. | A confirmar | A confirmar | — |
| `docs/Design/Logomarcas/icone.svg` | Ícone isolado da marca (sem nome por extenso), vetor. | Provável sim | A confirmar (ex.: fonte para favicon/avatar, ícone compacto do menu) | — |
| `docs/Design/Logomarcas/avatar-1024.png` | Arte grande (1024×1105) da marca, formato próximo de quadrado. | A confirmar | A confirmar (ex.: ícone do app/avatar padrão) | Proporção não é perfeitamente 1:1; se for usada como avatar circular/quadrado, pode exigir recorte. |
| `docs/Design/Logomarcas/favicon-512.png` | Favicon 512×512. | Sim | Favicon do frontend (tamanhos maiores/PWA) | — |
| `docs/Design/Logomarcas/favicon-192.png` | Favicon 192×192. | Sim | Favicon do frontend (Android/PWA) | — |
| `docs/Design/Logomarcas/favicon-48.png` | Favicon 48×48. | Sim | Favicon do frontend | — |
| `docs/Design/Logomarcas/favicon-32.png` | Favicon 32×32. | Sim | Favicon do frontend (aba do navegador) | — |
| `docs/Design/Logomarcas/preview-branca-fundo-escuro.png` | Imagem de apresentação: logo branca sobre fundo escuro (mockup de marca, não peça de interface). | Provável não | Material de apresentação/documentação | Parece ser só uma prévia da marca, não um asset de tela do sistema — confirmar. |

## Observações gerais

- Nenhum arquivo desta pasta deve ser tratado como pasta pública do sistema. Os que forem confirmados como "usados pelo sistema em execução" (logos e favicons) precisarão ser **copiados** para a pasta de assets/pública que a stack (Node.js + React) definir na fase de codificação — isso não foi feito nesta etapa, conforme o escopo desta revisão.
- Ficam pendentes de confirmação: qual logomarca (colorida/monocromática/branca) vai em cada lugar da interface, o uso pretendido de `avatar-1024.png` e de `preview-branca-fundo-escuro.png`, e o uso de `icone.svg` como fonte dos favicons/avatar.
