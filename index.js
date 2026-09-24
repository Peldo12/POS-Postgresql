if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ quiet: true });
}

const app = require('./src/app');
const port = process.env.PORT || 8000;

app.listen(port, () => {
  console.log(`${new Date().toLocaleTimeString()}: Server started on ${port}`);
});
