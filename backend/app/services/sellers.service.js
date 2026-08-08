// Serviço de vendedores e fila de rodízio (FSD seções 6.5, 8.5, 14.7, 18).
//
// Escopo desta fase (Fase 5): CRUD de vendedores + consulta de qual seria o
// próximo vendedor da fila de rodízio (getNextInRotation), SEM efetivar
// nenhuma designação. O motor que efetivamente encaminha leads pela fila
// (avançando rotation_last_assigned_at ao designar) é a Fase 9 e não faz
// parte deste arquivo.

const { queryAsync, getAsync, allAsync } = require('../database/connection');

// Regex simples para validar telefone/WhatsApp: aceita dígitos, espaços,
// parênteses, hífen e "+" opcional no início. Rejeita apenas strings
// obviamente inválidas (ex.: letras soltas). Não é uma validação rigorosa
// de formato de telefone brasileiro.
const PHONE_REGEX = /^\+?[\d\s()-]{8,20}$/;

// Valida os dados de entrada de criação/atualização de vendedor.
// Lança Error com mensagem amigável em caso de dado inválido.
function validateSellerInput({ name, whatsappPhone }, { partial = false } = {}) {
  if (!partial || name !== undefined) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new Error('O nome do vendedor é obrigatório.');
    }
  }

  if (whatsappPhone !== undefined && whatsappPhone !== null && whatsappPhone !== '') {
    if (typeof whatsappPhone !== 'string' || !PHONE_REGEX.test(whatsappPhone.trim())) {
      throw new Error('O número de WhatsApp informado é inválido. Use apenas dígitos, espaços, parênteses, hífen e "+".');
    }
  }
}

// Mapeia uma linha do banco para o formato de resposta da API.
function mapSeller(row) {
  if (!row) return null;
  return {
    id: row.id,
    uniplusSellerId: row.uniplus_seller_id,
    name: row.name,
    whatsappPhone: row.whatsapp_phone,
    active: row.active,
    rotationLastAssignedAt: row.rotation_last_assigned_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Lista vendedores, ordenados por nome. Por padrão retorna só os ativos.
async function listSellers({ includeInactive = false } = {}) {
  const sql = includeInactive
    ? 'SELECT * FROM sellers ORDER BY name ASC'
    : 'SELECT * FROM sellers WHERE active = true ORDER BY name ASC';

  const rows = await allAsync(sql);
  return rows.map(mapSeller);
}

// Busca um vendedor pelo id. Retorna null se não existir.
async function getSellerById(id) {
  const row = await getAsync('SELECT * FROM sellers WHERE id = $1', [id]);
  return mapSeller(row);
}

// Cria um novo vendedor.
async function createSeller({ name, whatsappPhone, uniplusSellerId }) {
  validateSellerInput({ name, whatsappPhone });

  try {
    const result = await queryAsync(
      `INSERT INTO sellers (name, whatsapp_phone, uniplus_seller_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name.trim(), whatsappPhone ? whatsappPhone.trim() : null, uniplusSellerId || null]
    );
    return mapSeller(result.rows[0]);
  } catch (err) {
    if (err.message && err.message.startsWith('O ')) {
      throw err; // erro de validação já amigável
    }
    console.error('Erro ao criar vendedor:', err.message);
    throw new Error('Não foi possível cadastrar o vendedor. Tente novamente.');
  }
}

// Atualiza dados de um vendedor existente (atualização parcial).
async function updateSeller(id, { name, whatsappPhone, uniplusSellerId }) {
  const existing = await getAsync('SELECT * FROM sellers WHERE id = $1', [id]);
  if (!existing) {
    throw new Error('Vendedor não encontrado');
  }

  validateSellerInput({ name, whatsappPhone }, { partial: true });

  const nextName = name !== undefined ? name.trim() : existing.name;
  const nextWhatsapp = whatsappPhone !== undefined
    ? (whatsappPhone ? whatsappPhone.trim() : null)
    : existing.whatsapp_phone;
  const nextUniplusId = uniplusSellerId !== undefined ? (uniplusSellerId || null) : existing.uniplus_seller_id;

  try {
    const result = await queryAsync(
      `UPDATE sellers
       SET name = $1, whatsapp_phone = $2, uniplus_seller_id = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [nextName, nextWhatsapp, nextUniplusId, id]
    );
    return mapSeller(result.rows[0]);
  } catch (err) {
    if (err.message && err.message.startsWith('O ')) {
      throw err;
    }
    console.error('Erro ao atualizar vendedor:', err.message);
    throw new Error('Não foi possível atualizar o vendedor. Tente novamente.');
  }
}

// Ativa ou desativa um vendedor (padrão do projeto para entidades
// configuráveis, FSD seção 18 — não é soft delete formal).
async function toggleSellerActive(id, active) {
  const result = await queryAsync(
    `UPDATE sellers
     SET active = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [!!active, id]
  );

  if (result.rows.length === 0) {
    throw new Error('Vendedor não encontrado');
  }

  return mapSeller(result.rows[0]);
}

// Retorna o próximo vendedor da fila de rodízio (consulta apenas — não
// efetiva nenhuma designação nem altera rotation_last_assigned_at).
//
// Regra: entre os vendedores ATIVOS, escolhe o de rotation_last_assigned_at
// mais antigo; NULL (nunca usado) tem prioridade máxima e vem antes de
// qualquer timestamp real (NULLS FIRST). Retorna null se não houver
// vendedor ativo.
async function getNextInRotation() {
  const row = await getAsync(
    `SELECT * FROM sellers
     WHERE active = true
     ORDER BY rotation_last_assigned_at ASC NULLS FIRST
     LIMIT 1`
  );
  return mapSeller(row);
}

module.exports = {
  listSellers,
  getSellerById,
  createSeller,
  updateSeller,
  toggleSellerActive,
  getNextInRotation,
};
