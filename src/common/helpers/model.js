const { pool } = require('../../config/pool');

async function getSequence() {
  const { rows } = await pool.query(`
  SELECT nextval('invoice_sequence');
  `);
  return rows[0].nextval;
}

async function transaction(callback) {
  if (callback) throw new Error('No func');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { getSequence, transaction };
