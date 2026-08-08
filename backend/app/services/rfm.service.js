// Serviço de classificação RFM (Recência, Frequência, Valor Monetário) de clientes.
// Ver docs/FSD.md, seções 6.2 e 20.
//
// Os LIMITES de cada faixa (VIP, fiel, em risco, inativo, etc.) são configuráveis
// exclusivamente pelo Administrador e ficam armazenados em system_settings,
// key = 'rfm_criteria'. Enquanto o Administrador não configurar esses critérios
// pela primeira vez, a classificação fica "pendente" — nenhum valor arbitrário
// é assumido e nenhum rfm_segment é escrito.
//
// Formato adotado para system_settings.value quando key = 'rfm_criteria':
// {
//   "segments": [
//     { "name": "vip",       "label": "VIP",       "maxDaysSinceLastPurchase": 30,   "minPurchaseCount": 5, "minTotalSpent": 1000 },
//     { "name": "fiel",      "label": "Fiel",       "maxDaysSinceLastPurchase": 60,   "minPurchaseCount": 3, "minTotalSpent": 300 },
//     { "name": "em_risco",  "label": "Em risco",   "maxDaysSinceLastPurchase": 120,  "minPurchaseCount": 1, "minTotalSpent": 0 },
//     { "name": "inativo",   "label": "Inativo",    "maxDaysSinceLastPurchase": null, "minPurchaseCount": 0, "minTotalSpent": 0 }
//   ]
// }
//
// Regras de avaliação (decididas nesta implementação):
// - Os segmentos do array são avaliados NA ORDEM em que aparecem — da regra mais
//   exigente para a mais frouxa — e o cliente recebe o primeiro segmento cujos
//   três critérios ele satisfaz simultaneamente:
//     * diasDesdeUltimaCompra <= maxDaysSinceLastPurchase (sem limite se null)
//     * quantidadeDeCompras   >= minPurchaseCount
//     * totalGasto            >= minTotalSpent
// - Clientes sem nenhuma compra (last_purchase_at nulo) nunca satisfazem um
//   critério de recência numérico, então só se enquadram em um segmento cujo
//   maxDaysSinceLastPurchase seja null (por convenção, o último da lista —
//   normalmente "inativo" — deve ter maxDaysSinceLastPurchase: null para
//   funcionar como fallback "pega-tudo").
// - Caso, por uma configuração incompleta, nenhum segmento seja satisfeito,
//   usamos o último segmento da lista como fallback de segurança.

const { crmPool } = require('../database/connection');

const RFM_CRITERIA_KEY = 'rfm_criteria';

// Lê os critérios de classificação RFM configurados pelo Administrador.
// Retorna null se ainda não houver sido configurado (estado "pendente").
async function getRfmCriteria() {
  const result = await crmPool.query(
    'SELECT value, updated_by, updated_at FROM system_settings WHERE key = $1',
    [RFM_CRITERIA_KEY]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return {
    ...result.rows[0].value,
    updatedBy: result.rows[0].updated_by,
    updatedAt: result.rows[0].updated_at,
  };
}

// Valida a estrutura básica do objeto de critérios antes de salvar.
function validateCriteria(criteria) {
  if (!criteria || typeof criteria !== 'object' || Array.isArray(criteria)) {
    throw new Error('Critérios inválidos: um objeto é esperado.');
  }

  if (!Array.isArray(criteria.segments) || criteria.segments.length === 0) {
    throw new Error('Critérios inválidos: "segments" deve ser uma lista não vazia.');
  }

  criteria.segments.forEach((seg, index) => {
    if (!seg || typeof seg !== 'object') {
      throw new Error(`Segmento na posição ${index} é inválido.`);
    }
    if (!seg.name || typeof seg.name !== 'string') {
      throw new Error(`Segmento na posição ${index}: "name" é obrigatório.`);
    }
    if (!seg.label || typeof seg.label !== 'string') {
      throw new Error(`Segmento "${seg.name}": "label" é obrigatório.`);
    }
    if (seg.maxDaysSinceLastPurchase !== null && typeof seg.maxDaysSinceLastPurchase !== 'number') {
      throw new Error(`Segmento "${seg.name}": "maxDaysSinceLastPurchase" deve ser número ou null.`);
    }
    if (typeof seg.minPurchaseCount !== 'number') {
      throw new Error(`Segmento "${seg.name}": "minPurchaseCount" deve ser número.`);
    }
    if (typeof seg.minTotalSpent !== 'number') {
      throw new Error(`Segmento "${seg.name}": "minTotalSpent" deve ser número.`);
    }
  });
}

// Salva (insere ou atualiza) os critérios de classificação RFM. Exclusivo do Admin
// — a checagem de papel é feita na camada de rota (requireAdmin), este serviço
// apenas registra quem fez a alteração.
async function setRfmCriteria(criteriaObject, adminUserId) {
  validateCriteria(criteriaObject);

  const result = await crmPool.query(
    `INSERT INTO system_settings (key, value, description, updated_by, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value,
           updated_by = EXCLUDED.updated_by,
           updated_at = NOW()
     RETURNING value, updated_by, updated_at`,
    [
      RFM_CRITERIA_KEY,
      JSON.stringify(criteriaObject),
      'Critérios de classificação RFM (Recência/Frequência/Valor) dos clientes.',
      adminUserId,
    ]
  );

  const row = result.rows[0];
  return { ...row.value, updatedBy: row.updated_by, updatedAt: row.updated_at };
}

// Decide o segmento de um cliente dado seus indicadores e os critérios configurados.
function classifyCustomer({ daysSinceLastPurchase, purchaseCount, totalSpent }, criteria) {
  for (const seg of criteria.segments) {
    const meetsRecency =
      seg.maxDaysSinceLastPurchase === null ||
      (daysSinceLastPurchase !== null && daysSinceLastPurchase <= seg.maxDaysSinceLastPurchase);
    const meetsFrequency = purchaseCount >= (seg.minPurchaseCount || 0);
    const meetsMonetary = totalSpent >= (seg.minTotalSpent || 0);

    if (meetsRecency && meetsFrequency && meetsMonetary) {
      return seg.name;
    }
  }

  // Fallback de segurança: configuração incompleta não deve travar o recálculo.
  return criteria.segments[criteria.segments.length - 1].name;
}

// Recalcula o segmento RFM de todos os clientes com base nos critérios configurados.
// Nesta fase (sem job de sincronização automática do Uniplus — Fase 4 ainda não
// implementada), este recálculo é disparado manualmente via endpoint, por
// qualquer usuário autenticado. Quando a sincronização automática existir, ela
// deverá chamar esta mesma função ao final de cada sync.
async function recalculateRfmForAllCustomers() {
  const criteria = await getRfmCriteria();

  if (!criteria || !Array.isArray(criteria.segments) || criteria.segments.length === 0) {
    return {
      status: 'pending_configuration',
      message: 'Critérios de classificação RFM ainda não configurados pelo Administrador.',
      updated: 0,
    };
  }

  // Para cada cliente: quantidade de compras, valor total gasto e dias desde a última compra.
  const customersResult = await crmPool.query(`
    SELECT
      c.id,
      COALESCE(s.purchase_count, 0) AS purchase_count,
      COALESCE(s.total_spent, 0) AS total_spent,
      CASE
        WHEN c.last_purchase_at IS NULL THEN NULL
        ELSE EXTRACT(DAY FROM (NOW() - c.last_purchase_at))::INTEGER
      END AS days_since_last_purchase
    FROM customers c
    LEFT JOIN (
      SELECT customer_id, COUNT(*) AS purchase_count, SUM(total_amount) AS total_spent
      FROM sales
      WHERE customer_id IS NOT NULL
      GROUP BY customer_id
    ) s ON s.customer_id = c.id
  `);

  let updated = 0;
  const client = await crmPool.connect();
  try {
    await client.query('BEGIN');

    for (const row of customersResult.rows) {
      const segmentName = classifyCustomer(
        {
          daysSinceLastPurchase: row.days_since_last_purchase,
          purchaseCount: parseInt(row.purchase_count, 10),
          totalSpent: parseFloat(row.total_spent),
        },
        criteria
      );

      await client.query('UPDATE customers SET rfm_segment = $1, updated_at = NOW() WHERE id = $2', [
        segmentName,
        row.id,
      ]);
      updated += 1;
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return { status: 'ok', updated };
}

module.exports = {
  RFM_CRITERIA_KEY,
  getRfmCriteria,
  setRfmCriteria,
  validateCriteria,
  classifyCustomer,
  recalculateRfmForAllCustomers,
};
