const {
  redis,
  bytes,
  dateNow,
  generateJWT,
  sendEmail,
  template,
  transaction,
} = require('../config/serviceConfig');
const model = require('./model');

async function createAndSendToken({
  userId,
  email,
  type, // 'email' | 'pass'
  subject,
  ttlMinutes = 15,
}) {
  const token = bytes(type);
  const key = `${type}-token:${token}`;

  try {
    await redis.save({
      key,
      value: userId,
      options: {
        EX: ttlMinutes * 60,
      },
    });

    await sendEmail({
      email,
      subject,
      html: template[type](token),
    });
  } catch (error) {
    await redis.remove(key);
    throw error;
  }

  return token;
}

async function issueTokens(user, isRefresh = false) {
  const payload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    loginAt: isRefresh ? user.last_login_at : dateNow('iso'),
    emailVerified: user.email_verified_at,
    generatedAt: dateNow('iso'),
  };

  const accessToken = generateJWT({ payload });
  const token = generateJWT({
    payload,
    type: 'refresh',
  });

  if (!isRefresh) {
    await transaction(async (client) => {
      await model.createToken({
        client,
        id: user.id,
        token,
        type: 'REFRESH_TOKEN',
      });
    });
  }

  return {
    userId: user.id,
    accessToken,
    refreshToken: token,
  };
}

module.exports = { createAndSendToken, issueTokens };
