const pool = require('../config/pool');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const tokenExpired = require('../constants/tokenExpired');

async function userByUsernameOrEmail(data) {
  const { username, email } = data;
  const { rows } = await pool.query(
    `
    SELECT 
      u.id, 
      u.username, 
      u.email, 
      u.email_verified_at, 
      r.name AS role, 
      u.password,
      u.deleted_at
    FROM users u 
    JOIN roles r 
    ON r.id = u.role_id
    WHERE u.username = $1 
      OR u.email = $2`,
    [username, email]
  );
  return rows[0];
}

async function create(options) {
  const { client, username, email, hashed } = options;
  const { rows } = await client.query(
    `
      INSERT INTO users 
      (username, email, password)
      VALUES
      ($1, $2, $3)
      RETURNING id, username, role_id
    `,
    [username, email, hashed]
  );
  return rows[0];
}

async function userByToken(options) {
  const { type, token } = options;
  const { rows } = await pool.query(
    `
    SELECT user_id, token, used_at
    FROM user_tokens 
    WHERE token = $1 
      AND type = $2`,
    [token, type]
  );

  return rows[0];
}

async function userById(options) {
  const { userId, type = 'REFRESH_TOKEN' } = options;
  const { rows } = await pool.query(
    `
    SELECT
      u.id,
      u.username,
      u.email,
      u.password,
      u.email_verified_at,
      u.deleted_at,
      r.name AS role,
      t.token
    FROM users u
    JOIN roles r 
    ON r.id = u.role_id
    JOIN user_tokens t
    ON t.user_id = u.id
    WHERE u.id = $1 AND t.type = $2`,
    [userId, type]
  );
  return rows[0];
}

async function userByIdentifier(value) {
  const { rows } = await pool.query(
    `
    SELECT
      u.id,
      u.username,
      u.email,
      u.password,
      u.email_verified_at,
      u.deleted_at,
      r.name AS role
    FROM users u
    JOIN roles r 
    ON r.id = u.role_id
    WHERE (u.username = $1 OR u.email = $1)`,
    [value]
  );
  return rows[0];
}

async function updateLogin(client, id) {
  await client.query(
    `
      UPDATE users
      SET 
        last_login_at = NOW()
      WHERE id = $1
      `,
    [id]
  );
}

async function createToken(options) {
  const { client, token, type, id } = options;
  const { rows } = await client.query(
    `
      INSERT INTO user_tokens
      (token, type, user_id, expired_at)
      VALUES
      ($1, $2, $3, $4)
      ON CONFLICT (user_id, type) 
      DO UPDATE SET 
        token = EXCLUDED.token,
        expired_at = EXCLUDED.expired_at,
        used_at = NULL,
        created_at = CURRENT_TIMESTAMP
      RETURNING user_id, token, type, expired_at`,
    [token, type, id, tokenExpired[type]]
  );
  return rows[0];
}

async function emailVerify(client, userId) {
  const { rows } = await client.query(
    `
    UPDATE users 
    SET 
      email_verified_at = NOW()
    WHERE id = $1 
    RETURNING
      id,
      username, 
      email_verified_at, 
      role_id`,
    [userId]
  );
  return rows[0];
}

async function updateTokenUse(options) {
  const { client, userId, type } = options;
  await client.query(
    `
    UPDATE user_tokens 
    SET 
      used_at = NOW(),
      expired_at = NOW()
    WHERE 
      user_id = $1 
    AND 
      type = $2 
    AND
      used_at IS NULL`,
    [userId, type]
  );
}

async function updatePass(options) {
  const { client, userId, hashed } = options;
  const { rows } = await client.query(
    `
      UPDATE users 
      SET password = $1 
      WHERE id = $2
      RETURNING username, role_id
    `,
    [hashed, userId]
  );
  return rows[0];
}

module.exports = {
  userByUsernameOrEmail,
  create,
  userByToken,
  userById,
  userByIdentifier,
  updateLogin,
  createToken,
  emailVerify,
  updateTokenUse,
  updatePass,
};
