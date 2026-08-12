// Controller de produtos complementares (cross-sell), FSD seções 6.4, 12.9.
// Leitura E escrita liberadas a Admin e Acesso Limitado (ver comentário em
// services/complementary-products.service.js).

const complementaryProductsService = require('../services/complementary-products.service');
const automationSettingsService = require('../services/automation-settings.service');

function handleKnownErrors(err, res) {
  if (err.message === 'Relação de produto complementar não encontrada.') {
    res.status(404).json({ error: err.message });
    return true;
  }
  if (
    err.message.includes('já está cadastrado') ||
    err.message.includes('Selecione o produto') ||
    err.message.includes('não pode ser o mesmo produto') ||
    err.message.includes('não encontrado')
  ) {
    res.status(400).json({ error: err.message });
    return true;
  }
  return false;
}

// GET /complementary-products?productId=&active=
async function listComplementaryProducts(req, res) {
  try {
    const { productId, active } = req.query;
    const items = await complementaryProductsService.listComplementaryProducts({
      productId: productId || null,
      active: active !== undefined ? active : null,
    });
    res.json({ complementaryProducts: items });
  } catch (err) {
    console.error('Erro ao listar produtos complementares:', err.message);
    res.status(500).json({ error: 'Erro ao carregar produtos complementares.' });
  }
}

// GET /complementary-products/settings/discount-percent
async function getDiscountPercent(req, res) {
  try {
    const percent = await automationSettingsService.getCrossSellDiscountPercent();
    res.json({ percent });
  } catch (err) {
    console.error('Erro ao carregar percentual de desconto do cross-sell:', err.message);
    res.status(500).json({ error: 'Erro ao carregar percentual de desconto do cross-sell.' });
  }
}

// PATCH /complementary-products/settings/discount-percent { percent }
async function setDiscountPercent(req, res) {
  try {
    const { percent } = req.body;
    const saved = await automationSettingsService.setCrossSellDiscountPercent(Number(percent), req.user.id);
    res.json({ percent: saved });
  } catch (err) {
    if (err.message.includes('percentual de desconto')) {
      return res.status(400).json({ error: err.message });
    }
    console.error('Erro ao salvar percentual de desconto do cross-sell:', err.message);
    res.status(500).json({ error: 'Erro ao salvar percentual de desconto do cross-sell.' });
  }
}

// POST /complementary-products
async function createComplementaryProduct(req, res) {
  try {
    const { productId, complementaryProductId } = req.body;
    const item = await complementaryProductsService.createComplementaryProduct({
      productId,
      complementaryProductId,
      createdBy: req.user.id,
    });
    res.status(201).json({ complementaryProduct: item });
  } catch (err) {
    if (handleKnownErrors(err, res)) return;
    console.error('Erro ao criar produto complementar:', err.message);
    res.status(500).json({ error: 'Erro ao criar produto complementar.' });
  }
}

// PATCH /complementary-products/:id/toggle-active
async function toggleActive(req, res) {
  try {
    const item = await complementaryProductsService.toggleActive(req.params.id);
    res.json({ complementaryProduct: item });
  } catch (err) {
    if (handleKnownErrors(err, res)) return;
    console.error('Erro ao alterar status do produto complementar:', err.message);
    res.status(500).json({ error: 'Erro ao alterar status do produto complementar.' });
  }
}

// DELETE /complementary-products/:id
async function deleteComplementaryProduct(req, res) {
  try {
    await complementaryProductsService.deleteComplementaryProduct(req.params.id);
    res.json({ success: true });
  } catch (err) {
    if (handleKnownErrors(err, res)) return;
    console.error('Erro ao excluir produto complementar:', err.message);
    res.status(500).json({ error: 'Erro ao excluir produto complementar.' });
  }
}

module.exports = {
  listComplementaryProducts,
  getDiscountPercent,
  setDiscountPercent,
  createComplementaryProduct,
  toggleActive,
  deleteComplementaryProduct,
};
