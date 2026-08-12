// Controller de modelos de mensagem (templates) — FSD seções 6.4, 12.7, 21.
// Leitura: Admin e Acesso Limitado. Escrita (criar/editar/excluir/enviar
// imagem): exclusiva do Administrador (aplicado nas rotas via requireAdmin).

const multer = require('multer');
const templatesService = require('../services/templates.service');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB (FSD seção 21) — validação real de conteúdo fica no service.
});

// Middleware de upload com tratamento de erro amigável (limite de tamanho
// do multer dispara antes de chegar no controller/service).
function uploadImageMiddleware(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'A imagem excede o limite de 5MB.' });
      }
      return res.status(400).json({ error: 'Erro ao processar o arquivo enviado.' });
    }
    next();
  });
}

function validateBody(req, res) {
  const { name, bodyText, variables } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'O nome do modelo é obrigatório.' });
    return null;
  }

  if (!bodyText || typeof bodyText !== 'string' || !bodyText.trim()) {
    res.status(400).json({ error: 'O texto do modelo é obrigatório.' });
    return null;
  }

  if (variables !== undefined && !Array.isArray(variables)) {
    res.status(400).json({ error: 'Variáveis devem ser uma lista de nomes.' });
    return null;
  }

  return {
    name: name.trim(),
    bodyText: bodyText.trim(),
    variables: Array.isArray(variables) ? variables : [],
    linkUrl: req.body.linkUrl ? String(req.body.linkUrl).trim() : null,
  };
}

// GET /templates?includeInactive=true|false
async function listTemplates(req, res) {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const templates = await templatesService.listTemplates({ includeInactive });
    res.json({ templates });
  } catch (err) {
    console.error('Erro ao listar modelos de mensagem:', err.message);
    res.status(500).json({ error: 'Erro ao carregar modelos de mensagem.' });
  }
}

// GET /templates/:id
async function getTemplateById(req, res) {
  try {
    const template = await templatesService.getTemplateById(req.params.id);

    if (!template) {
      return res.status(404).json({ error: 'Modelo de mensagem não encontrado.' });
    }

    res.json({ template });
  } catch (err) {
    console.error('Erro ao buscar modelo de mensagem:', err.message);
    res.status(500).json({ error: 'Erro ao buscar modelo de mensagem.' });
  }
}

// POST /templates
async function createTemplate(req, res) {
  try {
    const data = validateBody(req, res);
    if (!data) return;

    const template = await templatesService.createTemplate({ ...data, createdBy: req.user.id });
    res.status(201).json({ template });
  } catch (err) {
    console.error('Erro ao criar modelo de mensagem:', err.message);
    res.status(500).json({ error: 'Erro ao criar modelo de mensagem.' });
  }
}

// PATCH /templates/:id
async function updateTemplate(req, res) {
  try {
    const data = validateBody(req, res);
    if (!data) return;

    const template = await templatesService.updateTemplate(req.params.id, data);
    res.json({ template });
  } catch (err) {
    console.error('Erro ao atualizar modelo de mensagem:', err.message);

    if (err.message === 'Modelo de mensagem não encontrado.') {
      return res.status(404).json({ error: err.message });
    }

    res.status(500).json({ error: 'Erro ao atualizar modelo de mensagem.' });
  }
}

// PATCH /templates/:id/toggle-active
// Body: { active }
async function toggleActive(req, res) {
  try {
    const template = await templatesService.toggleActive(req.params.id, req.body.active);
    res.json({ template });
  } catch (err) {
    console.error('Erro ao ativar/desativar modelo de mensagem:', err.message);

    if (err.message === 'Modelo de mensagem não encontrado.') {
      return res.status(404).json({ error: err.message });
    }

    res.status(400).json({ error: err.message || 'Erro ao ativar/desativar modelo de mensagem.' });
  }
}

// DELETE /templates/:id
async function deleteTemplate(req, res) {
  try {
    await templatesService.deleteTemplate(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir modelo de mensagem:', err.message);

    if (err.message === 'Modelo de mensagem não encontrado.') {
      return res.status(404).json({ error: err.message });
    }

    if (err.message.includes('não pode ser excluído')) {
      return res.status(409).json({ error: err.message });
    }

    res.status(500).json({ error: 'Erro ao excluir modelo de mensagem.' });
  }
}

// POST /templates/:id/image (multipart/form-data, campo "image")
async function uploadTemplateImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    const attachment = await templatesService.uploadTemplateImage(req.params.id, {
      buffer: req.file.buffer,
      originalFilename: req.file.originalname,
      uploadedBy: req.user.id,
    });

    res.status(201).json({ attachment });
  } catch (err) {
    console.error('Erro ao enviar imagem do modelo:', err.message);

    if (err.message === 'Modelo de mensagem não encontrado.') {
      return res.status(404).json({ error: err.message });
    }

    if (err.message.includes('5MB') || err.message.includes('Arquivo inválido')) {
      return res.status(400).json({ error: err.message });
    }

    res.status(500).json({ error: 'Erro ao enviar imagem do modelo.' });
  }
}

// GET /templates/:id/image
async function downloadTemplateImage(req, res) {
  try {
    const image = await templatesService.getTemplateImage(req.params.id);

    if (!image) {
      return res.status(404).json({ error: 'Este modelo não tem imagem anexada.' });
    }

    res.type(image.mimeType);
    res.sendFile(image.absolutePath);
  } catch (err) {
    console.error('Erro ao baixar imagem do modelo:', err.message);
    res.status(500).json({ error: 'Erro ao carregar imagem do modelo.' });
  }
}

module.exports = {
  uploadImageMiddleware,
  listTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  toggleActive,
  deleteTemplate,
  uploadTemplateImage,
  downloadTemplateImage,
};
