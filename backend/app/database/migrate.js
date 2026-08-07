#!/usr/bin/env node

// Script de execução de migrations do CRM Live.
//
// Uso: node app/database/migrate.js
// Ou via Docker: docker compose exec backend node app/database/migrate.js
//
// Este script:
// 1. Conecta ao banco próprio do CRM Live
// 2. Cria a tabela de controle schema_migrations (se não existir)
// 3. Lista todos os arquivos .js em ./migrations/
// 4. Para cada migration não executada, executa e registra
// 5. Encerra a conexão
//
// Ver docs/FSD.md, seção 11.4 para a estratégia de migrations.

const fs = require('fs');
const path = require('path');
const { crmPool } = require('./connection');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureMigrationsTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      migration_name VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;
  await crmPool.query(createTableSQL);
  console.log('✓ Tabela schema_migrations verificada');
}

async function getExecutedMigrations() {
  const result = await crmPool.query(
    'SELECT migration_name FROM schema_migrations ORDER BY executed_at'
  );
  return new Set(result.rows.map((row) => row.migration_name));
}

async function getMigrationFiles() {
  const files = fs.readdirSync(MIGRATIONS_DIR);
  return files
    .filter((f) => f.endsWith('.js') && !f.startsWith('.'))
    .sort();
}

async function executeMigration(migrationFile) {
  const migrationPath = path.join(MIGRATIONS_DIR, migrationFile);
  const migration = require(migrationPath);

  console.log(`\n▶ Executando migration: ${migrationFile}`);

  if (typeof migration.up !== 'function') {
    throw new Error(`Migration ${migrationFile} não exporta uma função 'up'`);
  }

  await migration.up(crmPool);

  // Registra a migration como executada.
  await crmPool.query(
    'INSERT INTO schema_migrations (migration_name) VALUES ($1)',
    [migrationFile]
  );

  console.log(`✓ Migration ${migrationFile} concluída`);
}

async function main() {
  try {
    console.log('CRM Live - Sistema de Migrations\n');

    console.log('1. Criando tabela de controle...');
    await ensureMigrationsTable();

    console.log('\n2. Consultando migrations já executadas...');
    const executed = await getExecutedMigrations();
    console.log(`   ${executed.size} migration(s) já executada(s)`);

    console.log('\n3. Listando migrations disponíveis...');
    const migrationFiles = await getMigrationFiles();
    console.log(`   ${migrationFiles.length} arquivo(s) de migration encontrado(s)`);

    const pending = migrationFiles.filter((f) => !executed.has(f));
    console.log(`   ${pending.length} migration(s) pendente(s)`);

    if (pending.length === 0) {
      console.log('\n✓ Banco de dados já está atualizado!');
      process.exit(0);
    }

    console.log('\n4. Executando migrations pendentes...');
    for (const migrationFile of pending) {
      await executeMigration(migrationFile);
    }

    console.log('\n✓ Todas as migrations foram executadas com sucesso!');
    process.exit(0);
  } catch (err) {
    console.error('\n✗ Erro ao executar migrations:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await crmPool.end();
  }
}

main();
