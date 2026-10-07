const crypto = require('crypto');

function generateCrypto(type) {
  const listType = {
    pass: 16,
    email: 32,
  };
  return crypto.randomBytes(listType[type]).toString('hex');
}

module.exports = generateCrypto;
