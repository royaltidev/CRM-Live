# Rota de Vendedores (frontend)

Componente: `frontend/src/views/Vendedores/Vendedores.jsx`

Path sugerido: `/vendedores`

Adicionar em `App.jsx`:

```jsx
import Vendedores from './views/Vendedores/Vendedores';
```

```jsx
<Route
  path="/vendedores"
  element={
    <ProtectedRoute>
      <Vendedores />
    </ProtectedRoute>
  }
/>
```

Não requer verificação de admin — a tela é acessível tanto a Admin quanto a
Acesso limitado (FSD seção 8.5).
