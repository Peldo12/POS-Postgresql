const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const model = require('./model');
const pool = require('../config/pool');

async function getById(options) {
  try {
    return await model.userById(options);
  } catch (error) {
    throw error;
  }
}

async function getByIdentifier(options) {
  try {
    return await model.userByIdentifier(options);
  } catch (error) {
    throw error;
  }
}

async function getByToken(options) {
  try {
    return await model.userByToken(options);
  } catch (error) {
    throw error;
  }
}

async function getByNameOrEmail(options) {
  try {
    return await model.userByUsernameOrEmail(options);
  } catch (error) {
    throw error;
  }
}

async function register(options) {
  const client = await pool.connect();
  try {
    const { username, email, password } = options;
    const hashed = await bcrypt.hash(password, 10);
    await client.query('BEGIN');

    const user = await model.create({
      client,
      username,
      email,
      hashed
    });
    const emailToken = crypto.randomBytes(32).toString('hex');
    const type = 'EMAIL_VERIFY';
    await model.createEmailToken({
      client,
      userId: user.id,
      emailToken,
      type
    });

    await client.query('COMMIT');
    return {
      id: user.id,
      username: user.username,
      role_id: user.role_id,
      emailToken
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.release();
  }
}

async function createToken(options) {
  const client = await pool.connect();
  try {
    const { id, token, type } = options;
    if (!id || token === undefined || !type)
      throw new Error('Value still missing on create or update token');
    await client.query('BEGIN');
    if (token) await model.updateLogin(client, id);

    const result = await model.createToken({
      client,
      id,
      token,
      type
    });

    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.release();
  }
}

async function verifyEmail(userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const user = await model.emailVerify(client, userId);
    await model.updateEmailToken(client, userId);

    await client.query('COMMIT');
    return {
      username: user.username,
      role_id: user.role_id,
      email_verified_at: user.email_verified_at
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.release();
  }
}

module.exports = {
  getByNameOrEmail,
  getById,
  getByIdentifier,
  getByToken,
  register,
  createToken,
  verifyEmail
};
