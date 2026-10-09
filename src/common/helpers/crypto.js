const crypto = require('crypto');

function generateCrypto(type) {
  const listType = {
    pass: 8,
    email: 16,
  };
  return crypto.randomBytes(listType[type]).toString('hex');
}

module.exports = generateCrypto;
