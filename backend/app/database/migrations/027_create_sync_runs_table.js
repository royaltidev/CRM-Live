// Tabela de registro de execução de sincronizações com o Uniplus.

module.exports = {
  async up(pool) {
    const sql = `
      CREATE TYPE sync_run_status AS ENUM (
        'running',
        'success',
        'partial_error',
        'failed'
      );

      CREATE TYPE sync_trigger AS ENUM (
        'scheduler',
        'manual'
      );

      CREATE TABLE sync_runs (
        id SERIAL PRIMARY KEY,
        started_at TIMESTAMP NOT NULL DEFAULT NOW(),
        finished_at TIMESTAMP,
        status sync_run_status NOT NULL DEFAULT 'running',
        records_imported JSONB DEFAULT '{}',
        errors JSONB,
        triggered_by sync_trigger NOT NULL DEFAULT 'scheduler'
      );

      CREATE INDEX idx_sync_runs_started_at ON sync_runs(started_at);
      CREATE INDEX idx_sync_runs_status ON sync_runs(status);
    `;

    await pool.query(sql);
  },
};
