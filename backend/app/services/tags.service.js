// Serviço de tags (etiquetas aplicáveis a clientes).

const { crmPool } = require('../database/connection');

// Código do Postgres para violação de unique constraint / foreign key.
const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';

// Lista todas as tags.
async function listTags() {
  const result = await crmPool.query('SELECT id, name, created_at FROM tags ORDER BY name ASC');
  return result.rows;
}

// Cria uma nova tag.
async function createTag(name) {
  try {
    const result = await crmPool.query(
      'INSERT INTO tags (name) VALUES ($1) RETURNING id, name, created_at',
      [name]
    );
    return result.rows[0];
  } catch (err) {
    if (err.code === PG_UNIQUE_VIOLATION) {
      throw new Error('Já existe uma tag com esse nome.');
    }
    throw err;
  }
}

// Atualiza o nome de uma tag existente.
async function updateTag(id, name) {
  try {
    const result = await crmPool.query(
      'UPDATE tags SET name = $1 WHERE id = $2 RETURNING id, name, created_at',
      [name, id]
    );

    if (result.rows.length === 0) {
      throw new Error('Tag não encontrada');
    }

    return result.rows[0];
  } catch (err) {
    if (err.code === PG_UNIQUE_VIOLATION) {
      throw new Error('Já existe uma tag com esse nome.');
    }
    throw err;
  }
}

// Exclui uma tag. Falha com mensagem amigável se a tag estiver em uso
// (ON DELETE RESTRICT em customer_tags impede a exclusão nesse caso).
async function deleteTag(id) {
  try {
    const result = await crmPool.query('DELETE FROM tags WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      throw new Error('Tag não encontrada');
    }

    return true;
  } catch (err) {
    if (err.code === PG_FOREIGN_KEY_VIOLATION) {
      throw new Error('Esta tag está em uso por um ou mais clientes e não pode ser excluída. Remova a tag dos clientes antes de excluí-la.');
    }
    throw err;
  }
}

module.exports = {
  listTags,
  createTag,
  updateTag,
  deleteTag,
};
