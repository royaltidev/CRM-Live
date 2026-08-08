# Rotas de frontend — Módulo Clientes e Tags (Fase 5)

Sugestão de integração no `frontend/src/App.jsx` (todas dentro de `<ProtectedRoute>`,
sem restrição de admin — Clientes e Tags são acessíveis por Admin e Acesso Limitado):

| Path                                | Componente            | Arquivo                                              |
|--------------------------------------|------------------------|-------------------------------------------------------|
| `/clientes`                          | `ClientesList`         | `frontend/src/views/Clientes/ClientesList.jsx`         |
| `/clientes/:id`                      | `ClienteFicha`         | `frontend/src/views/Clientes/ClienteFicha.jsx`         |
| `/clientes/relatorios/sem-cliente`   | `RelatorioVendasSemCliente` | `frontend/src/views/Clientes/RelatorioVendasSemCliente.jsx` |
| `/tags`                              | `Tags`                 | `frontend/src/views/Tags/Tags.jsx`                     |

> **Atenção à ordem de rotas do React Router:** registre `/clientes/relatorios/sem-cliente`
> antes de `/clientes/:id` (ou use paths distintos como já sugerido) para evitar que o router
> tente interpretar `relatorios` como um `:id`. Como os paths propostos aqui já são
> distintos (`/clientes/relatorios/sem-cliente` vs `/clientes/:id`), o React Router
> resolve corretamente por especificidade, mas vale registrar ambos explicitamente.

## Exemplo de integração

```jsx
import ClientesList from './views/Clientes/ClientesList';
import ClienteFicha from './views/Clientes/ClienteFicha';
import RelatorioVendasSemCliente from './views/Clientes/RelatorioVendasSemCliente';
import Tags from './views/Tags/Tags';

// dentro de <Routes>:
<Route path="/clientes" element={<ProtectedRoute><ClientesList /></ProtectedRoute>} />
<Route path="/clientes/relatorios/sem-cliente" element={<ProtectedRoute><RelatorioVendasSemCliente /></ProtectedRoute>} />
<Route path="/clientes/:id" element={<ProtectedRoute><ClienteFicha /></ProtectedRoute>} />
<Route path="/tags" element={<ProtectedRoute><Tags /></ProtectedRoute>} />
```

Sugestão de itens de menu/navegação (ex: em `Dashboard.jsx` ou em um componente de
navegação central, a ser decidido pela integração final): "Clientes", "Vendas sem
Cliente" (relatório) e "Tags".
