if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ quiet: true });
}

const app = require('./src/app');
const port = process.env.PORT || 8000;

app.listen(port, () => {
  console.log(`${new Date().toLocaleTimeString()}: Server started on ${port}`);
});

function stopApp(signal) {
  console.log(` ==> Shutdown with care ...`);
  process.exit(0);
}

process.on('SIGINT', stopApp);
process.on('SIGTERM', stopApp);
