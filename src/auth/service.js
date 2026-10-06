const bcrypt = require('bcryptjs');
const model = require('./model');
const redis = require('./redis');
const dateNow = require('../common/helpers/date');
const sendEmail = require('../common/helpers/email');
const hash = require('../common/helpers/hash');
const generateToken = require('../common/helpers/token');
const template = require('../common/utils/template.js');
const { pool } = require('../config/pool');
const AppError = require('../common/utils/AppError');

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

async function removeToken(key) {
  try {
    await redis.remove(key);
  } catch (error) {
    throw error;
  }
}

async function register(options) {
  const client = await pool.connect();
  const { username, email, password } = options;

  const found = await model.userByUsernameOrEmail(options);
  if (found) {
    const params = [];
    if (found.username === username) {
      params.push('Username');
    }
    if (found.email === email) {
      params.push('Email');
    }
    const current = params.length > 1 ? params.join(' & ') : params.join('');
    throw new AppError(409, `${current} already registered`);
  }

  // PostgreSQL Transaction
  let user;
  try {
    const hashed = await hash.create(password);
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
  await saveAndSendToken({ id: user.id, email });

  return {
    username: user.username,
    role_id: user.role_id,
  };
}

async function saveAndSendToken({ id, email }) {
  let emailToken;
  let key;
  try {
    const result = await redis.create({ id });
    emailToken = result.split(':')[1];
    key = `email-token:${emailToken}`;
  } catch (error) {
    await redis.remove(key);
    throw error;
  }
  await sendToken({
    key,
    email,
    subject: 'Verify your email',
    type: 'email',
  });
}

async function isUser({ username, password }, resend) {
  try {
    const found = await model.userByIdentifier(username);
    if (!found) throw new AppError(404, 'Username or email not registered');
    if (found.deleted_at)
      throw new AppError(403, 'Your account was deleted, contact admin');
    if (!found.email_verified_at && !resend)
      throw new AppError(401, 'Your email not yet verified');
    const match = await hash.verify(password, found.password);
    if (!match) throw new AppError(401, 'Invalid Credentials');

    const payload = {
      id: found.id,
      username,
      email_verified_at: found.email_verified_at,
      role: found.role,
      login_at: dateNow(),
      generated_at: dateNow('iso'),
    };

    const { id, accessToken, refreshToken } = await access(payload, found.id);

    return {
      id,
      accessToken,
      refreshToken,
      email: found.email,
    };
  } catch (error) {
    throw error;
  }
}

async function access(payload, id) {
  const accessToken = generateToken({ payload });
  const refreshToken = generateToken({
    payload,
    type: 'refresh',
  });
  await createToken({
    id,
    token: refreshToken,
    type: 'REFRESH_TOKEN',
  });
  return { id, accessToken, refreshToken };
}

async function sendToken(options) {
  const { key, email, type, subject } = options;
  try {
    await sendEmail({
      email,
      subject,
      html: template[type](key.split(':')[1]),
    });
  } catch (error) {
    await redis.remove(key);
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

async function verifyEmail(userId, token) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const user = await model.emailVerify(client, userId);

    await client.query('COMMIT');
    await redis.remove(`email-token:${token}`);

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

async function isVerify(token) {
  const found = await redis.get(`email-token:${token}`);
  if (!found) throw new AppError(400, 'Invalid or expired token');
  const user = await model.userByIdentifier(found);

  if (user.deleted_at)
    throw new AppError(403, 'Your account was deleted, contact admin');
  if (user.email_verified_at)
    throw new AppError(401, 'Your email already verified');
  return await verifyEmail(user.id, token);
}

async function resetPass(options) {
  const client = await pool.connect();
  const { token, userId, password } = options;
  try {
    await client.query('BEGIN');
    const hashed = await bcrypt.hash(password, 10);

    const user = await model.updatePass({
      client,
      userId,
      hashed,
    });

    await client.query('COMMIT');
    await redis.remove(`pass-token:${token}`);
    return user;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.release();
  }
}

module.exports = {
  getById,
  getByIdentifier,
  getByNameOrEmail,
  byToken,
  saveToken,
  removeToken,
  register,
  saveAndSendToken,
  isUser,
  sendToken,
  createToken,
  verifyEmail,
  isVerify,
  resetPass,
};
