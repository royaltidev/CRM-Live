// Controller de cupons (FSD seções 6.4, 12.8, 14.5).
// Leitura: Admin e Acesso Limitado. Escrita: exclusiva do Administrador
// (aplicado nas rotas via requireAdmin).

const couponsService = require('../services/coupons.service');

// Mensagens de validação/regra de negócio viram 400/404/409; o resto é 500
// genérico (sem vazar detalhe interno).
function handleKnownErrors(err, res) {
  if (err.message === 'Cupom não encontrado.') {
    res.status(404).json({ error: err.message });
    return true;
  }
  if (err.message === 'Já existe um cupom com esse código.') {
    res.status(409).json({ error: err.message });
    return true;
  }
  if (err.message.includes('não pode ser excluído') || err.message.includes('não pode mais ser editado')) {
    res.status(409).json({ error: err.message });
    return true;
  }
  if (
    err.message.includes('obrigatório') ||
    err.message.includes('inválido') ||
    err.message.includes('desconto') ||
    err.message.includes('validade')
  ) {
    res.status(400).json({ error: err.message });
    return true;
  }
  return false;
}

// GET /coupons?status=active|used|expired&code=BEMVINDO
async function listCoupons(req, res) {
  try {
    const { status, code } = req.query;
    const coupons = await couponsService.listCoupons({ status: status || null, code: code || null });
    res.json({ coupons });
  } catch (err) {
    console.error('Erro ao listar cupons:', err.message);
    res.status(500).json({ error: 'Erro ao carregar cupons.' });
  }
}

// GET /coupons/:id
async function getCouponById(req, res) {
  try {
    const coupon = await couponsService.getCouponById(req.params.id);

    if (!coupon) {
      return res.status(404).json({ error: 'Cupom não encontrado.' });
    }

    res.json({ coupon });
  } catch (err) {
    console.error('Erro ao buscar cupom:', err.message);
    res.status(500).json({ error: 'Erro ao buscar cupom.' });
  }
}

// POST /coupons
async function createCoupon(req, res) {
  try {
    const { code, description, discountType, discountValue, validFrom, validUntil } = req.body;
    const coupon = await couponsService.createCoupon({
      code,
      description,
      discountType,
      discountValue,
      validFrom,
      validUntil,
      createdBy: req.user.id,
    });
    res.status(201).json({ coupon });
  } catch (err) {
    if (handleKnownErrors(err, res)) return;
    console.error('Erro ao criar cupom:', err.message);
    res.status(500).json({ error: 'Erro ao criar cupom.' });
  }
}

// PATCH /coupons/:id
async function updateCoupon(req, res) {
  try {
    const { code, description, discountType, discountValue, validFrom, validUntil } = req.body;
    const coupon = await couponsService.updateCoupon(req.params.id, {
      code,
      description,
      discountType,
      discountValue,
      validFrom,
      validUntil,
    });
    res.json({ coupon });
  } catch (err) {
    if (handleKnownErrors(err, res)) return;
    console.error('Erro ao atualizar cupom:', err.message);
    res.status(500).json({ error: 'Erro ao atualizar cupom.' });
  }
}

// DELETE /coupons/:id
async function deleteCoupon(req, res) {
  try {
    await couponsService.deleteCoupon(req.params.id);
    res.json({ success: true });
  } catch (err) {
    if (handleKnownErrors(err, res)) return;
    console.error('Erro ao excluir cupom:', err.message);
    res.status(500).json({ error: 'Erro ao excluir cupom.' });
  }
}

module.exports = {
  listCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
};
