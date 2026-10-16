const crypto = require('crypto');

function bytes(type) {
  const listType = {
    pass: 8,
    email: 16,
  };
  return crypto.randomBytes(listType[type]).toString('hex');
}

function md5(key, value) {
  if (!key || !value) throw new Error('Nothing to hash');
  const hash = crypto
    .createHash('md5')
    .update(JSON.stringify(value))
    .digest('hex');
  return `${key}:${hash}`;
}

module.exports = { bytes, md5 };
