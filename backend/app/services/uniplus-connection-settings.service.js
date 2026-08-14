// Dados de conexão com o Uniplus editáveis pelo Administrador (escopo
// novo, pedido do responsável do projeto em 14/08/2026) — "Trocar
// Servidor" na tela de Configurações.
//
// Antes, host/porta/banco/usuário/senha/idfilial só existiam em
// `backend/app/config/settings.js` (arquivo local, fora do Git) — trocar
// exigia editar o arquivo e reiniciar o backend. Agora moram em
// `system_settings` (chave `uniplus_connection`), no mesmo padrão dos
// outros parâmetros administráveis do sistema (rfm_criteria,
// cross_sell_discount_percent etc.) — mudam em tempo real, sem restart,
// via `connection.js#rebuildUniplusPool`.
//
// Cuidados de segurança com a senha (pedido explícito do responsável):
// - A senha NUNCA é devolvida pra tela — `getForDisplay()` sempre omite o
//   campo, só informa `hasPassword` (true/false).
// - Editar sem informar `password` mantém a senha atual (não força o
//   Admin a redigitar toda vez que só quer trocar, por exemplo, a porta).
// - `settings.js` (arquivo) continua como FALLBACK — enquanto o Admin
//   nunca usou "Trocar Servidor", a conexão ativa é a do arquivo (como
//   sempre foi); a partir do primeiro salvamento aqui, `system_settings`
//   passa a ser a fonte de verdade.

const { crmPool, rebuildUniplusPool, testUniplusConnectionCandidate } = require('../database/connection');
const settings = require('../config/settings');

const SETTINGS_KEY = 'uniplus_connection';
const PORT_REGEX = /^\d+$/;
const FILIAL_ID_REGEX = /^\d+$/;

async function upsertSettingValue(key, value, description, updatedBy) {
  await crmPool.query(
    `INSERT INTO system_settings (key, value, description, updated_by, updated_at)
     VALUES ($1, $2::jsonb, $3, $4, NOW())
     ON CONFLICT (key) DO UPDATE
       SET value = $2::jsonb, updated_by = $4, updated_at = NOW()`,
    [key, JSON.stringify(value), description, updatedBy]
  );
}

async function getStoredConnection() {
  const result = await crmPool.query('SELECT value, updated_at FROM system_settings WHERE key = $1', [SETTINGS_KEY]);
  if (result.rows.length === 0) {
    return null;
  }
  return { ...result.rows[0].value, updatedAt: result.rows[0].updated_at };
}

// Conexão ATIVA de verdade, com senha — uso interno (montar o Pool,
// testar conectividade). Nunca expor isso a uma rota HTTP diretamente.
async function getActiveConnectionInternal() {
  const stored = await getStoredConnection();
  if (stored) {
    return {
      host: stored.host,
      port: stored.port,
      database: stored.database,
      user: stored.user,
      password: stored.password,
      filialId: stored.filialId,
      source: 'database',
    };
  }

  return {
    host: settings.uniplusDatabase.host,
    port: settings.uniplusDatabase.port,
    database: settings.uniplusDatabase.database,
    user: settings.uniplusDatabase.user,
    password: settings.uniplusDatabase.password,
    filialId: settings.uniplus && settings.uniplus.filialId,
    source: 'file',
  };
}

// Versão segura pra tela — nunca inclui a senha.
async function getForDisplay() {
  const active = await getActiveConnectionInternal();
  return {
    host: active.host,
    port: active.port,
    database: active.database,
    user: active.user,
    filialId: active.filialId,
    source: active.source,
    hasPassword: Boolean(active.password) && active.password !== 'CHANGE_ME',
  };
}

function validateInput({ host, port, database, user, filialId }) {
  if (!host || typeof host !== 'string' || !host.trim()) {
    throw new Error('Informe o host do servidor Uniplus.');
  }
  if (!PORT_REGEX.test(String(port))) {
    throw new Error('A porta deve ser um número inteiro.');
  }
  if (!database || typeof database !== 'string' || !database.trim()) {
    throw new Error('Informe o nome do banco de dados.');
  }
  if (!user || typeof user !== 'string' || !user.trim()) {
    throw new Error('Informe o usuário de conexão.');
  }
  if (!FILIAL_ID_REGEX.test(String(filialId))) {
    throw new Error('O id da filial deve ser um número inteiro.');
  }
}

// Atualiza a conexão: TESTA primeiro (pool descartável próprio, não afeta
// a conexão em uso) e só salva/aplica se o teste passar — uma tentativa
// com dado errado nunca derruba silenciosamente uma conexão que já estava
// funcionando. Aplica em tempo real (sem restart) quando bem-sucedida.
async function updateConnection({ host, port, database, user, password, filialId }, updatedBy) {
  validateInput({ host, port, database, user, filialId });

  let finalPassword = password;
  if (!finalPassword) {
    const active = await getActiveConnectionInternal();
    finalPassword = active.password;
  }

  const value = {
    host: host.trim(),
    port: Number(port),
    database: database.trim(),
    user: user.trim(),
    password: finalPassword,
    filialId: Number(filialId),
  };

  const connectionTest = await testUniplusConnectionCandidate(value);

  if (!connectionTest.success) {
    const err = new Error(`Não foi possível conectar com os dados informados: ${connectionTest.message}`);
    err.connectionTest = connectionTest;
    throw err;
  }

  await upsertSettingValue(
    SETTINGS_KEY,
    value,
    'Dados de conexão com o banco do Uniplus (host, porta, banco, usuário, senha, id da filial) — editável pelo Administrador em Configurações, "Trocar Servidor".',
    updatedBy
  );

  // Só troca o pool em uso DEPOIS de confirmar que os dados novos
  // funcionam. Mantém settings.uniplus.filialId em sincronia —
  // sync.service.js lê esse valor diretamente, e é o mesmo objeto em
  // memória (singleton do require), então a mutação já basta, sem
  // precisar alterar aquele arquivo.
  rebuildUniplusPool(value);
  if (settings.uniplus) {
    settings.uniplus.filialId = value.filialId;
  }

  return {
    ...(await getForDisplay()),
    connectionTest,
  };
}

// Chamada uma vez no boot do backend (main.js): se já existir conexão
// salva em system_settings, aplica ela por cima do que veio de
// settings.js (que continua sendo o valor inicial do Pool, criado no
// require de connection.js, antes do crmPool existir de verdade).
async function initFromStoredSettings() {
  const stored = await getStoredConnection();
  if (!stored) {
    return { applied: false };
  }

  rebuildUniplusPool(stored);
  if (settings.uniplus && stored.filialId) {
    settings.uniplus.filialId = stored.filialId;
  }

  return { applied: true };
}

module.exports = {
  getForDisplay,
  updateConnection,
  initFromStoredSettings,
};
