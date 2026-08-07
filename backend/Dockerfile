# Imagem do backend (API Node.js) do CRM Live.
# Fase de infraestrutura: instala dependências e prepara o container para rodar
# a API. Rotas e regras de negócio são adicionadas nas próximas fases
# (ver docs/PLANO.md).

FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3000

CMD ["node", "app/main.js"]
