const { Pool } = require("pg")

const dbUser = process.env.DB_USER
const dbPass = process.env.DB_PASSWORD
const dbHost = process.env.DB_HOST
const dbName = process.env.DB_NAME

const pool = new Pool({
  connectionString: `postgresql://${dbUser}:${dbPass}@${dbHost}:5432/${dbName}`,
  ssl: false
})

pool.connect((err, client, release) => {
  if (err) {
    return console.error('Failed, on connect database:', err.stack);
  }
  console.log(`Connected to server PostgreSQL ${process.env.DB_HOST}`);
  release();
});

module.exports = pool