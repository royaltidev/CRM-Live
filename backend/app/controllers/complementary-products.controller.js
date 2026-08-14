// Controller de produtos complementares (cross-sell), FSD seções 6.4, 12.9.
// Leitura E escrita liberadas a Admin e Acesso Limitado (ver comentário em
// services/complementary-products.service.js).

const complementaryProductsService = require('../services/complementary-products.service');
const automationSettingsService = require('../services/automation-settings.service');
const productAffinityService = require('../services/product-affinity.service');

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

// GET /complementary-products?productId=&active=&source=
async function listComplementaryProducts(req, res) {
  try {
    const { productId, active, source } = req.query;
    const items = await complementaryProductsService.listComplementaryProducts({
      productId: productId || null,
      active: active !== undefined ? active : null,
      source: source || null,
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

// PATCH /complementary-products/bulk-active { ids: [], active: bool }
// Ativa ou desativa várias sugestões de uma vez (ação em lote da tela de
// Cross-sell, remodelagem de 14/08/2026).
async function bulkSetActive(req, res) {
  try {
    const { ids, active } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Selecione ao menos uma sugestão.' });
    }
    if (typeof active !== 'boolean') {
      return res.status(400).json({ error: 'Informe se as sugestões devem ficar ativas ou inativas.' });
    }
    const affected = await complementaryProductsService.bulkSetActive(ids, active);
    res.json({ affected });
  } catch (err) {
    console.error('Erro ao atualizar sugestões em lote:', err.message);
    res.status(500).json({ error: 'Erro ao atualizar as sugestões selecionadas.' });
  }
}

// PATCH /complementary-products/bulk-dismiss { ids: [], dismissed: bool }
// Descarta (ou restaura) sugestões em lote. Descartar marca a decisão em vez
// de apagar a linha — ver complementary-products.service.js/bulkDismiss.
async function bulkDismiss(req, res) {
  try {
    const { ids, dismissed = true } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Selecione ao menos uma sugestão.' });
    }
    const affected = dismissed
      ? await complementaryProductsService.bulkDismiss(ids)
      : await complementaryProductsService.bulkRestore(ids);
    res.json({ affected });
  } catch (err) {
    console.error('Erro ao descartar sugestões em lote:', err.message);
    res.status(500).json({ error: 'Erro ao atualizar as sugestões selecionadas.' });
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

// POST /complementary-products/detect-patterns (Venda Inteligente — escopo
// novo, ver product-affinity.service.js). Roda o motor de detecção sob
// demanda; sugestões aceitas entram inativas, revisão continua na própria
// listagem acima (filtro por "origem").
async function detectPatterns(req, res) {
  try {
    const result = await productAffinityService.detectFrequentlyBoughtTogether();
    res.json(result);
  } catch (err) {
    console.error('Erro ao detectar padrões de produtos comprados juntos:', err.message);
    res.status(500).json({ error: 'Erro ao detectar padrões de produtos comprados juntos.' });
  }
}

module.exports = {
  listComplementaryProducts,
  getDiscountPercent,
  setDiscountPercent,
  detectPatterns,
  bulkSetActive,
  bulkDismiss,
  toggleActive,
  deleteComplementaryProduct,
};
