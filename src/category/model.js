const pool = require('../config/pool');

async function getCategories(options) {
  const { deleted = false } = options;
  let sql = `
    SELECT 
      id, name, description
    FROM categories
    WHERE deleted_at`;

  if (deleted) {
    sql += ' NOT NULL';
  } else {
    sql += ' IS NULL';
  }
  const { rows } = await pool.query(sql);
  return rows;
}

async function getCategoryIdentifier(options) {
  const { id, name } = options;
  let sql = `
    SELECT 
      id, name, description
    FROM categories
    WHERE deleted_at IS NULL`;
  const params = [];

  if (id) {
    params.push(id);
    sql += ` AND id = $${params.length}`;
  }
  if (name) {
    params.push(`%${name}%`);
    sql += ` AND name ILIKE $${params.length}`;
  }

  const { rows } = await pool.query(sql, params);
  return rows[0];
}

async function createCategory(options) {
  const { name, description } = options;

  const sql =
    'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING id, name, description';
  const { rows } = await pool.query(sql, [name, description]);
  return rows;
}

async function updateCategory(options) {
  const { name, description, id } = options;
  const sql =
    'UPDATE categories SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING id, name, description';
  const { rows } = await pool.query(sql, [name, description, id]);
  return rows;
}

async function removeOrRestoreCategory(options) {
  const { id, value = null } = options;
  const sql =
    'UPDATE categories SET deleted_at = $1 WHERE id = $2 RETURNING id, name, description';
  const { rows } = await pool.query(sql, [value, id]);
  return rows[0];
}

module.exports = {
  getCategories,
  getCategoryIdentifier,
  createCategory,
  updateCategory,
  removeOrRestoreCategory,
};
