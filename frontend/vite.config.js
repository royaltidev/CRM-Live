import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Fora do Docker (dev avulso), backend roda em localhost:3000. Dentro do
// Docker Compose, o frontend só alcança o backend pelo nome do serviço
// ("backend"), nunca por "localhost" — ver VITE_BACKEND_URL em docker-compose.yml.
const backendTarget = process.env.VITE_BACKEND_URL || 'http://localhost:3000';

// Todos os prefixos de rota da API expostos pelo backend (Controllers em
// backend/app/controllers/) — precisa incluir cada um aqui para o proxy do
// Vite encaminhar corretamente em desenvolvimento.
const apiPrefixes = [
  '/auth',
  '/users',
  '/customers',
  '/tags',
  '/sellers',
  '/segments',
  '/consent',
  '/messages',
  '/sync',
  '/automation-rules',
  '/winback',
];

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: Object.fromEntries(
      apiPrefixes.map((prefix) => [
        prefix,
        { target: backendTarget, changeOrigin: true },
      ])
    ),
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
