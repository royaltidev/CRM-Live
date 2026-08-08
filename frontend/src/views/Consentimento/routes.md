# Rota de Consentimento e LGPD (frontend)

Componente:
- `frontend/src/views/Consentimento/Consentimento.jsx` — tela de relatório de
  consentimento (filtro por status e período, tabela com nome/telefone/status/data).

Path sugerido: `/consentimento`

Adicionar em `App.jsx`:

```jsx
import Consentimento from './views/Consentimento/Consentimento';
```

```jsx
<Route
  path="/consentimento"
  element={
    <ProtectedRoute>
      <Consentimento />
    </ProtectedRoute>
  }
/>
```

Não requer verificação de admin no nível da rota — o relatório de consentimento é
visível por Admin **e** Acesso Limitado (FSD seção 8.5 — matriz de permissões).
