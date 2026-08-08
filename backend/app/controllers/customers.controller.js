// Controller de clientes — cadastro e visão 360º (FSD seção 6.1, telas 12.3 e 12.16).
// Acessível por Admin e Acesso Limitado (ver FSD seção 8.5 — matriz de permissões).

const customersService = require('../services/customers.service');

// GET /customers
// Lista clientes com busca, filtros (tag, segmento RFM) e paginação.
async function listCustomers(req, res) {
  try {
    const { search, tagId, rfmSegment, page, pageSize } = req.query;

    const result = await customersService.listCustomers({
      search: search || undefined,
      tagId: tagId || undefined,
      rfmSegment: rfmSegment || undefined,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    });

    res.json(result);
  } catch (err) {
    console.error('Erro ao listar clientes:', err.message);
    res.status(500).json({ error: 'Erro ao carregar lista de clientes.' });
  }
}

// GET /customers/:id
// Retorna a ficha completa de um cliente (dados cadastrais + tags).
async function getCustomerById(req, res) {
  try {
    const { id } = req.params;
    const customer = await customersService.getCustomerById(id);

    if (!customer) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    res.json({ customer });
  } catch (err) {
    console.error('Erro ao buscar cliente:', err.message);
    res.status(500).json({ error: 'Erro ao carregar dados do cliente.' });
  }
}

// GET /customers/:id/timeline
// Retorna a linha do tempo de interações (vendas + mensagens) do cliente.
async function getCustomerTimeline(req, res) {
  try {
    const { id } = req.params;

    // Garante que o cliente existe antes de montar a timeline.
    const customer = await customersService.getCustomerById(id);
    if (!customer) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    const timeline = await customersService.getCustomerTimeline(id);
    res.json({ timeline });
  } catch (err) {
    console.error('Erro ao buscar linha do tempo do cliente:', err.message);
    res.status(500).json({ error: 'Erro ao carregar histórico do cliente.' });
  }
}

// PATCH /customers/:id
// Atualiza somente os campos complementares (aniversário, preferências, canal preferido).
async function updateCustomerComplementaryFields(req, res) {
  try {
    const { id } = req.params;
    const { birthDate, preferences, preferredChannel } = req.body;

    // Valida birthDate: deve ser data válida (YYYY-MM-DD) ou null.
    if (birthDate !== undefined && birthDate !== null) {
      const parsedDate = new Date(birthDate);
      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: 'Data de aniversário inválida.' });
      }
    }

    // Valida preferredChannel: string curta ou null.
    if (
      preferredChannel !== undefined &&
      preferredChannel !== null &&
      (typeof preferredChannel !== 'string' || preferredChannel.length > 50)
    ) {
      return res.status(400).json({ error: 'Canal preferido inválido (deve ser um texto de até 50 caracteres).' });
    }

    // Valida preferences: deve ser objeto (não array, não string).
    if (
      preferences !== undefined &&
      preferences !== null &&
      (typeof preferences !== 'object' || Array.isArray(preferences))
    ) {
      return res.status(400).json({ error: 'Preferências inválidas (deve ser um objeto).' });
    }

    const customer = await customersService.updateCustomerComplementaryFields(id, {
      birthDate: birthDate ?? null,
      preferences: preferences ?? {},
      preferredChannel: preferredChannel ?? null,
    });

    res.json({ customer });
  } catch (err) {
    console.error('Erro ao atualizar campos complementares:', err.message);

    if (err.message === 'Cliente não encontrado') {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    res.status(500).json({ error: 'Erro ao atualizar campos complementares do cliente.' });
  }
}

// POST /customers/:id/tags
// Associa uma tag ao cliente. Body: { tagId }.
async function addTagToCustomer(req, res) {
  try {
    const { id } = req.params;
    const { tagId } = req.body;

    if (!tagId) {
      return res.status(400).json({ error: 'O campo tagId é obrigatório.' });
    }

    const tag = await customersService.addTagToCustomer(id, tagId);
    res.json({ success: true, tag });
  } catch (err) {
    console.error('Erro ao adicionar tag ao cliente:', err.message);

    if (err.message === 'Cliente não encontrado' || err.message === 'Tag não encontrada') {
      return res.status(404).json({ error: err.message });
    }

    res.status(500).json({ error: 'Erro ao adicionar tag ao cliente.' });
  }
}

// DELETE /customers/:id/tags/:tagId
// Remove a associação de uma tag do cliente.
async function removeTagFromCustomer(req, res) {
  try {
    const { id, tagId } = req.params;

    await customersService.removeTagFromCustomer(id, tagId);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao remover tag do cliente:', err.message);

    if (err.message === 'Essa tag não está associada a este cliente') {
      return res.status(404).json({ error: err.message });
    }

    res.status(500).json({ error: 'Erro ao remover tag do cliente.' });
  }
}

// GET /customers/reports/sales-without-customer
// Relatório de vendas sem cliente identificado (customer_id IS NULL).
async function getSalesWithoutCustomer(req, res) {
  try {
    const { startDate, endDate } = req.query;

    const sales = await customersService.getSalesWithoutCustomer({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    res.json({ sales });
  } catch (err) {
    console.error('Erro ao buscar vendas sem cliente:', err.message);
    res.status(500).json({ error: 'Erro ao carregar relatório de vendas sem cliente.' });
  }
}

module.exports = {
  listCustomers,
  getCustomerById,
  getCustomerTimeline,
  updateCustomerComplementaryFields,
  addTagToCustomer,
  removeTagFromCustomer,
  getSalesWithoutCustomer,
};
