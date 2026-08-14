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

// POST /nps/responses/:id/treatments (exclusivo do Administrador, FSD 13.9).
// Body: { actionType: 'message'|'discount'|'voucher'|'other', ... }
//   - message: { templateId }
//   - discount|voucher: { creditPercent } XOR { creditValue }, validUntil opcional
//   - other: { description, resultText }
async function createTreatment(req, res) {
  try {
    const { id } = req.params;
    const { actionType, templateId, creditPercent, creditValue, validUntil, description, resultText } = req.body;

    const treatment = await npsService.registerTreatment({
      npsResponseId: id,
      actionType,
      performedBy: req.user.id,
      templateId,
      creditPercent,
      creditValue,
      validUntil,
      description,
      resultText,
    });

    res.status(201).json({ treatment });
  } catch (err) {
    if (
      err.message === 'Nota de satisfação não encontrada.' ||
      err.message === 'Modelo de mensagem não encontrado ou inativo.'
    ) {
      return res.status(404).json({ error: err.message });
    }
    if (
      err.message === 'Só é possível registrar tratamento para uma nota baixa.' ||
      err.message === 'Este cliente não pode receber mensagens (sem consentimento válido ou optou por sair).' ||
      err.message === 'Descreva a ação realizada.' ||
      err.message === 'Tipo de ação inválido.' ||
      err.message.includes('percentual') ||
      err.message.includes('valor do crédito')
    ) {
      return res.status(400).json({ error: err.message });
    }

    console.error('Erro ao registrar tratamento de NPS:', err.message);
    res.status(500).json({ error: 'Erro ao registrar o tratamento.' });
  }
}

// GET /nps/responses/:id/treatments (exclusivo do Administrador — ver
// decisão em docs/STATUS.md: a matriz de permissões do FSD distingue
// "visualizar notas" (ambos os perfis) de "executar ações" (Admin), e o
// histórico é parte das ações, não da listagem geral).
async function listTreatmentsHandler(req, res) {
  try {
    const { id } = req.params;
    const treatments = await npsService.listTreatments(id);
    res.json({ treatments });
  } catch (err) {
    console.error('Erro ao listar histórico de tratamento de NPS:', err.message);
    res.status(500).json({ error: 'Erro ao carregar o histórico de tratamento.' });
  }
}

module.exports = {
  listResponses,
  exportResponses,
  createTreatment,
  listTreatments: listTreatmentsHandler,
};
