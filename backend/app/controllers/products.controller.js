// Controller de produtos — leitura apenas (ver services/products.service.js).
// Acessível a Admin e Acesso Limitado (mesma visibilidade do catálogo usado
// pela tela de Cross-sell, FSD 8.5).

const productsService = require('../services/products.service');

// GET /products?search=&active=
async function listProducts(req, res) {
  try {
    const { search, active } = req.query;
    const products = await productsService.listProducts({
      search: search || null,
      active: active !== undefined ? active : null,
    });
    res.json({ products });
  } catch (err) {
    console.error('Erro ao listar produtos:', err.message);
    res.status(500).json({ error: 'Erro ao carregar produtos.' });
  }
}

// GET /products/categories
async function listCategories(req, res) {
  try {
    const categories = await productsService.listProductCategories();
    res.json({ categories });
  } catch (err) {
    console.error('Erro ao listar categorias de produtos:', err.message);
    res.status(500).json({ error: 'Erro ao carregar categorias de produtos.' });
  }
}

module.exports = {
  listProducts,
  listCategories,
};
