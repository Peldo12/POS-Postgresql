const path = require('path');
const { client } = require(path.join(__dirname, '../config/redis'));

async function save({ key, value, options }) {
  await client.set(key, JSON.stringify(value), options);
  return await client.get(key);
}

async function get(key) {
  return JSON.parse(await client.get(key));
}

async function remove(key) {
  await client.del(key);
  return await get(key);
}

async function removeInvalid(keys = []) {
  const validKeys = keys.filter(Boolean);
  if (validKeys.length === 0) return;

  await client.del(keys);
}

module.exports = { save, get, remove, removeInvalid };
