if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ quiet: true });
}
const { initRedis } = require('./src/config/redis');
const { initDB } = require('./src/config/pool');
const app = require('./src/app');
const port = process.env.PORT || 8000;

app.listen(port, async () => {
  await initDB();
  await initRedis();
  console.warn(`${new Date().toLocaleTimeString()}: Server started on ${port}`);
});

function stopApp() {
  console.warn(`${new Date().toLocaleTimeString()}: Shutdown with care ...`);
  process.exit(0);
}

process.on('SIGINT', stopApp);
process.on('SIGTERM', stopApp);

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED:', err);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT:', err);
});
