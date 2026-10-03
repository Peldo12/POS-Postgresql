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
    console.log('Connected to Redis');
  } catch (err) {
    console.error('Failed to connect Redis:', err);
    throw err;
  }
}

module.exports = {
  client,
  initRedis,
};
