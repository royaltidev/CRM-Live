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
  '/templates',
  '/coupons',
  '/giftbacks',
  '/products',
  '/complementary-products',
  '/campaigns',
  '/settings',
  '/inbox',
  '/nps',
];

// Alguns prefixos de API colidem com uma rota de tela do React Router com o
// mesmo caminho (ex.: "/tags" e "/templates" existem tanto como rota do
// frontend quanto como prefixo de API). Sem isso, um F5 (navegação de página
// inteira) nessas telas seria proxiado direto pro backend e mostraria o JSON
// cru da API em vez do app React — chamadas via fetch() dentro do app
// continuam funcionando normalmente (não fazem navegação de página).
// `bypass` distingue os dois casos pelo header Accept: navegação de página
// sempre manda "Accept: text/html", fetch() não.
function bypassHtmlNavigation(req) {
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    return '/index.html';
  }
  return undefined;
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: Object.fromEntries(
      apiPrefixes.map((prefix) => [
        prefix,
        { target: backendTarget, changeOrigin: true, bypass: bypassHtmlNavigation },
      ])
    ),
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
