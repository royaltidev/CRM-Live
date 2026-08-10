// Ferramenta de mapeamento de schema do Uniplus (Fase 4 — docs/PLANO.md).
//
// Uso somente leitura: nunca executa INSERT/UPDATE/DELETE/DDL no banco do Uniplus.
// Lê apenas metadados via information_schema (tabelas e colunas).
//
// Lê a conexão de backend/app/config/settings.js (uniplusDatabase) por padrão,
// ou de variáveis de ambiente UNIPLUS_HOST / UNIPLUS_PORT / UNIPLUS_DB /
// UNIPLUS_USER / UNIPLUS_PASSWORD / UNIPLUS_SCHEMA, se definidas (útil para
// testes pontuais sem gravar credenciais em disco).
//
// Comandos:
//   node app/integrations/uniplus/schema-explorer.js tables
//     -> lista todas as tabelas do schema, em Markdown, como checklist.
//
//   node app/integrations/uniplus/schema-explorer.js columns <nome_da_tabela>
//     -> lista colunas + tipos de dado da tabela informada, em Markdown, como checklist.
//
//   node app/integrations/uniplus/schema-explorer.js columns-batch <tabela1,tabela2,...>
//     -> roda "columns" para cada tabela da lista (separadas por vírgula, sem espaço),
//        uma seção Markdown por tabela. Útil para redirecionar tudo a um único arquivo:
//        node app/integrations/uniplus/schema-explorer.js columns-batch dav,davitem,entidade \
//          > ../docs/uniplus-schema/03-colunas-tabelas-selecionadas.md
//
//   node app/integrations/uniplus/schema-explorer.js sample-tipowhatsapp
//     -> diagnóstico pontual de entidade.tipowhatsapp (distribuição de valores +
//        3 exemplos com telefone MASCARADO). Não salvar a saída em arquivo do
//        repositório — contém dado pessoal, mesmo que mascarado.

const { Client } = require('pg');

function loadConnectionConfig() {
  if (process.env.UNIPLUS_HOST) {
    return {
      host: process.env.UNIPLUS_HOST,
      port: Number(process.env.UNIPLUS_PORT || 5432),
      database: process.env.UNIPLUS_DB,
      user: process.env.UNIPLUS_USER,
      password: process.env.UNIPLUS_PASSWORD,
      schema: process.env.UNIPLUS_SCHEMA || 'public',
    };
  }
  const settings = require('../../config/settings');
  return {
    host: settings.uniplusDatabase.host,
    port: settings.uniplusDatabase.port,
    database: settings.uniplusDatabase.database,
    user: settings.uniplusDatabase.user,
    password: settings.uniplusDatabase.password,
    schema: settings.uniplusDatabase.schema || 'public',
  };
}

async function listTables(client, schema) {
  const { rows } = await client.query(
    `SELECT table_name, table_type
       FROM information_schema.tables
      WHERE table_schema = $1
      ORDER BY table_name`,
    [schema]
  );
  console.log(`# Tabelas do schema "${schema}" (${rows.length} encontradas)\n`);
  for (const row of rows) {
    const tipo = row.table_type === 'VIEW' ? ' (view)' : '';
    console.log(`- [ ] ${row.table_name}${tipo}`);
  }
}

async function listColumns(client, schema, tableName) {
  const { rows } = await client.query(
    `SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
       FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position`,
    [schema, tableName]
  );
  if (rows.length === 0) {
    console.log(`Nenhuma coluna encontrada para "${schema}.${tableName}". A tabela existe nesse schema?`);
    return;
  }
  console.log(`# Colunas de "${tableName}" (${rows.length} encontradas)\n`);
  console.log('| Usar? | Coluna | Tipo | Nulo? | Default |');
  console.log('| --- | --- | --- | --- | --- |');
  for (const row of rows) {
    const tipo = row.character_maximum_length
      ? `${row.data_type}(${row.character_maximum_length})`
      : row.data_type;
    console.log(`| [ ] | ${row.column_name} | ${tipo} | ${row.is_nullable} | ${row.column_default || ''} |`);
  }
}

// Consulta pontual e exploratória para entender o significado real de
// entidade.tipowhatsapp — NÃO expõe telefone completo (mascara o meio do
// número) por ser dado pessoal (LGPD). Uso único de diagnóstico, não faz
// parte do fluxo de sincronização.
async function sampleTipoWhatsapp(client, schema) {
  const counts = await client.query(
    `SELECT tipowhatsapp, COUNT(*) AS total
       FROM ${schema}.entidade
      GROUP BY tipowhatsapp
      ORDER BY total DESC`
  );
  console.log('# Distribuição de entidade.tipowhatsapp\n');
  console.log('| tipowhatsapp | quantidade de registros |');
  console.log('| --- | --- |');
  for (const row of counts.rows) {
    console.log(`| ${row.tipowhatsapp === null ? 'NULL' : row.tipowhatsapp} | ${row.total} |`);
  }

  const samples = await client.query(
    `SELECT id, tipowhatsapp,
            CASE WHEN whatsapp IS NOT NULL AND whatsapp <> ''
                 THEN LEFT(whatsapp, 4) || '...' || RIGHT(whatsapp, 2)
                 ELSE NULL END AS whatsapp_mascarado
       FROM ${schema}.entidade
      WHERE tipowhatsapp IS NOT NULL
      ORDER BY id
      LIMIT 3`
  );
  console.log('\n# Amostra (telefone mascarado — LGPD)\n');
  console.log('| id | tipowhatsapp | whatsapp (mascarado) |');
  console.log('| --- | --- | --- |');
  for (const row of samples.rows) {
    console.log(`| ${row.id} | ${row.tipowhatsapp} | ${row.whatsapp_mascarado || '(vazio)'} |`);
  }
}

async function main() {
  const [, , command, arg] = process.argv;
  const config = loadConnectionConfig();
  const client = new Client({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    connectionTimeoutMillis: 8000,
  });

  await client.connect();
  try {
    // Garante que esta sessão de banco não pode escrever, mesmo por engano
    // (defesa em profundidade além do usuário de banco já ser somente leitura).
    await client.query('SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY');

    if (command === 'tables') {
      await listTables(client, config.schema);
    } else if (command === 'columns') {
      if (!arg) {
        console.error('Uso: node schema-explorer.js columns <nome_da_tabela>');
        process.exitCode = 1;
      } else {
        await listColumns(client, config.schema, arg);
      }
    } else if (command === 'columns-batch') {
      if (!arg) {
        console.error('Uso: node schema-explorer.js columns-batch <tabela1,tabela2,...>');
        process.exitCode = 1;
      } else {
        const tableNames = arg.split(',').map((t) => t.trim()).filter(Boolean);
        console.log(`# Colunas das tabelas selecionadas — Fase 4 (Uniplus)\n`);
        for (const tableName of tableNames) {
          await listColumns(client, config.schema, tableName);
          console.log('');
        }
      }
    } else if (command === 'sample-tipowhatsapp') {
      await sampleTipoWhatsapp(client, config.schema);
    } else {
      console.error('Comando desconhecido. Use "tables", "columns <tabela>", "columns-batch <tabelas>" ou "sample-tipowhatsapp".');
      process.exitCode = 1;
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Falha ao consultar o banco do Uniplus:', err.message);
  process.exitCode = 1;
});
