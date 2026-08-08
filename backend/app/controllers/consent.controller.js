// Controller do módulo Consentimento e LGPD (FSD seção 6.6, tela 12.15).
// Acessível por Admin e Acesso Limitado (ver FSD seção 8.5 — matriz de permissões).

const consentReportService = require('../services/consent-report.service');

// GET /consent/report
// Query params opcionais: status ('opted_in' | 'opted_out' | 'never_contacted'),
// startDate, endDate.
async function getConsentReportHandler(req, res) {
  try {
    const { status, startDate, endDate } = req.query;

    const report = await consentReportService.getConsentReport({ status, startDate, endDate });
    res.json({ report });
  } catch (err) {
    console.error('Erro ao gerar relatório de consentimento:', err.message);
    res.status(500).json({ error: 'Erro ao gerar relatório de consentimento.' });
  }
}

module.exports = {
  getConsentReportHandler,
};
