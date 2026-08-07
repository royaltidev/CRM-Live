# Imagem do frontend (React + Vite) do CRM Live.
# Fase de infraestrutura: instala dependências e sobe o servidor de
# desenvolvimento do Vite. Telas de negócio são adicionadas nas próximas
# fases (ver docs/PLANO.md).

FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
