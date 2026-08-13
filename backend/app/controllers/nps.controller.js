// Controller de gestão de satisfação (NPS) — FSD seção 12.12/22.6.
// Leitura disponível a Admin E Acesso Limitado (22.6: "consulta disponível
// a ambos os perfis; ações exclusivas do Administrador" — ações ficam para
// a Parte 3). Sem acesso direto ao banco: toda leitura passa por
// backend/app/services/nps.service.js.

const npsService = require('../services/nps.service');

const STATUS_LABELS = {
  pending: 'Aguardando resposta',
  answered: 'Respondida',
  low_score_open: 'Nota baixa — não tratada',
  low_score_treated: 'Nota baixa — tratada',
};

function parseFilters(query) {
  const { scoreBand, dateFrom, dateTo, sellerId, productCategory } = query;
  return {
    scoreBand: scoreBand || null,
    dateFrom: dateFrom || null,
    dateTo: dateTo || null,
    sellerId: sellerId || null,
    productCategory: productCategory || null,
  };
}

function escapeCsvField(value) {
  const str = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

// CSV com BOM UTF-8 (compatibilidade com Excel no Windows, ambiente real do
// responsável do projeto — ver docs/STATUS.md/HANDOFF).
function buildCsv(rows) {
  const header = ['Cliente', 'Telefone', 'Nota', 'Data da pesquisa', 'Data da resposta', 'Produto/Categoria', 'Vendedor', 'Status'];
  const lines = [header.map(escapeCsvField).join(',')];

  for (const row of rows) {
    lines.push(
      [
        row.customer_name,
        row.customer_phone,
        row.score === null || row.score === undefined ? '' : row.score,
        row.survey_sent_at ? new Date(row.survey_sent_at).toISOString() : '',
        row.responded_at ? new Date(row.responded_at).toISOString() : '',
        row.product_categories || '',
        row.seller_name || '',
        STATUS_LABELS[row.status] || row.status,
      ]
        .map(escapeCsvField)
        .join(',')
    );
  }

  return '\uFEFF' + lines.join('\r\n');
}

// GET /nps/responses
// Query params opcionais: scoreBand (detractor|neutral|promoter), dateFrom,
// dateTo, sellerId, productCategory, page, pageSize.
async function listResponses(req, res) {
  try {
    const filters = parseFilters(req.query);
    const { page, pageSize } = req.query;
    const result = await npsService.listNpsResponses({ ...filters, page, pageSize });
    res.json(result);
  } catch (err) {
    console.error('Erro ao listar notas de NPS:', err.message);
    res.status(500).json({ error: 'Erro ao carregar as notas de satisfação.' });
  }
}

// GET /nps/responses/export — mesmos filtros da listagem, sem paginação.
async function exportResponses(req, res) {
  try {
    const filters = parseFilters(req.query);
    const rows = await npsService.listNpsResponsesForExport(filters);
    const csv = buildCsv(rows);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="nps.csv"');
    res.send(csv);
  } catch (err) {
    console.error('Erro ao exportar notas de NPS:', err.message);
    res.status(500).json({ error: 'Erro ao exportar as notas de satisfação.' });
  }
}

module.exports = {
  listResponses,
  exportResponses,
};
