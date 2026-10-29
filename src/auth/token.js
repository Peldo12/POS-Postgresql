const {
  redis,
  bytes,
  sendEmail,
  template,
} = require('../config/serviceConfig');

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

module.exports = { createAndSendToken };
