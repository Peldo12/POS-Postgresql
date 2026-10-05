const bcrypt = require('bcryptjs');
const model = require('./model');
const redis = require('./redis');
const sendEmail = require('../common/helpers/email');
const template = require('../common/utils/template.js');
const { pool } = require('../config/pool');

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

async function byToken(key) {
  return await redis.get(key);
}

async function saveToken(options) {
  try {
    await redis.save(options);
  } catch (error) {
    throw error;
  }
}

async function removeToken(id) {
  try {
    await redis.remove(id);
  } catch (error) {
    throw error;
  }
}

async function register(options) {
  const client = await pool.connect();

  // PostgreSQL Transaction
  let user;
  const { username, email, password } = options;
  try {
    const hashed = await bcrypt.hash(password, 10);
    await client.query('BEGIN');

    user = await model.create({
      client,
      username,
      email,
      hashed,
    });

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.release();
  }

  // External Services
  let emailToken;
  try {
    const result = await redis.create({ id: user.id });
    emailToken = result.split(':')[1];
  } catch (error) {
    await redis.remove(emailToken);
    throw error;
  }
  await sendToken({
    token: emailToken,
    email,
    subject: 'Verify your email',
    type: 'email',
  });

  return {
    id: user.id,
    username: user.username,
    role_id: user.role_id,
  };
}

async function sendToken(options) {
  const { token, email, type, subject } = options;
  try {
    await sendEmail({
      email,
      subject,
      html: template[type](token),
    });
  } catch (error) {
    await redis.remove(token);
    throw error;
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
      type,
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

    await client.query('COMMIT');
    return {
      username: user.username,
      role_id: user.role_id,
      email_verified_at: user.email_verified_at,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.release();
  }
}

async function resetPass(options) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { userId, password } = options;
    const hashed = await bcrypt.hash(password, 10);

    const user = await model.updatePass({
      client,
      userId,
      hashed,
    });
    await model.updateTokenUse({
      client,
      userId,
      type: 'PASSWORD_RESET',
    });

    await client.query('COMMIT');
    return user;
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
  byToken,
  saveToken,
  removeToken,
  register,
  sendToken,
  createToken,
  verifyEmail,
  resetPass,
};
