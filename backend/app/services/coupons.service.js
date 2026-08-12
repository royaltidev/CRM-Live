// Serviço de cupons de desconto (FSD seções 6.4, 12.8, 14.5, tabela
// `coupons`, migration 018).
//
// CRUD exclusivo do Administrador (rotas de escrita usam requireAdmin);
// leitura disponível para Acesso Limitado.
//
// Sobre expiração (FSD 14.5): um cupom vencido (`valid_until` no passado)
// não pode ser aplicado a campanha nem exibido como disponível. O status
// armazenado não é reescrito em lote — o status EFETIVO é calculado na
// leitura (cupom `active` com `valid_until` vencido é tratado como
// `expired`). Isso evita um job só para virar status e mantém a coluna
// como registro do que foi definido.
//
// Sobre uso: um cupom é de uso único (status `used` + used_by_customer_id/
// used_in_sale_id/redeemed_at). O fluxo que marca cupom como usado é a
// atribuição por período de campanha (Parte 5 da Fase 8) — este CRUD não
// marca uso manualmente (não previsto no FSD 12.8).

const { crmPool } = require('../database/connection');

const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';

const DISCOUNT_TYPES = ['percent', 'fixed'];

// Expressão do status efetivo, usada em todas as leituras (FSD 14.5).
const EFFECTIVE_STATUS_SQL = `
  CASE
    WHEN c.status = 'active' AND c.valid_until IS NOT NULL AND c.valid_until < NOW() THEN 'expired'
    ELSE c.status::text
  END
`;

function mapCouponRow(row) {
  return {
    id: row.id,
    code: row.code,
    description: row.description,
    discountType: row.discount_type,
    discountValue: row.discount_value !== null ? Number(row.discount_value) : null,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    campaignId: row.campaign_id,
    status: row.effective_status,
    usedByCustomerId: row.used_by_customer_id,
    usedByCustomerName: row.used_by_customer_name || null,
    usedInSaleId: row.used_in_sale_id,
    redeemedAt: row.redeemed_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

// Lista cupons com filtro opcional por status EFETIVO ('active' | 'used' |
// 'expired') e busca por código.
async function listCoupons({ status = null, code = null } = {}) {
  const conditions = [];
  const params = [];

  if (status) {
    params.push(status);
    conditions.push(`${EFFECTIVE_STATUS_SQL} = $${params.length}`);
  }
  if (code) {
    params.push(`%${code}%`);
    conditions.push(`c.code ILIKE $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await crmPool.query(
    `SELECT c.*, ${EFFECTIVE_STATUS_SQL} AS effective_status, cu.name AS used_by_customer_name
       FROM coupons c
       LEFT JOIN customers cu ON cu.id = c.used_by_customer_id
       ${where}
      ORDER BY c.created_at DESC`,
    params
  );

  return result.rows.map(mapCouponRow);
}

async function getCouponById(id) {
  const result = await crmPool.query(
    `SELECT c.*, ${EFFECTIVE_STATUS_SQL} AS effective_status, cu.name AS used_by_customer_name
       FROM coupons c
       LEFT JOIN customers cu ON cu.id = c.used_by_customer_id
      WHERE c.id = $1`,
    [id]
  );
  return result.rows[0] ? mapCouponRow(result.rows[0]) : null;
}

function validateCouponData({ code, discountType, discountValue, validFrom, validUntil }) {
  if (!code || !String(code).trim()) {
    throw new Error('O código do cupom é obrigatório.');
  }
  if (!DISCOUNT_TYPES.includes(discountType)) {
    throw new Error('Tipo de desconto inválido. Use "percent" ou "fixed".');
  }
  const value = Number(discountValue);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('O valor do desconto deve ser um número maior que zero.');
  }
  if (discountType === 'percent' && value > 100) {
    throw new Error('Um desconto percentual não pode ser maior que 100%.');
  }
  if (validFrom && validUntil && new Date(validUntil) < new Date(validFrom)) {
    throw new Error('A validade final não pode ser anterior à inicial.');
  }
}

async function createCoupon({ code, description, discountType, discountValue, validFrom, validUntil, createdBy }) {
  validateCouponData({ code, discountType, discountValue, validFrom, validUntil });

  try {
    const result = await crmPool.query(
      `INSERT INTO coupons (code, description, discount_type, discount_value, valid_from, valid_until, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        String(code).trim().toUpperCase(),
        description || null,
        discountType,
        Number(discountValue),
        validFrom || null,
        validUntil || null,
        createdBy,
      ]
    );
    return getCouponById(result.rows[0].id);
  } catch (err) {
    if (err.code === PG_UNIQUE_VIOLATION) {
      throw new Error('Já existe um cupom com esse código.');
    }
    throw err;
  }
}

// Edição permitida apenas enquanto o cupom não foi usado — depois do uso,
// ele é registro histórico (FSD seção 10: "uso registrado").
async function updateCoupon(id, { code, description, discountType, discountValue, validFrom, validUntil }) {
  const existing = await getCouponById(id);

  if (!existing) {
    throw new Error('Cupom não encontrado.');
  }
  if (existing.status === 'used') {
    throw new Error('Este cupom já foi utilizado e não pode mais ser editado.');
  }

  validateCouponData({ code, discountType, discountValue, validFrom, validUntil });

  try {
    await crmPool.query(
      `UPDATE coupons
          SET code = $1, description = $2, discount_type = $3, discount_value = $4,
              valid_from = $5, valid_until = $6
        WHERE id = $7`,
      [
        String(code).trim().toUpperCase(),
        description || null,
        discountType,
        Number(discountValue),
        validFrom || null,
        validUntil || null,
        id,
      ]
    );
    return getCouponById(id);
  } catch (err) {
    if (err.code === PG_UNIQUE_VIOLATION) {
      throw new Error('Já existe um cupom com esse código.');
    }
    throw err;
  }
}

// Exclusão definitiva só sem histórico (FSD seção 10): cupom já usado é
// bloqueado aqui; cupom associado a campanha é bloqueado pela FK RESTRICT
// (migration 033).
async function deleteCoupon(id) {
  const existing = await getCouponById(id);

  if (!existing) {
    throw new Error('Cupom não encontrado.');
  }
  if (existing.status === 'used') {
    throw new Error('Este cupom já foi utilizado e não pode ser excluído.');
  }

  try {
    await crmPool.query('DELETE FROM coupons WHERE id = $1', [id]);
  } catch (err) {
    if (err.code === PG_FOREIGN_KEY_VIOLATION) {
      throw new Error('Este cupom está associado a uma campanha e não pode ser excluído.');
    }
    throw err;
  }

  return true;
}

module.exports = {
  DISCOUNT_TYPES,
  listCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
};
