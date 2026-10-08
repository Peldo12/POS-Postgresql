const { client } = require('../../config/redis');
const { pool } = require('../../config/pool');
const dateNow = require('./date');
const { version } = require('../../../package.json');

const appVersion = process.env.APP_VERSION ?? version;

async function health(req, res) {
  const services = {};
  let status;
  try {
    const { rowCount } = await pool.query('SELECT 1');
    services.postgres = 'up';
  } catch (error) {
    services.postgres = 'down';
  }
  try {
    const redis = await client.ping();
    services.redis = 'up';
  } catch (error) {
    services.redis = 'down';
  }

  const count = Object.values(services);
  const all = count.every((el) => el === 'down');
  const some = count.some((el) => el === 'down');

  if (all) {
    status = 'down';
  } else if (some) {
    status = 'degraded';
  } else {
    status = 'ok';
  }

  res.json({
    status,
    version: appVersion,
    timestamp: dateNow('iso'),
    uptime: process.uptime(),
    services,
  });
}
module.exports = health;
