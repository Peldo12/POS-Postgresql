const info = require('./info');
const log = require('./log');
const model = require('./model');
const redis = require('../config/redis');
const transaction = require('../common/helpers/transaction');
const { md5 } = require('../common/helpers/crypto');
const logger = require('../common/middleware/logger');
const AppError = require('../common/utils/AppError');

function createProductKey(options) {
  if (options.id) {
    return `product:${options.id}`;
  }

  return md5('products', options);
}

async function getProducts(options) {
  const key = createProductKey(options);
  const cache = await redis.get(key);

  if (cache) return cache;

  const db = await model.productJoin(options);

  await redis.save({
    key,
    value: db,
  });

  return db;
}

async function createProduct(options) {
  const { product, user } = options;
  const { userId } = user;

  const { products } = await model.productJoin({
    sku: product.sku,
  });
  if (products.length) throw new AppError(400, 'SKU already used');

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
    await redis.clearCache(['products', 'product']);
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
  if (!products.length) throw new AppError(404, 'Product not found');

  if (product.sku !== products[0].sku)
    throw new AppError(400, 'SKU cannot be changed');

  return await transaction(async (client) => {
    const item = await model.update({
      client,
      product,
    });
    await info.create({
      client,
      productId: product.id,
      userId,
    });
    await log.create({
      client,
      action: 'UPDATE',
      userId,
      data: product,
      refId: product.id,
      refType: 'PRODUCT',
    });
    await redis.clearCache(['products', 'product']);
    return item;
  });
}

async function updateStocks(options, user) {
  const { userId, username } = user;
  const result = [];
  await transaction(async (client) => {
    for (const product of options) {
      const { quantity, id } = product;

      if (quantity < 0) {
        const updated = await model.decreaseStock(product, client);
        if (!updated.rowCount)
          throw new AppError(400, 'Insufficient stock product');
      } else {
        const updated = await model.increaseStock(product, client);
        if (!updated.rowCount) {
          throw new AppError(404, 'Product not found');
        }
      }

      result.push({ id, status: 'success' });
      logger.info('Product stock updated', {
        userId,
        username,
        resource: 'products',
        resourceId: id,
        action: 'update',
      });
    }
    await redis.clearCache(['products', 'product']);
  });
  return result;
}

async function removeOrRestoreProduct(options) {
  const { id, value = null, user } = options;
  const isRemove = Boolean(value);
  const { products } = await model.productJoin({
    id,
    deleted: isRemove ? false : true,
  });

  if (isRemove) {
    if (!products.length)
      throw new AppError(404, 'Product not found or deleted');
  } else {
    if (!products.length) throw new AppError(404, 'Product not deleted');
  }

  await transaction(async (client) => {
    const action = isRemove ? 'REMOVE' : 'RESTORE';

    const result = await model.removeOrRestore({
      client,
      ...options,
    });

    await log.create({
      client,
      userId: user.userId,
      action,
      data: products[0],
      refId: result[0].product_id,
      refType: 'PRODUCT',
    });
  });
  await redis.clearCache(['products', 'product']);

  return await model.productJoin({
    id,
    deleted: isRemove ? true : false,
  });
}

async function permanentDelete(id) {
  return await transaction(async (client) => {
    return await model.permanentRemoveProduct({ client, id });
  });
}

async function getStats() {
  const key = 'products:stats';
  const cache = await redis.get(key);
  if (cache) return cache;

  const db = await model.statsProducts();
  await redis.save({
    key,
    value: db,
  });

  return db;
}

module.exports = {
  getProducts,
  createProduct,
  updateProduct,
  updateStocks,
  removeOrRestoreProduct,
  permanentDelete,
  getStats,
};
