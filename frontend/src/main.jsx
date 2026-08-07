import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import '@fontsource/public-sans/400.css';
import '@fontsource/public-sans/600.css';
import '@fontsource/public-sans/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import theme from './theme';
import App from './App';

// Ponto de entrada do frontend do CRM Live.
// Fase de infraestrutura (Fase 1 — ver docs/PLANO.md): confirma que o tema
// customizado "Admin Logic" está carregado. Rotas e telas de negócio são
// adicionadas nas próximas fases.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
