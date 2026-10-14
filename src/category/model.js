const { pool } = require('../config/pool');

async function getCategories(options) {
  const { id, name, deleted = false } = options;
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
  return rows;
}

async function createCategory(options) {
  const { name, description, userId } = options;

  const sql = `
    INSERT INTO 
      categories (name, description, user_id) 
    VALUES ($1, $2, $3)
    RETURNING id, name, description`;
  const { rows } = await pool.query(sql, [name, description, userId]);
  return rows;
}

async function updateCategory(options) {
  const { id, name, description, userId, value } = options;
  let params = [];
  let sql = `UPDATE 
      categories
    SET 
      updated_at = NOW()`;
  if (name) {
    params.push(name);
    sql += `, name = $${params.length}`;
  }
  if (description) {
    params.push(description);
    sql += `, description = $${params.length}`;
  }
  if (userId) {
    params.push(userId);
    sql += `, user_id = $${params.length}`;
  }
  if (value !== undefined) {
    params.push(value);
    sql += `, deleted_at = $${params.length}`;
  }
  params.push(id);
  sql += ` WHERE id = $${params.length} RETURNING id, name, description`;
  const { rows } = await pool.query(sql, params);
  return rows[0];
}

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
};
