// Controller de tags (etiquetas aplicáveis a clientes).
// Acessível por Admin e Acesso Limitado (ver FSD seção 8.5 — matriz de permissões).

const tagsService = require('../services/tags.service');

// GET /tags
async function listTags(req, res) {
  try {
    const tags = await tagsService.listTags();
    res.json({ tags });
  } catch (err) {
    console.error('Erro ao listar tags:', err.message);
    res.status(500).json({ error: 'Erro ao carregar lista de tags.' });
  }
}

// POST /tags
// Body: { name }
async function createTag(req, res) {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'O nome da tag é obrigatório.' });
    }

    const tag = await tagsService.createTag(name.trim());
    res.status(201).json({ tag });
  } catch (err) {
    console.error('Erro ao criar tag:', err.message);

    if (err.message === 'Já existe uma tag com esse nome.') {
      return res.status(400).json({ error: err.message });
    }

    res.status(500).json({ error: 'Erro ao criar tag.' });
  }
}

// PATCH /tags/:id
// Body: { name }
async function updateTag(req, res) {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'O nome da tag é obrigatório.' });
    }

    const tag = await tagsService.updateTag(id, name.trim());
    res.json({ tag });
  } catch (err) {
    console.error('Erro ao atualizar tag:', err.message);

    if (err.message === 'Tag não encontrada') {
      return res.status(404).json({ error: err.message });
    }

    if (err.message === 'Já existe uma tag com esse nome.') {
      return res.status(400).json({ error: err.message });
    }

    res.status(500).json({ error: 'Erro ao atualizar tag.' });
  }
}

// DELETE /tags/:id
async function deleteTag(req, res) {
  try {
    const { id } = req.params;
    await tagsService.deleteTag(id);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir tag:', err.message);

    if (err.message === 'Tag não encontrada') {
      return res.status(404).json({ error: err.message });
    }

    if (err.message.includes('em uso')) {
      return res.status(400).json({ error: err.message });
    }

    res.status(500).json({ error: 'Erro ao excluir tag.' });
  }
}

module.exports = {
  listTags,
  createTag,
  updateTag,
  deleteTag,
};
