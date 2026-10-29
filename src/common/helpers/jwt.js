const jwt = require('jsonwebtoken');

function generateJWT({ payload, type = 'access' }) {
  const config = {
    access: {
      secret: process.env.ACCESS_SECRET,
      expiresIn: '15m',
    },
    refresh: {
      secret: process.env.REFRESH_SECRET,
      expiresIn: '7d',
    },
  };

  const { secret, expiresIn } = config[type] || config.access;
  if (!secret) {
    throw new Error(`JWT Secret for ${type} is not configured`);
  }

  return jwt.sign(payload, secret, { expiresIn });
}

function verifyJWT({ token, type = 'access' }) {
  const config = {
    access: process.env.ACCESS_SECRET,
    refresh: process.env.REFRESH_SECRET,
  };

  const secret = config[type] || config.access;
  if (!secret) {
    throw new Error(`JWT Secret for ${type} is not configured`);
  }

  return jwt.verify(token, config[type]);
}

module.exports = { generateJWT, verifyJWT };
