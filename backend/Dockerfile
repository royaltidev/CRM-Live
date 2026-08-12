# Imagem do backend (API Node.js) do CRM Live.
# Fase de infraestrutura: instala dependências e prepara o container para rodar
# a API. Rotas e regras de negócio são adicionadas nas próximas fases
# (ver docs/PLANO.md).

FROM node:22-alpine

# Chromium nativo do Alpine para o Puppeteer (whatsapp-web.js), em vez do
# binário x86_64 que o Puppeteer baixaria sozinho — esse binário não roda em
# containers Alpine (musl) em hosts ARM (ex.: Macs Apple Silicon) nem depende
# de storage.googleapis.com, que já falhou em ambientes de rede restrita
# (ver docs/ERROS.md). Funciona igual em produção (x86_64), pois o pacote
# `chromium` do Alpine é resolvido para a arquitetura de cada build.
RUN apk add --no-cache chromium
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev && \
    md5sum package-lock.json | awk '{print $1}' > node_modules/.install-hash

COPY . .
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

# Ver docker-entrypoint.sh: reinstala node_modules automaticamente quando
# package-lock.json muda e o volume nomeado (docker-compose.yml) está com
# uma instalação antiga em cache.
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "app/main.js"]
