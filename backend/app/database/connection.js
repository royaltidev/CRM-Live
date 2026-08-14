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

crmPool.on('error', (err) => {
  console.error('Erro não tratado no pool CRM Live:', err);
  process.exit(-1);
});

// Pool de conexão com o banco do Uniplus (somente-leitura) — TROCÁVEL em
// tempo real (escopo novo, 14/08/2026): os dados de conexão passaram a
// morar em `system_settings` (editáveis pelo Admin na tela de
// Configurações, "Trocar Servidor"), não mais fixos em `settings.js`. Um
// objeto `Pool` do `pg` não permite alterar host/porta/usuário depois de
// criado, então `uniplusPool` aqui é um Proxy que sempre encaminha pra
// `currentUniplusPool` — o valor real é substituído por `rebuildUniplusPool`
// sem precisar reiniciar o backend, e todo o resto do código (só
// `uniplus.repository.js` usa isso) continua chamando `uniplusPool.query(...)`
// sem nenhuma mudança.
function attachUniplusErrorHandler(pool) {
  pool.on('error', (err) => {
    console.error('Erro não tratado no pool Uniplus:', err);
    // Não interrompe o processo: o Uniplus é somente-leitura e sua falha não
    // deve derrubar a aplicação, só impedir sincronização. Logs de erro são
    // suficientes para diagnóstico.
  });
}

let currentUniplusPool = new Pool({
  host: settings.uniplusDatabase.host,
  port: settings.uniplusDatabase.port,
  database: settings.uniplusDatabase.database,
  user: settings.uniplusDatabase.user,
  password: settings.uniplusDatabase.password,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
attachUniplusErrorHandler(currentUniplusPool);

const uniplusPool = new Proxy(
  {},
  {
    get(target, prop) {
      const value = currentUniplusPool[prop];
      return typeof value === 'function' ? value.bind(currentUniplusPool) : value;
    },
  }
);

// Substitui o pool do Uniplus por um novo, com os dados de conexão
// informados — usado pela tela de Configurações ("Trocar Servidor") para
// aplicar uma troca de servidor SEM reiniciar o backend. O pool antigo é
// encerrado de forma assíncrona (não bloqueia a resposta da requisição que
// disparou a troca); erros ao encerrar o pool antigo são só logados, nunca
// lançados (ele já está sendo substituído de qualquer forma).
function rebuildUniplusPool({ host, port, database, user, password }) {
  const oldPool = currentUniplusPool;

  currentUniplusPool = new Pool({
    host,
    port,
    database,
    user,
    password,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  attachUniplusErrorHandler(currentUniplusPool);

  oldPool.end().catch((err) => {
    console.error('Erro ao encerrar o pool anterior do Uniplus (ignorado, já substituído):', err.message);
  });
}

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

// Testa um conjunto de dados de conexão do Uniplus SEM afetar o pool ativo
// — usado por "Trocar Servidor" (Configurações) pra validar antes de
// salvar/aplicar, num pool descartável próprio. Nunca lança: erro vira
// `{ success: false, message }`.
async function testUniplusConnectionCandidate({ host, port, database, user, password }) {
  const candidatePool = new Pool({
    host,
    port,
    database,
    user,
    password,
    max: 1,
    connectionTimeoutMillis: 5000,
  });
  // Erros de conexão recusada, se emitidos de forma assíncrona pelo pool
  // após a falha do connect() abaixo, não devem derrubar o processo.
  candidatePool.on('error', () => {});

  try {
    const client = await candidatePool.connect();
    client.release();
    return { success: true, message: 'Conexão estabelecida com sucesso.' };
  } catch (err) {
    return { success: false, message: err.message };
  } finally {
    candidatePool.end().catch(() => {});
  }
}

// Exports.
module.exports = {
  crmPool,
  uniplusPool,
  rebuildUniplusPool,
  testConnection,
  testUniplusConnectionCandidate,

  // Funções de conveniência para queries diretas ao CRM Live.
  queryAsync: (sql, params) => crmPool.query(sql, params),
  getAsync: (sql, params) => crmPool.query(sql, params).then((res) => res.rows[0]),
  allAsync: (sql, params) => crmPool.query(sql, params).then((res) => res.rows),

  // Função para encerrar gracefully os pools.
  async disconnect() {
    await crmPool.end();
    await currentUniplusPool.end();
  },
};
