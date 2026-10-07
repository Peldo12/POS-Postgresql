const { client } = require('../config/redis');

async function save({ key, value, ...options }) {
  await client.set(key, JSON.stringify(value), options);

  return key;
}

async function remove(key) {
  try {
    await client.del(key);

    return await get(key);
  } catch (error) {
    throw error;
  }
}

module.exports = { save, remove };
