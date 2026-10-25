const { createClient } = require('redis');

const client = createClient({
  url: process.env.REDIS_URL,
});
client.on('error', (err) => {
  console.error('Redis Error:', err);
});

async function initRedis() {
  try {
    await client.connect();
    console.warn(`${new Date().toLocaleTimeString()}: Connected to Redis`);
  } catch (err) {
    console.error('Failed to connect Redis:', err);
    throw err;
  }
}

async function save({ key, value, options = { EX: 300 } }) {
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

async function clearCache(list = []) {
  if (!Array.isArray(list)) {
    throw new Error('Invalid type to clear');
  }
  if (!list.length) {
    throw new Error('Empty list to clear');
  }

  let deleted = 0;
  for (const prefix of list) {
    let cursor = '0';
    const keysToDelete = new Set();

    do {
      const { cursor: nextCursor, keys } = await client.scan(cursor, {
        MATCH: `${prefix}:*`,
        COUNT: 100,
      });

      cursor = nextCursor;

      keys.forEach((key) => keysToDelete.add(key));
    } while (cursor !== '0');

    if (keysToDelete.size) {
      const keys = [...keysToDelete];
      deleted += await client.del(keys);
    }
  }
  return deleted;
}

module.exports = {
  client,
  initRedis,
  save,
  get,
  remove,
  clearCache,
};
