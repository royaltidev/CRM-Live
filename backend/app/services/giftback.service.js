// Serviço de giftback/cashback (FSD seções 6.4, 12.8, 14.5, tabela
// `giftback_credits`, migration 019).
//
// Um giftback é um CRÉDITO concedido a um cliente específico (percentual
// sobre a compra OU valor fixo — exatamente um dos dois), com validade
// opcional, para uso em uma compra futura (FSD glossário, linha 1258).
// A emissão em massa via campanha é escopo da Parte 5 (campanhas); aqui é
// o CRUD individual, exclusivo do Administrador.
//
// Mesmo padrão de expiração dos cupons (FSD 14.5): o status EFETIVO é
// calculado na leitura — crédito `available` com `valid_until` no passado
// é tratado como `expired`, sem job de virada de status.
//
// Uso (resgate): registrado via `used_in_sale_id`/status `used` pela
// atribuição por período (Parte 5) — não há marcação manual neste CRUD.

const { crmPool } = require('../database/connection');

const PG_FOREIGN_KEY_VIOLATION = '23503';

const EFFECTIVE_STATUS_SQL = `
  CASE
    WHEN g.status = 'available' AND g.valid_until IS NOT NULL AND g.valid_until < NOW() THEN 'expired'
    ELSE g.status::text
  END
`;

function mapGiftbackRow(row) {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name || null,
    campaignId: row.campaign_id,
    creditPercent: row.credit_percent !== null ? Number(row.credit_percent) : null,
    creditValue: row.credit_value !== null ? Number(row.credit_value) : null,
    validUntil: row.valid_until,
    status: row.effective_status,
    usedInSaleId: row.used_in_sale_id,
    createdAt: row.created_at,
  };
}

// Lista créditos com filtro por status EFETIVO ('available' | 'used' |
// 'expired') e por nome de cliente.
async function listGiftbacks({ status = null, customerName = null } = {}) {
  const conditions = [];
  const params = [];

  if (status) {
    params.push(status);
    conditions.push(`${EFFECTIVE_STATUS_SQL} = $${params.length}`);
  }
  if (customerName) {
    params.push(`%${customerName}%`);
    conditions.push(`cu.name ILIKE $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await crmPool.query(
    `SELECT g.*, ${EFFECTIVE_STATUS_SQL} AS effective_status, cu.name AS customer_name
       FROM giftback_credits g
       JOIN customers cu ON cu.id = g.customer_id
       ${where}
      ORDER BY g.created_at DESC`,
    params
  );

  return result.rows.map(mapGiftbackRow);
}

async function getGiftbackById(id) {
  const result = await crmPool.query(
    `SELECT g.*, ${EFFECTIVE_STATUS_SQL} AS effective_status, cu.name AS customer_name
       FROM giftback_credits g
       JOIN customers cu ON cu.id = g.customer_id
      WHERE g.id = $1`,
    [id]
  );
  return result.rows[0] ? mapGiftbackRow(result.rows[0]) : null;
}

// Exatamente um entre creditPercent e creditValue (o schema permite os dois
// nullable, mas um crédito com ambos — ou nenhum — não tem semântica).
function validateGiftbackData({ creditPercent, creditValue }) {
  const hasPercent = creditPercent !== null && creditPercent !== undefined && creditPercent !== '';
  const hasValue = creditValue !== null && creditValue !== undefined && creditValue !== '';

  if (hasPercent === hasValue) {
    throw new Error('Informe o percentual OU o valor fixo do crédito (apenas um dos dois).');
  }

  if (hasPercent) {
    const percent = Number(creditPercent);
    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
      throw new Error('O percentual do crédito deve ser maior que zero e no máximo 100.');
    }
  }

  if (hasValue) {
    const value = Number(creditValue);
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error('O valor do crédito deve ser um número maior que zero.');
    }
  }
}

async function createGiftback({ customerId, creditPercent, creditValue, validUntil }) {
  if (!customerId) {
    throw new Error('Selecione o cliente que receberá o crédito.');
  }

  validateGiftbackData({ creditPercent, creditValue });

  const customer = await crmPool.query('SELECT id FROM customers WHERE id = $1', [customerId]);
  if (customer.rows.length === 0) {
    throw new Error('Cliente não encontrado.');
  }

  const result = await crmPool.query(
    `INSERT INTO giftback_credits (customer_id, credit_percent, credit_value, valid_until)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [
      customerId,
      creditPercent !== null && creditPercent !== undefined && creditPercent !== '' ? Number(creditPercent) : null,
      creditValue !== null && creditValue !== undefined && creditValue !== '' ? Number(creditValue) : null,
      validUntil || null,
    ]
  );

  return getGiftbackById(result.rows[0].id);
}

// Edição permitida apenas enquanto não usado (registro histórico depois —
// FSD seção 10). Cliente não é editável: um crédito pertence a quem foi
// concedido; para outro cliente, cria-se outro crédito.
async function updateGiftback(id, { creditPercent, creditValue, validUntil }) {
  const existing = await getGiftbackById(id);

  if (!existing) {
    throw new Error('Crédito de giftback não encontrado.');
  }
  if (existing.status === 'used') {
    throw new Error('Este crédito já foi utilizado e não pode mais ser editado.');
  }

  validateGiftbackData({ creditPercent, creditValue });

  await crmPool.query(
    `UPDATE giftback_credits
        SET credit_percent = $1, credit_value = $2, valid_until = $3
      WHERE id = $4`,
    [
      creditPercent !== null && creditPercent !== undefined && creditPercent !== '' ? Number(creditPercent) : null,
      creditValue !== null && creditValue !== undefined && creditValue !== '' ? Number(creditValue) : null,
      validUntil || null,
      id,
    ]
  );

  return getGiftbackById(id);
}

// Exclusão definitiva só sem histórico (FSD seção 10): crédito usado é
// bloqueado aqui; crédito associado a campanha é bloqueado pela FK RESTRICT
// (migration 033).
async function deleteGiftback(id) {
  const existing = await getGiftbackById(id);

  if (!existing) {
    throw new Error('Crédito de giftback não encontrado.');
  }
  if (existing.status === 'used') {
    throw new Error('Este crédito já foi utilizado e não pode ser excluído.');
  }

  try {
    await crmPool.query('DELETE FROM giftback_credits WHERE id = $1', [id]);
  } catch (err) {
    if (err.code === PG_FOREIGN_KEY_VIOLATION) {
      throw new Error('Este crédito está associado a uma campanha e não pode ser excluído.');
    }
    throw err;
  }

  return true;
}

module.exports = {
  listGiftbacks,
  getGiftbackById,
  createGiftback,
  updateGiftback,
  deleteGiftback,
};
