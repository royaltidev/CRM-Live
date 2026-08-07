import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuração mínima do Vite para o frontend do CRM Live.
// Proxy para a API do backend será adicionado quando as primeiras chamadas
// HTTP forem implementadas (ver docs/PLANO.md, Fase 3 em diante).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
