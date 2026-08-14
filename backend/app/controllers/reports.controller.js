// Controller de relatórios/dashboards (FSD seções 6.7, 22). Leitura
// disponível a Admin e Acesso Limitado (FSD seção 8.5) — sem requireAdmin.

const dashboardReportService = require('../services/dashboard-report.service');

function escapeCsvField(value) {
  const str = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function formatPercent(value) {
  return value === null || value === undefined ? 'Não disponível' : `${(value * 100).toFixed(1)}%`;
}

function buildDashboardCsv(dashboard) {
  const rows = [
    ['Período', `${dashboard.period.startDate} a ${dashboard.period.endDate}`],
    ['Taxa de recompra', formatPercent(dashboard.repurchaseRate)],
    ['Ticket médio', dashboard.avgTicket.toFixed(2)],
    ['Vendas no período', dashboard.salesCount],
    ['Frequência de compra (vendas/cliente)', dashboard.purchaseFrequency !== null ? dashboard.purchaseFrequency.toFixed(2) : 'Não disponível'],
    ['NPS médio', dashboard.npsAverage !== null ? dashboard.npsAverage.toFixed(1) : 'Não disponível'],
    ['Respostas de NPS no período', dashboard.npsResponseCount],
    [
      'Clientes ativos x inativos',
      dashboard.activeVsInactive.status === 'pending_configuration'
        ? 'Critérios RFM não configurados'
        : `${dashboard.activeVsInactive.active} ativos / ${dashboard.activeVsInactive.inactive} inativos / ${dashboard.activeVsInactive.unclassified} não classificados`,
    ],
  ];

  const header = ['Indicador', 'Valor'].map(escapeCsvField).join(',');
  const lines = rows.map((row) => row.map(escapeCsvField).join(','));
  return '\uFEFF' + [header, ...lines].join('\r\n');
}

// GET /reports/dashboard?startDate=&endDate=
async function getDashboard(req, res) {
  try {
    const { startDate, endDate } = req.query;
    const dashboard = await dashboardReportService.getGeneralDashboard({ startDate, endDate });
    res.json({ dashboard });
  } catch (err) {
    console.error('Erro ao gerar dashboard geral:', err.message);
    res.status(500).json({ error: 'Erro ao gerar o dashboard geral.' });
  }
}

// GET /reports/dashboard/export?startDate=&endDate=
async function exportDashboard(req, res) {
  try {
    const { startDate, endDate } = req.query;
    const dashboard = await dashboardReportService.getGeneralDashboard({ startDate, endDate });
    const csv = buildDashboardCsv(dashboard);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="dashboard-geral.csv"');
    res.send(csv);
  } catch (err) {
    console.error('Erro ao exportar dashboard geral:', err.message);
    res.status(500).json({ error: 'Erro ao exportar o dashboard geral.' });
  }
}

module.exports = {
  getDashboard,
  exportDashboard,
};
