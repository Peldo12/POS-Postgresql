const { pool } = require('../config/pool');
const info = require('./info');
const log = require('./log');
const model = require('./model');
const transaction = require('../common/helpers/transaction');
const logger = require('../common/middleware/logger');
const AppError = require('../common/utils/AppError');

async function getProducts(options) {
  return await model.productJoin(options);
}

async function createProduct(options) {
  const { product, user } = options;
  const { userId } = user;

  const { products } = await model.productJoin({
    id: product.id,
  });
  if (!products.length) throw new AppError(404, 'Product not found');
  if (product.sku !== products.sku)
    throw new AppError(400, 'SKU cannot be changed');

  const result = await transaction(async (client) => {
    const [item] = await model.create({ client, product });
    await info.create({
      client,
      productId: item.id,
    });
    await log.create({
      client,
      action: 'CREATE',
      userId,
      data: { ...product, id: item.id },
      refId: item.id,
      refType: 'PRODUCT',
    });
    return item;
  });
  return result;
}

async function updateProduct(options) {
  const { product, user } = options;
  const { userId } = user;

  const { products } = await model.productJoin({
    sku: product.sku,
    categoryId: product.category_id,
  });
  if (products.length) throw new AppError(400, 'SKU already used');

  const result = await transaction(async (client) => {
    const item = await model.update({
      client,
      product,
    });
    await info.create({
      client,
      productId: product.id,
      userId: user.id,
    });
    await log.create({
      client,
      action: 'UPDATE',
      userId: user.id,
      data: product,
      refId: product.id,
      refType: 'PRODUCT',
    });
    return item;
  });
}

async function updateStocks(options, user) {
  const { userId, username } = user;
  const result = [];
  await transaction(async (client) => {
    for (let product of options) {
      const { value, id } = product;

      const updated = await model.updateStock(product);
      if (!stockUpdate.rowCount)
        throw new AppError(400, 'Insufficient stock product');
      result.push({ id, status: 'success' });
      logger.info('Product stock updated', {
        userId,
        username,
        resource: 'products',
        resourceId: id,
        action: 'update',
      });
    }
  });
  return result;
}

async function removeOrRestoreProduct(options) {
  const { id, value = null, user } = options;

  const exist = await getProducts({ id });
  console.log(exist);

  const result = await transaction(async (client) => {
    let action = value ? 'REMOVE' : 'RESTORE';

    const result = await model.removeOrRestore({
      client,
      ...options,
    });
    const old = await getProducts({ id });

    await log.create({
      client,
      userId: user.id,
      action,
      data: old,
      refId: result.id,
      refType: 'PRODUCT',
    });
    return await getProducts({ id });
  });
}

// async function permanentDelete() {
//   const client = await pool.connect();
//   try {
//     const result = await model.permanentRemoveProduct(id);

//     await client.query('COMMIT');
//     return result;
//   } catch (error) {
//     await client.query('ROLLBACK');
//     throw error;
//   }
// }

module.exports = {
  getProducts,
  createProduct,
  updateProduct,
  updateStocks,
  removeOrRestoreProduct,
};
