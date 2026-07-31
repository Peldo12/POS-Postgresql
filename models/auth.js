const pool = require('../config/pool')
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const tokenExpired = require("../constants/tokenExpired");

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
    [username, email],
  );
  return rows[0];
}

async function registerUser(data) {
  const client = await pool.connect();
  try {
    const { username, email, password } = data;
    const hashed = await bcrypt.hash(password, 10);
    await client.query("BEGIN");
    const { rows } = await client.query(
      `
      INSERT INTO users 
      (username, email, password)
      VALUES
      ($1, $2, $3)
      RETURNING id, username, role_id
    `,
      [username, email, hashed],
    );

    const user = rows[0];
    const emailToken = crypto.randomBytes(32).toString("hex");

    const type = "EMAIL_VERIFY";
    await client.query(
      `
      INSERT INTO user_tokens
      (user_id, token, type, expired_at)
      VALUES
      ($1, $2, $3, $4)
    `,
      [user.id, emailToken, type, tokenExpired[type]],
    );
    await client.query("COMMIT");
    return {
      id: user.id,
      username: user.username,
      role_id: user.role_id,
      emailToken,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.release();
  }
}

async function userByToken(type, token) {
  const { rows } = await pool.query(
    `
    SELECT user_id, token, used_at
    FROM user_tokens 
    WHERE token = $1 
      AND type = $2`,
    [token, type],
  );

  return rows[0];
}

async function userByIdentifier(value) {
  const {rows} = await pool.query(
    `SELECT
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
    [value],
  );
  return rows[0];
}

async function createOrUpdateToken(id, token, type) {
  const client = await pool.connect();
  try {
    if (!id || token === undefined || !type)
      throw new Error("Value still missing on create or update token");
    await client.query("BEGIN");
    if (token) {
      await client.query(
        `
        UPDATE users
        SET 
          last_login_at = NOW()
        WHERE id = $1
      `,
        [id],
      );
    }
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
      [token, type, id, tokenExpired[type]],
    );

    await client.query("COMMIT");
    return rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.release();
  }
}

async function updateUserVerify(id) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
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
      [id],
    );

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
      [rows[0].id, "EMAIL_VERIFY"],
    );

    await client.query("COMMIT");
    const user = rows[0];
    return {
      username: user.username,
      role_id: user.role_id,
      email_verified_at: user.email_verified_at,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.release();
  }
}

async function updateUserPass(id, password) {
  const client = await pool.connect();
  try {
    const hashed = await bcrypt.hash(password, 10);
    await client.query("BEGIN");
    const { rows } = await client.query(
      `
      UPDATE users 
      SET password = $1 
      WHERE id = $2
      RETURNING id, username, role_id
    `,
      [hashed, id],
    );

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
      [rows[0].id, "PASSWORD_RESET"],
    );
    await client.query("COMMIT");

    return rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
  } finally {
    await client.release();
  }
}

module.exports = {
  userByUsernameOrEmail,
  registerUser, 
  userByToken, 
  userByIdentifier,
  createOrUpdateToken, 
  updateUserVerify, 
  updateUserPass 
}