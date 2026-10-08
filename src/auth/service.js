const model = require('./model');
const redis = require('./redis');
const dateNow = require('../common/helpers/date');
const sendEmail = require('../common/helpers/email');
const hash = require('../common/helpers/hash');
const generateToken = require('../common/helpers/token');
const transaction = require('../common/helpers/transaction');
const generateCrypto = require('../common/helpers/crypto');
const template = require('../common/utils/template.js');
const { pool } = require('../config/pool');
const AppError = require('../common/utils/AppError');

// ======================
// INTERNAL HELPERS
// ======================

async function saveToken({ key, value, options = {} }) {
  await redis.save({ key, value, ...options });
}

async function removeToken(key) {
  await redis.remove(key);
}

/**
 * Buat token + simpan ke Redis + kirim email
 */
async function createAndSendToken({
  userId,
  email,
  type, // 'email' | 'pass'
  subject,
  ttlMinutes = 15,
}) {
  const token = generateCrypto(type);
  const key = `${type}-token:${token}`;

  try {
    await saveToken({
      key,
      value: userId,
      options: {
        EX: ttlMinutes * 60,
        NX: true,
      },
    });

    await sendEmail({
      email,
      subject,
      html: template[type](token),
    });
  } catch (error) {
    await removeToken(key);
    throw error;
  }

  return token;
}

// ======================
// AUTH SERVICE
// ======================

/**
 * Register user baru
 */
async function register({ username, email, password }) {
  const found = await model.userByUsernameOrEmail({ username, email });
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

  const hashed = await hash.create(password);
  const user = await transaction(async (client) => {
    return await model.create({
      client,
      username,
      email,
      hashed,
    });
  });

  await createAndSendToken({
    userId: user.id,
    email,
    type: 'email',
    subject: 'Verify your email',
    ttlMinutes: 60,
  });

  return {
    userId: user.id,
  };
}

/**
 * Verify email user
 */
async function verifyEmail(token) {
  const key = `email-token:${token}`;
  const userId = await redis.get(key);
  if (!userId) throw new AppError(400, 'Invalid or expired token');

  const user = await model.userByIdentifier(userId);
  if (user.deleted_at)
    throw new AppError(403, 'Your account was deleted, contact admin');
  if (user.email_verified_at)
    throw new AppError(401, 'Your email already verified');
  const updatedUser = await transaction(async (client) => {
    return await model.verifyEmail(client, userId);
  });

  await removeToken(key);
  return {
    userId: user.id,
    username: updatedUser.username,
  };
}

/**
 * Resend verification email
 */
async function resendVerification({ username, password }) {
  const user = await model.userByIdentifier(username);

  if (!user) throw new AppError(404, 'Username or email not registered');
  if (user.deleted_at)
    throw new AppError(403, 'Your account was deleted, contact admin');
  if (user.email_verified_at)
    throw new AppError(400, 'Your email already verified');

  const match = await hash.verify(password, user.password);
  if (!match) throw new AppError(401, 'Invalid Credentials');

  await createAndSendToken({
    userId: user.id,
    email: user.email,
    type: 'email',
    subject: 'Verify your email',
    ttlMinutes: 60,
  });

  return {
    userId: user.id,
    message: 'Verification email has been resent',
  };
}

/**
 * Login
 */
async function login({ username, password }) {
  const user = await model.userByIdentifier(username);

  if (!user) throw new AppError(404, 'Username or email not registered');
  if (user.deleted_at)
    throw new AppError(403, 'Your account was deleted, contact admin');
  if (!user.email_verified_at)
    throw new AppError(401, 'Your email not yet verified');

  const match = await hash.verify(password, user.password);
  if (!match) throw new AppError(401, 'Invalid Credentials');

  return issueTokens(user);
}

/**
 * Forgot Password
 */
async function forgotPassword({ username }) {
  const user = await model.userByIdentifier(username);

  if (!user) throw new AppError(404, 'Username or email not registered');
  if (user.deleted_at)
    throw new AppError(403, 'Your account was deleted, contact admin');
  if (!user.email_verified_at)
    throw new AppError(401, 'Your email not verified');

  await createAndSendToken({
    userId: user.id,
    email: user.email,
    type: 'pass',
    subject: 'Reset your password',
    ttlMinutes: 15,
  });

  return { email: user.email, message: 'Check your email for reset password' };
}

/**
 * Reset Password
 */
async function resetPassword({ token, password }) {
  const key = `pass-token:${token}`;
  const userId = await redis.get(key);

  if (!userId) throw new AppError(400, 'Invalid or expired token');

  const user = await model.userByIdentifier(userId);

  if (user.deleted_at)
    throw new AppError(403, 'Your account was deleted, contact admin');
  if (!user.email_verified_at)
    throw new AppError(401, 'Your email not verified');

  const hashed = await hash.create(password);

  const updatedUser = await transaction(async (client) => {
    return await model.updatePass({
      client,
      userId: user.id,
      hashed,
    });
  });

  await removeToken(key);

  return updatedUser;
}

/**
 * Refresh Token
 */
async function refreshToken({ userId, refreshToken }) {
  const user = await model.userById({ userId });

  if (!user) throw new AppError(404, 'User not found');
  if (user.deleted_at)
    throw new AppError(403, 'Your account was deleted, contact admin');
  if (!user.token) throw new AppError(401, 'Please login again');
  if (user.token !== refreshToken)
    throw new AppError(403, 'Refresh token mismatch');

  return await issueTokens(user, true);
}

/**
 * Issue Access + Refresh Token
 */
async function issueTokens(user, isRefresh = false) {
  const payload = {
    id: user.id,
    username: user.username,
    email_verified_at: user.email_verified_at,
    role: user.role,
    login_at: isRefresh ? user.last_login_at : dateNow(),
    generated_at: dateNow('iso'),
  };

  const accessToken = generateToken({ payload });
  const refreshToken = generateToken({
    payload,
    type: 'refresh',
  });

  if (!isRefresh) {
    await transaction(async (client) => {
      return await model.createToken({
        client,
        id: user.id,
        token: refreshToken,
        type: 'REFRESH_TOKEN',
      });
    });
  }

  return {
    userId: user.id,
    accessToken,
    refreshToken,
  };
}

/**
 * Get user by ID (untuk /me dan logout)
 */
async function getById(options) {
  const user = await model.userById(options);
  if (!user) throw new AppError(404, 'User not found');
  if (user.deleted_at)
    throw new AppError(403, 'Your account was deleted, contact admin');
  return { user };
}

/**
 * Create / Update token (dipakai di logout juga)
 */
async function createToken(options) {
  return transaction(async (client) => {
    return model.createToken({
      client,
      ...options,
    });
  });
}

// ======================
// EXPORTS
// ======================

module.exports = {
  register,
  verifyEmail,
  resendVerification,
  login,
  forgotPassword,
  resetPassword,
  refreshToken,
  getById,
  createToken,
};
