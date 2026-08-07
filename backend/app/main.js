// Ponto de entrada da API do backend do CRM Live.
//
// Fase de infraestrutura (Fase 1 — ver docs/PLANO.md): o servidor apenas sobe
// e expõe um health-check. Controllers, autenticação e regras de negócio são
// adicionados nas próximas fases, seguindo a arquitetura MVC descrita em
// docs/FSD.md, seção 5.2.

const express = require('express');
const settings = require('./config/settings');

const app = express();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'crm-live-backend' });
});

app.listen(settings.port, () => {
  console.log(`CRM Live backend rodando na porta ${settings.port}`);
});
