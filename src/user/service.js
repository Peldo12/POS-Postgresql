const model = require('./model');
const { redis, md5 } = require('../config/serviceConfig');

function createKey(options) {
  if (options.id) return `user${options.id}`;
  return md5('users', options);
}

async function giveUsers(options) {
  const key = createKey(options);
  const cache = await redis.get(key);

  if (cache) return cache;

  const db = await model.getUsers(options);
  await redis.save({ key, value: db });

  return db;
}

module.exports = { giveUsers };
