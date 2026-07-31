const pool = require('../config/pool')

async function statsProducts() {
  const [countProducts, countCategories] = await Promise.all([
    pool.query("SELECT COUNT(*) FROM products"),
    pool.query("SELECT COUNT(category_id) FROM products")
  ])
  return {
    products: countProducts.rows[0].count,
    categories: countCategories.rows[0].count
  }
}

module.exports = { statsProducts }