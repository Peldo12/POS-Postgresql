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


module.exports = {
  getUsers,
  userById
};
