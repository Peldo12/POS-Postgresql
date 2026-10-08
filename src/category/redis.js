const path = require('path');
const { client } = require(path.join(__dirname, '../config/redis'));

async function save({ key, value, options }) {
  await client.set(key, JSON.stringify(value), options);
  return await client.get(key);
}

async function remove(key) {
  await client.del(key);
  return await client.get(key);
}
