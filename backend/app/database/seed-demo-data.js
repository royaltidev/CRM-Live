#!/usr/bin/env node

// Script de dados de DEMONSTRAÇÃO — NÃO É PARTE DO SISTEMA EM PRODUÇÃO.
//
// Objetivo: popular o banco local com clientes, vendedores, tags, produtos e
// vendas fictícios, para permitir demonstrar as telas de Clientes, Segmentação
// e Vendedores (Fase 5) enquanto a sincronização real com o Uniplus (Fase 4)
// ainda está bloqueada (schema de origem não mapeado).
//
// REGRAS DE SEGURANÇA:
// - Todo dado inserido aqui é sintético e claramente identificável: os
//   uniplus_id usados começam com "DEMO-" (nunca use esse prefixo em dados
//   reais). Isso facilita localizar e remover os dados de demonstração depois.
// - Este script SE RECUSA A RODAR se NODE_ENV=production, como proteção
//   extra contra execução acidental em ambiente real.
// - O FSD (seção 6.1) proíbe cadastro manual de clientes pela interface do
//   sistema — este script não é "a interface do sistema", é uma ferramenta de
//   apoio a demonstração/desenvolvimento, executada manualmente pela linha de
//   comando, fora do fluxo normal do produto.
// - Este script é IDEMPOTENTE: se já existir algum registro "DEMO-*", ele não
//   insere novamente (evita duplicar dados a cada execução).
//
// Uso: node app/database/seed-demo-data.js
// Ou via Docker: docker compose exec backend node app/database/seed-demo-data.js
//
// Para remover os dados de demonstração depois, rode com --clean:
//   node app/database/seed-demo-data.js --clean

const { crmPool } = require('./connection');

async function alreadySeeded() {
  const result = await crmPool.query(
    `SELECT COUNT(*)::int AS count FROM customers WHERE uniplus_id LIKE 'DEMO-%'`
  );
  return result.rows[0].count > 0;
}

async function cleanDemoData() {
  console.log('Removendo dados de demonstração (prefixo DEMO-)...');

  // A ordem respeita as chaves estrangeiras (filhos antes dos pais).
  await crmPool.query(`
    DELETE FROM messages WHERE customer_id IN (SELECT id FROM customers WHERE uniplus_id LIKE 'DEMO-%')
  `);
  await crmPool.query(`
    DELETE FROM conversations WHERE customer_id IN (SELECT id FROM customers WHERE uniplus_id LIKE 'DEMO-%')
  `);
  await crmPool.query(`
    DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE uniplus_id LIKE 'DEMO-%')
  `);
  await crmPool.query(`DELETE FROM sales WHERE uniplus_id LIKE 'DEMO-%'`);
  await crmPool.query(`
    DELETE FROM customer_tags WHERE customer_id IN (SELECT id FROM customers WHERE uniplus_id LIKE 'DEMO-%')
  `);
  await crmPool.query(`DELETE FROM customers WHERE uniplus_id LIKE 'DEMO-%'`);
  await crmPool.query(`DELETE FROM products WHERE uniplus_id LIKE 'DEMO-%'`);
  await crmPool.query(`DELETE FROM sellers WHERE uniplus_seller_id LIKE 'DEMO-%'`);
  await crmPool.query(`DELETE FROM tags WHERE name LIKE 'Demo: %'`);

  console.log('✓ Dados de demonstração removidos.');
}

async function seed() {
  console.log('Inserindo dados de demonstração...\n');

  // --- Tags ---
  const tagNames = ['Demo: VIP', 'Demo: Aniversariante do mês', 'Demo: Atendimento recente'];
  const tagIds = {};
  for (const name of tagNames) {
    const result = await crmPool.query(
      `INSERT INTO tags (name) VALUES ($1) RETURNING id`,
      [name]
    );
    tagIds[name] = result.rows[0].id;
  }
  console.log(`✓ ${tagNames.length} tags de demonstração criadas`);

  // --- Vendedores ---
  const sellers = [
    { name: 'Ana Paula Ferreira', whatsapp: '+55 11 91234-5001', uniplusId: 'DEMO-SELLER-001' },
    { name: 'Carlos Eduardo Souza', whatsapp: '+55 11 91234-5002', uniplusId: 'DEMO-SELLER-002' },
    { name: 'Juliana Martins', whatsapp: '+55 11 91234-5003', uniplusId: 'DEMO-SELLER-003' },
  ];
  const sellerIds = [];
  for (const s of sellers) {
    const result = await crmPool.query(
      `INSERT INTO sellers (name, whatsapp_phone, uniplus_seller_id) VALUES ($1, $2, $3) RETURNING id`,
      [s.name, s.whatsapp, s.uniplusId]
    );
    sellerIds.push(result.rows[0].id);
  }
  console.log(`✓ ${sellers.length} vendedores de demonstração criados`);

  // --- Produtos ---
  const products = [
    { name: 'Tênis Esportivo Runner', category: 'Calçados', price: 259.9, uniplusId: 'DEMO-PROD-001' },
    { name: 'Camiseta Dry Fit', category: 'Vestuário', price: 79.9, uniplusId: 'DEMO-PROD-002' },
    { name: 'Mochila Urbana 20L', category: 'Acessórios', price: 189.9, uniplusId: 'DEMO-PROD-003' },
    { name: 'Boné Aba Curva', category: 'Acessórios', price: 59.9, uniplusId: 'DEMO-PROD-004' },
  ];
  const productIds = [];
  for (const p of products) {
    const result = await crmPool.query(
      `INSERT INTO products (uniplus_id, name, category, price, active) VALUES ($1, $2, $3, $4, true) RETURNING id`,
      [p.uniplusId, p.name, p.category, p.price]
    );
    productIds.push(result.rows[0].id);
  }
  console.log(`✓ ${products.length} produtos de demonstração criados`);

  // --- Clientes ---
  // Datas relativas a hoje, para demonstrar diferentes faixas de RFM quando o
  // Administrador configurar os critérios e rodar o recálculo.
  const now = new Date();
  const daysAgo = (n) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  const customers = [
    { name: 'Fernanda Lima', phone: '+5511987650001', email: 'fernanda.lima@example.com', lastPurchase: daysAgo(5), avgTicket: 420.0, uniplusId: 'DEMO-CUST-001', tags: ['Demo: VIP'] },
    { name: 'Roberto Alves', phone: '+5511987650002', email: 'roberto.alves@example.com', lastPurchase: daysAgo(12), avgTicket: 310.0, uniplusId: 'DEMO-CUST-002', tags: ['Demo: VIP'] },
    { name: 'Mariana Costa', phone: '+5511987650003', email: 'mariana.costa@example.com', lastPurchase: daysAgo(45), avgTicket: 150.0, uniplusId: 'DEMO-CUST-003', tags: ['Demo: Aniversariante do mês'] },
    { name: 'Bruno Henrique', phone: '+5511987650004', email: 'bruno.henrique@example.com', lastPurchase: daysAgo(90), avgTicket: 95.0, uniplusId: 'DEMO-CUST-004', tags: [] },
    { name: 'Patrícia Nunes', phone: '+5511987650005', email: 'patricia.nunes@example.com', lastPurchase: daysAgo(150), avgTicket: 60.0, uniplusId: 'DEMO-CUST-005', tags: ['Demo: Atendimento recente'] },
    { name: 'Diego Ramos', phone: '+5511987650006', email: 'diego.ramos@example.com', lastPurchase: null, avgTicket: null, uniplusId: 'DEMO-CUST-006', tags: [] },
    { name: 'Camila Rocha', phone: '+5511987650007', email: 'camila.rocha@example.com', lastPurchase: daysAgo(2), avgTicket: 510.0, uniplusId: 'DEMO-CUST-007', tags: ['Demo: VIP'] },
    { name: 'Thiago Batista', phone: '+5511987650008', email: 'thiago.batista@example.com', lastPurchase: daysAgo(200), avgTicket: 40.0, uniplusId: 'DEMO-CUST-008', tags: [] },
  ];

  const customerIds = [];
  for (const c of customers) {
    const result = await crmPool.query(
      `INSERT INTO customers
        (uniplus_id, name, phone_e164, whatsapp_validated, email, last_purchase_at, first_purchase_at, average_ticket, synced_at, created_at, updated_at)
       VALUES ($1, $2, $3, true, $4, $5, $5, $6, NOW(), NOW(), NOW())
       RETURNING id`,
      [c.uniplusId, c.name, c.phone, c.email, c.lastPurchase, c.avgTicket]
    );
    const customerId = result.rows[0].id;
    customerIds.push(customerId);

    for (const tagName of c.tags) {
      await crmPool.query(
        `INSERT INTO customer_tags (customer_id, tag_id) VALUES ($1, $2)`,
        [customerId, tagIds[tagName]]
      );
    }
  }
  console.log(`✓ ${customers.length} clientes de demonstração criados`);

  // --- Vendas (algumas vinculadas a clientes, algumas sem cliente — para o
  // relatório "vendas sem cliente identificado") ---
  let saleCounter = 1;
  const makeSale = async (customerId, sellerId, saleDate, totalAmount) => {
    const uniplusId = `DEMO-SALE-${String(saleCounter).padStart(4, '0')}`;
    saleCounter += 1;
    const result = await crmPool.query(
      `INSERT INTO sales (uniplus_id, customer_id, seller_id, sale_date, total_amount, synced_at, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id`,
      [uniplusId, customerId, sellerId, saleDate, totalAmount]
    );
    return result.rows[0].id;
  };

  // 2-3 vendas para os clientes com last_purchase_at preenchido, usando produtos aleatórios.
  let salesCreated = 0;
  for (let i = 0; i < customers.length; i += 1) {
    const c = customers[i];
    if (!c.lastPurchase) continue; // cliente "Diego Ramos" fica sem nenhuma compra (demonstra estado "inativo/sem dados")

    const numSales = 1 + (i % 3); // varia 1 a 3 vendas por cliente
    for (let n = 0; n < numSales; n += 1) {
      const saleDate = new Date(c.lastPurchase.getTime() - n * 20 * 24 * 60 * 60 * 1000);
      const sellerId = sellerIds[i % sellerIds.length];
      const saleId = await makeSale(customerIds[i], sellerId, saleDate, c.avgTicket || 100);
      salesCreated += 1;

      // Associa 1-2 itens de produto à venda.
      const productId = productIds[(i + n) % productIds.length];
      await crmPool.query(
        `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)`,
        [saleId, productId, 1, c.avgTicket || 100]
      );
    }
  }

  // 2 vendas SEM cliente vinculado, para popular o relatório "vendas sem cliente identificado".
  await makeSale(null, sellerIds[0], daysAgo(3), 145.9);
  await makeSale(null, sellerIds[1], daysAgo(10), 89.9);
  salesCreated += 2;

  console.log(`✓ ${salesCreated} vendas de demonstração criadas (incluindo 2 sem cliente vinculado)`);

  // --- Conversa + mensagens de exemplo (para a aba "Histórico" da ficha do cliente) ---
  const firstCustomerId = customerIds[0];
  const conversationResult = await crmPool.query(
    `INSERT INTO conversations (customer_id, status, last_message_at, created_at)
     VALUES ($1, 'answered', NOW(), NOW())
     RETURNING id`,
    [firstCustomerId]
  );
  const conversationId = conversationResult.rows[0].id;

  await crmPool.query(
    `INSERT INTO messages (conversation_id, customer_id, direction, body, trigger_source, status, sent_at, created_at)
     VALUES
       ($1, $2, 'outbound', 'Olá Fernanda! Obrigado pela sua compra 😊 Qualquer dúvida, estamos à disposição.', 'manual', 'delivered', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
       ($1, $2, 'inbound', 'Obrigada, adorei o atendimento!', 'customer', 'read', NOW() - INTERVAL '5 days' + INTERVAL '2 hours', NOW() - INTERVAL '5 days' + INTERVAL '2 hours')`,
    [conversationId, firstCustomerId]
  );
  console.log('✓ Conversa e mensagens de demonstração criadas para 1 cliente (linha do tempo)');

  console.log('\n✓ Dados de demonstração inseridos com sucesso!');
  console.log('  Lembre-se: esses dados são fictícios (prefixo "DEMO-") e devem ser removidos');
  console.log('  antes de qualquer uso em produção, rodando: node app/database/seed-demo-data.js --clean');
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('✗ Este script não pode ser executado em produção (NODE_ENV=production). Abortando.');
    process.exit(1);
  }

  try {
    const cleanMode = process.argv.includes('--clean');

    if (cleanMode) {
      await cleanDemoData();
      process.exit(0);
    }

    if (await alreadySeeded()) {
      console.log('Dados de demonstração já existem (registros com prefixo "DEMO-" encontrados).');
      console.log('Nada foi inserido. Para recriar do zero, rode primeiro:');
      console.log('  node app/database/seed-demo-data.js --clean');
      process.exit(0);
    }

    await seed();
    process.exit(0);
  } catch (err) {
    console.error('\n✗ Erro ao inserir dados de demonstração:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await crmPool.end();
  }
}

main();
