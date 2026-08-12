// Serviço de modelos de mensagem (templates) — FSD seções 6.4, 12.7, 21.
//
// CRUD exclusivo do Administrador (controller aplica requireAdmin nas rotas
// de escrita); leitura disponível para Acesso Limitado também.
//
// Regras de exclusão (FSD seção 21 e linha 998): um template já usado em
// alguma mensagem enviada não pode ser excluído (checagem explícita, pois
// `messages.template_id` é ON DELETE SET NULL — não bloqueia sozinho no
// banco). Um template referenciado por réguas ou campanhas também não pode
// ser excluído (bloqueado por FK RESTRICT no banco, migration 032).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { crmPool } = require('../database/connection');
const settings = require('../config/settings');
const { detectImageType } = require('./image-validation.util');

const PG_FOREIGN_KEY_VIOLATION = '23503';
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB (FSD seção 21)
const ATTACHMENTS_DIR = path.resolve(process.cwd(), settings.storage.attachmentsPath);

function mapTemplateRow(row) {
  return {
    id: row.id,
    name: row.name,
    bodyText: row.body_text,
    variables: row.variables || [],
    imageAttachmentId: row.image_attachment_id,
    linkUrl: row.link_url,
    active: row.active,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listTemplates({ includeInactive = false } = {}) {
  const where = includeInactive ? '' : 'WHERE active = true';
  const result = await crmPool.query(`SELECT * FROM message_templates ${where} ORDER BY name ASC`);
  return result.rows.map(mapTemplateRow);
}

async function getTemplateById(id) {
  const result = await crmPool.query('SELECT * FROM message_templates WHERE id = $1', [id]);
  return result.rows[0] ? mapTemplateRow(result.rows[0]) : null;
}

async function createTemplate({ name, bodyText, variables, linkUrl, createdBy }) {
  const result = await crmPool.query(
    `INSERT INTO message_templates (name, body_text, variables, link_url, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [name, bodyText, JSON.stringify(variables || []), linkUrl || null, createdBy]
  );
  return mapTemplateRow(result.rows[0]);
}

async function updateTemplate(id, { name, bodyText, variables, linkUrl }) {
  const result = await crmPool.query(
    `UPDATE message_templates
        SET name = $1, body_text = $2, variables = $3, link_url = $4, updated_at = NOW()
      WHERE id = $5
      RETURNING *`,
    [name, bodyText, JSON.stringify(variables || []), linkUrl || null, id]
  );

  if (result.rows.length === 0) {
    throw new Error('Modelo de mensagem não encontrado.');
  }

  return mapTemplateRow(result.rows[0]);
}

async function toggleActive(id, active) {
  const result = await crmPool.query(
    `UPDATE message_templates SET active = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [active, id]
  );

  if (result.rows.length === 0) {
    throw new Error('Modelo de mensagem não encontrado.');
  }

  return mapTemplateRow(result.rows[0]);
}

async function deleteTemplate(id) {
  const usedInMessages = await crmPool.query('SELECT 1 FROM messages WHERE template_id = $1 LIMIT 1', [id]);

  if (usedInMessages.rows.length > 0) {
    throw new Error(
      'Este modelo já foi usado em mensagens enviadas e não pode ser excluído. Desative-o em vez de excluir.'
    );
  }

  try {
    const result = await crmPool.query('DELETE FROM message_templates WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      throw new Error('Modelo de mensagem não encontrado.');
    }
  } catch (err) {
    if (err.code === PG_FOREIGN_KEY_VIOLATION) {
      throw new Error(
        'Este modelo está sendo usado por uma ou mais réguas de relacionamento ou campanhas e não pode ser excluído. Desative-o em vez de excluir.'
      );
    }
    throw err;
  }

  return true;
}

// Envia (ou substitui) a imagem de um template. Nunca apaga o anexo
// anterior — só troca qual anexo o template aponta como atual (FSD seção
// 21: "apenas substituído por um novo upload, preservando o arquivo
// original"). O arquivo fica em disco com nome gerado (nunca o nome
// original do upload, para evitar colisão/traversal de caminho).
async function uploadTemplateImage(templateId, { buffer, originalFilename, uploadedBy }) {
  const template = await getTemplateById(templateId);

  if (!template) {
    throw new Error('Modelo de mensagem não encontrado.');
  }

  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    throw new Error('A imagem excede o limite de 5MB.');
  }

  const detected = detectImageType(buffer);

  if (!detected) {
    throw new Error('Arquivo inválido: só são aceitas imagens JPG, PNG ou WEBP.');
  }

  await fs.promises.mkdir(ATTACHMENTS_DIR, { recursive: true });

  const generatedFilename = `${crypto.randomBytes(16).toString('hex')}.${detected.extension}`;
  const absolutePath = path.join(ATTACHMENTS_DIR, generatedFilename);
  await fs.promises.writeFile(absolutePath, buffer);

  const attachmentResult = await crmPool.query(
    `INSERT INTO attachments (template_id, file_path, original_filename, mime_type, size_bytes, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [templateId, generatedFilename, originalFilename || null, detected.mimeType, buffer.length, uploadedBy]
  );

  const attachment = attachmentResult.rows[0];

  await crmPool.query(
    `UPDATE message_templates SET image_attachment_id = $1, updated_at = NOW() WHERE id = $2`,
    [attachment.id, templateId]
  );

  return {
    id: attachment.id,
    originalFilename: attachment.original_filename,
    mimeType: attachment.mime_type,
    sizeBytes: attachment.size_bytes,
  };
}

async function getAttachmentById(id) {
  const result = await crmPool.query('SELECT * FROM attachments WHERE id = $1', [id]);
  return result.rows[0] || null;
}

// Converte o `file_path` relativo salvo em `attachments` no caminho
// absoluto real em disco. Compartilhado com message-queue.service.js, que
// precisa do caminho local para enviar a imagem do template via WhatsApp
// (whatsapp.sendImage espera um arquivo local, nunca uma URL remota).
function resolveAttachmentAbsolutePath(relativeFilePath) {
  return path.join(ATTACHMENTS_DIR, relativeFilePath);
}

// Resolve o anexo de imagem ATUAL do template (via image_attachment_id),
// pronto para a rota de download servir — nunca expõe o caminho do arquivo
// diretamente ao cliente, só o Controller autenticado usa isso.
async function getTemplateImage(templateId) {
  const template = await getTemplateById(templateId);

  if (!template || !template.imageAttachmentId) {
    return null;
  }

  const attachment = await getAttachmentById(template.imageAttachmentId);

  if (!attachment) {
    return null;
  }

  return {
    absolutePath: resolveAttachmentAbsolutePath(attachment.file_path),
    mimeType: attachment.mime_type,
  };
}

module.exports = {
  listTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  toggleActive,
  deleteTemplate,
  uploadTemplateImage,
  getTemplateImage,
  resolveAttachmentAbsolutePath,
};
