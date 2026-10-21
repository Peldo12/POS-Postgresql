const model = require('./model');
const redis = require('../config/redis');
const productLog = require('../product/log');
const productService = require('../product/service');
const AppError = require('../common/utils/AppError');
const logger = require('../common/middleware/logger');
const transaction = require('../common/helpers/transaction');
const generateInvoice = require('../common/helpers/invoice');
const { md5 } = require('../common/helpers/crypto');

function createKey(options) {
  if (options.orderId) return `order:${options.orderId}`;

  return md5('orders', options);
}

async function orders(options) {
  const key = createKey(options);
  const cache = await redis.get(key);

  if (cache) return cache;

  const db = await model.getOrders(options);
  await redis.save({ key, value: db });

  return db;
}

async function detailOrders(options) {
  const { orderId } = options;
  const key = createKey(options);

  const cache = await redis.get(key);
  if (cache) return cache;

  const { orders: order } = await model.getOrders({ id: orderId });
  if (!order.length) throw new AppError(404, 'Order not found');

  const items = await model.getItems({ orderId });
  const result = { ...order[0], items };
  await redis.save({ key, value: result });

  return result;
}

async function create(options) {
  return await transaction(async (client) => {
    const { userId, username, products, payment } = options;
    const { discount, tax, method } = payment;

    const invoice = await generateInvoice();

    const items = [];
    let subtotal = 0;
    for (let product of products) {
      const { products: exist } = await productService.getProducts({
        id: product.id,
      });
      if (!exist.length) throw new AppError(404, 'Product not found');
      if (exist[0].stock < product.quantity)
        throw new AppError(400, 'Insufficient product stock');

      const { id: productId, name: productName, sell: price } = exist[0];

      subtotal += price * product.quantity;
      items.push({
        productId,
        productName,
        price,
        quantity: product.quantity,
        subtotal: price * product.quantity,
      });
    }

    const total = subtotal - discount + tax;
    if (total < 0) throw new AppError(400, 'Invalid total order');
    const order = await model.create({
      client,
      userId,
      payment: {
        invoice,
        subtotal,
        discount,
        tax,
        total,
        method,
      },
    });

    for (let item of items) {
      await model.detail({
        client,
        order: {
          orderId: order.id,
          ...item,
        },
      });

      const updated = await model.decreaseStock({
        client,
        productId: item.productId,
        quantity: item.quantity,
      });
      if (!updated.rowCount)
        throw new AppError(400, 'Insufficient product stock');

      await productLog.create({
        client,
        action: 'STOCK_OUT',
        userId,
        data: { ...item, id: item.productId },
        refId: item.productId,
        refType: 'ORDER',
      });

      logger.info('Product stock updated', {
        userId,
        username,
        resource: 'products',
        resourceId: item.productId,
        action: 'update',
      });
    }
    await redis.clearCache(['products', 'product', 'orders', 'order']);
    return order;
  });
}

async function removeOrRestore(options) {
  const { orderId, value } = options;
  const isRemove = Boolean(value);

  const { orders } = await model.getOrders({
    id: orderId,
    deleted: isRemove ? false : true,
  });
  if (isRemove) {
    if (!orders.length) throw new AppError(404, 'Order not found or deleted');
  } else {
    if (!orders.length) throw new AppError(404, 'Order not deleted');
  }

  const result = await transaction(async (client) => {
    const removed = await model.removeOrRestoreOrder({ ...options, client });
    return { id: removed.id };
  });

  await redis.clearCache(['products', 'product', 'orders', 'order']);
  return result;
}

async function updateStatus(options) {
  const { orderId } = options;
  const { orders: order } = await model.getOrders({ id: orderId });

  if (!order.length) throw new AppError(404, 'Order not found');

  return transaction(async (client) => {
    await model.updateStatusOrder({ client, orderId });
  });
}

async function getStats(options) {
  return await model.orderStats(options);
}

module.exports = { create, orders, detailOrders, removeOrRestore, getStats };
