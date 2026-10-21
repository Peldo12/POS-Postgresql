const { pool } = require('../../config/pool');

async function getSequence() {
  const { rows } = await pool.query(`
  SELECT nextval('invoice_sequence');
  `);
  return rows[0].nextval;
}

module.exports = { getSequence };
