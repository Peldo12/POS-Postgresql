const crypto = require('node:crypto');

async function create(password) {
  const salt = crypto.randomBytes(16);

  const derivedKey = await new Promise((resolve, reject) => {
    crypto.argon2(
      'argon2id',
      {
        message: password,
        nonce: salt,
        parallelism: 4,
        tagLength: 32,
        memory: 65536, // 64 MB
        passes: 3,
      },
      (err, key) => {
        if (err) reject(err);
        else resolve(key);
      }
    );
  });

  return salt.toString('hex') + ':' + derivedKey.toString('hex');
}

async function verify(password, stored) {
  const [saltHex, hashHex] = stored.split(':');
  const salt = Buffer.from(saltHex, 'hex');
  const storedHash = Buffer.from(hashHex, 'hex');

  const testHash = await new Promise((resolve, reject) => {
    crypto.argon2(
      'argon2id',
      {
        message: password,
        nonce: salt,
        parallelism: 4,
        tagLength: 32,
        memory: 65536,
        passes: 3,
      },
      (err, key) => {
        if (err) reject(err);
        else resolve(key);
      }
    );
  });

  return crypto.timingSafeEqual(storedHash, testHash);
}

module.exports = { create, verify };
