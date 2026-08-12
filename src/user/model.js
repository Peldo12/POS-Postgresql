const pool = require("../config/pool");

async function getUsers(options) {
  const { deleted = true } = options
  let sql = `
  SELECT 
    u.id, 
    u.username, 
    u.email_verified_at,
    r.name AS role,
    u.last_login_at,
    u.deleted_at
  FROM users u 
  LEFT JOIN roles r 
  ON r.id = u.role_id
  WHERE 1=1
  `
  if (deleted) sql += ` AND u.deleted_at IS NULL`
  
  const { rows } = await pool.query(sql)
  return rows
}

async function userByIdShort(id) {
  const { rows } = await pool.query(
    `
  SELECT 
    u.id, 
    u.username, 
    u.email_verified_at,
    r.name AS role,
    u.last_login_at,
    u.deleted_at
  FROM users u 
  LEFT JOIN roles r 
  ON r.id = u.role_id
  WHERE u.id = $1
  `,
    [id]
  );
  return rows[0]
}

async function userById(id, type = "REFRESH_TOKEN") {
  const { rows } = await pool.query(
    `
  SELECT 
    u.id, 
    u.username, 
    u.email_verified_at,
    r.name AS role,
    t.token,
    u.last_login_at,
    u.deleted_at
  FROM users u 
  LEFT JOIN roles r 
  ON r.id = u.role_id
  JOIN user_tokens t
  ON t.user_id = u.id
  WHERE u.id = $1 AND t.type = $2
  `,
    [id, type],
  );
  return rows[0];
}

async function updateUser(options) {
  const {
    id, username, email, role, deleted
  } = options
  const params = []
  let sql = `
  UPDATE users 
  SET
    updated_at = NOW(), 
  `
  if (username) {
    params.push(username)
    sql += `username = $${params.length},`
  }
  
  if (email) {
    params.push(email)
    sql += `
      email = $${params.length},
      email_verified_at = NULL,
      `
  }
  
  if (role) {
    params.push(role)
    sql += `role_id = $${params.length},`
  }
  
  if (deleted) {
    params.push(deleted)
    sql += `deleted_at = $${params.length},`
  }

  params.push(id)
  sql += `WHERE id = $${params.length}`

  const {rows} = await pool.query(sql, params)
  console.log({
    sql,
    params
  })
  return rows[0]
}

module.exports = {
  getUsers,
  userByIdShort,
  userById,
  updateUser
};
