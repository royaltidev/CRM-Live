# Rota de Segmentação (frontend)

Componentes:
- `frontend/src/views/Segmentacao/Segmentacao.jsx` — tela principal (contém abas
  "Segmentos dinâmicos" e "Critérios RFM"; a segunda aba renderiza o componente
  abaixo internamente).
- `frontend/src/views/Segmentacao/CriteriosRfm.jsx` — seção de configuração dos
  critérios de classificação RFM. Usado internamente por `Segmentacao.jsx`;
  não precisa de rota própria, mas está exportado como componente independente
  caso prefiram uma rota separada (ver alternativa abaixo).

Path sugerido: `/segmentacao`

Adicionar em `App.jsx`:

```jsx
import Segmentacao from './views/Segmentacao/Segmentacao';
```

```jsx
<Route
  path="/segmentacao"
  element={
    <ProtectedRoute>
      <Segmentacao />
    </ProtectedRoute>
  }
/>
```

Não requer verificação de admin no nível da rota — a tela é acessível tanto a
Admin quanto a Acesso limitado (FSD seção 8.5: segmentação é editável por
ambos os papéis). A restrição de edição dos critérios RFM (exclusiva do Admin)
é tratada dentro do próprio componente `CriteriosRfm.jsx`, via `useAuth().isAdmin`
(campos ficam desabilitados e uma mensagem informativa é exibida para usuários
não-admin).

## Alternativa (não implementada, apenas documentada)

Se preferirem uma rota própria para os critérios RFM em vez de aba dentro de
`/segmentacao`, basta criar uma rota adicional apontando direto para
`CriteriosRfm.jsx`, por exemplo:

```jsx
import CriteriosRfm from './views/Segmentacao/CriteriosRfm';

<Route
  path="/segmentacao/rfm"
  element={
    <ProtectedRoute>
      <CriteriosRfm />
    </ProtectedRoute>
  }
/>
```

`CriteriosRfm.jsx` não depende de nada específico de `Segmentacao.jsx` (é
autocontido, busca seus próprios dados via fetch), então essa mudança não
exige alterações no componente.
