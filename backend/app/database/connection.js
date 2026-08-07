// Módulo de conexão com PostgreSQL.
//
// Exporta dois pools de conexão:
// - crmPool: conexão com o banco próprio do CRM Live (leitura e escrita)
// - uniplusPool: conexão somente-leitura com o banco do Uniplus
//
// Ver docs/FSD.md, seção 5.5 e seção 11.3 para as regras de segurança.

const { Pool } = require('pg');
const settings = require('../config/settings');

// Pool de conexão com o banco próprio do CRM Live (leitura/escrita).
const crmPool = new Pool({
  host: settings.crmDatabase.host,
  port: settings.crmDatabase.port,
  database: settings.crmDatabase.database,
  user: settings.crmDatabase.user,
  password: settings.crmDatabase.password,
  max: 10, // número máximo de conexões simultâneas
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Pool de conexão com o banco do Uniplus (somente-leitura).
// O usuário do banco foi configurado com permissão apenas de SELECT,
// então qualquer tentativa de escrita resultará em erro do banco.
const uniplusPool = new Pool({
  host: settings.uniplusDatabase.host,
  port: settings.uniplusDatabase.port,
  database: settings.uniplusDatabase.database,
  user: settings.uniplusDatabase.user,
  password: settings.uniplusDatabase.password,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Trata erros de conexão para ambos os pools.
crmPool.on('error', (err) => {
  console.error('Erro não tratado no pool CRM Live:', err);
  process.exit(-1);
});

uniplusPool.on('error', (err) => {
  console.error('Erro não tratado no pool Uniplus:', err);
  // Não interrompe o processo: o Uniplus é somente-leitura e sua falha não
  // deve derrubar a aplicação, só impedir sincronização. Logs de erro são
  // suficientes para diagnóstico.
});

// Função auxiliar para testar a conexão.
async function testConnection(pool, name) {
  try {
    const client = await pool.connect();
    console.log(`✓ Conexão com ${name} bem-sucedida`);
    client.release();
    return true;
  } catch (err) {
    console.error(`✗ Falha ao conectar com ${name}:`, err.message);
    return false;
  }
}

// Exports.
module.exports = {
  crmPool,
  uniplusPool,
  testConnection,

  // Funções de conveniência para queries diretas ao CRM Live.
  queryAsync: (sql, params) => crmPool.query(sql, params),
  getAsync: (sql, params) => crmPool.query(sql, params).then((res) => res.rows[0]),
  allAsync: (sql, params) => crmPool.query(sql, params).then((res) => res.rows),

  // Função para encerrar gracefully os pools.
  async disconnect() {
    await crmPool.end();
    await uniplusPool.end();
  },
};
