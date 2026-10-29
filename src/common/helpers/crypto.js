const crypto = require('crypto');

function bytes(type) {
  const listType = {
    otp: 3,
    pass: 4,
    email: 8,
  };
  if (!type) throw new Error('No type given');
  if (!listType[type]) throw new Error('Not supported type');
  return crypto.randomBytes(listType[type]).toString('hex');
}

function md5(key, value) {
  if (!key || !value) {
    throw new Error('Nothing to hash');
  }
  const hash = crypto
    .createHash('md5')
    .update(JSON.stringify(value))
    .digest('hex');
  return `${key}:${hash}`;
}

module.exports = { bytes, md5 };
