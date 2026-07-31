const { Pool } = require("pg")

const pool = new Pool({
  connectionString: process.env.LOCAL_DATABASE,
  ssl: false
})

pool.connect((err, client, release) => {
  if (err) {
    return console.error('Failed, on connect database:', err.stack);
  }
  console.log(`Connected to server PostgreSQL ${process.env.DATABASE_HOST}`);
  release();
});

module.exports = pool