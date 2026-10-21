const productService = require('../product/service');
const orderService = require('../order/service');
const AppError = require('../common/utils/AppError');

async function productStats(options) {
  const { stats } = await productService.getStats();
  return {
    products: stats.products,
    categories: stats.categories,
    low: stats.low,
  };
}

async function getStats(options) {
  const { products, categories, low } = await productStats();
  const { orders, omzet, items } = await orderService.getStats(options);

  return {
    orders,
    omzet,
    items,
    low,
    products,
    categories,
  };
}

module.exports = { getStats };
