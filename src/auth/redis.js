const { client } = require('../config/redis');
const generateCrypto = require('../common/helpers/crypto');

async function save(options) {
  try {
    const { key, value, payload } = options;

    await client.set(key, JSON.stringify(value), payload);

    return key;
  } catch (error) {
    throw error;
  }
}

async function get(key) {
  return JSON.parse(await client.get(`${key}`));
}

async function remove(key) {
  try {
    await client.del(key);

    return await get(key);
  } catch (error) {
    throw error;
  }
}

async function create(options) {
  try {
    const { id } = options;
    const key = `email-token:${generateCrypto('email')}`;

    return await save({
      key,
      value: `${id}`,
      payload: {
        EX: 60 * 60,
      },
    });
  } catch (error) {
    throw error;
  }
}

module.exports = { save, get, remove, create };
