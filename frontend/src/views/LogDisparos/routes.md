# Rota de Log de Disparos (frontend)

Componente: `frontend/src/views/LogDisparos/LogDisparos.jsx`

Path sugerido: `/log-disparos`

Adicionar em `App.jsx`:

```jsx
import LogDisparos from './views/LogDisparos/LogDisparos';
```

```jsx
<Route
  path="/log-disparos"
  element={
    <ProtectedRoute>
      <LogDisparos />
    </ProtectedRoute>
  }
/>
```

Não requer verificação de admin — a tela é acessível tanto a Admin quanto a
Acesso limitado (FSD seção 8.5, mesmo padrão de `/vendedores`).

Consome `GET /messages` (ver `backend/app/controllers/messages.routes.md`).
