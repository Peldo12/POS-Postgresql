const pool = require('../config/pool')

async function updateProduct(options) {
  const client = await pool.connect()
  try {
    const { product, user } = options;
    await client.query('BEGIN')
    
    
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
}

module.exports = {updateProduct}