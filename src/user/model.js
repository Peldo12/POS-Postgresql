const { pool } = require('../config/pool');
const query = require('./query');
const AppError = require('../common/utils/AppError');

async function getUsers(options) {
  const {
    page = 1,
    limit = 10,
    sort = 'createdAt',
    orderBy = 'DESC',
  } = options;
  const sortMap = {
    id: 'u.id',
    createdAt: 'u.created_at',
  };

  const offset = (page - 1) * limit;

  const { whereClause, params } = query.buildUsersFilter(options);

  let sql = `
  SELECT 
    u.id, 
    u.username, 
    u.email_verified_at,
    r.name AS role,
    u.deleted_at,
    t.token
  FROM users u 
  LEFT JOIN roles r 
  ON r.id = u.role_id
  JOIN user_tokens t
  ON t.user_id = u.id
  ${whereClause}`;

  const countUser = `
  SELECT COUNT(*) FROM users u 
  JOIN user_tokens t
  ON t.user_id = u.id
  ${whereClause}`;
  const countParams = [...params];

  if (!sortMap[sort]) {
    throw new AppError(400, 'Invalid sort column');
  }

  const direction = orderBy.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
  sql += ` ORDER BY ${sortMap[sort]} ${direction}`;
  params.push(limit, offset);
  sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

  const [{ rows: count }, { rows: items }] = await Promise.all([
    pool.query(countUser, countParams),
    pool.query(sql, params),
  ]);

  return {
    items,
    pagination: {
      page: +page,
      limit: +limit,
      total: +count[0].count,
    },
  };
}

async function updateUser(options) {
  const { id, username, email, role, deleted } = options;
  const params = [];
  let sql = `
  UPDATE users 
  SET
    updated_at = NOW(), 
  `;
  if (username) {
    params.push(username);
    sql += `username = $${params.length},`;
  }

  if (email) {
    params.push(email);
    sql += `
      email = $${params.length},
      email_verified_at = NULL,
      `;
  }

  if (role) {
    params.push(role);
    sql += `role_id = $${params.length},`;
  }

  if (deleted) {
    params.push(deleted);
    sql += `deleted_at = $${params.length},`;
  }

  params.push(id);
  sql += `WHERE id = $${params.length}`;

  const { rows } = await pool.query(sql, params);
  return rows[0];
}

module.exports = {
  getUsers,
  updateUser,
};
