const service = require('./service');
const success = require('../common/helpers/response');
const AppError = require('../common/utils/AppError');

async function orders(req, res, next) {
  try {
    if (!req.user) throw new AppError(401, 'Unauthenticated');

    const { userId, username } = req.user;

    const filters = {
      search: req.query.search || '',
      method: req.query.method || '',
      status: req.query.status || '',
      date: req.query.date || null,
      range: req.query.range || null,
      start: req.query.start || null,
      end: req.query.end || null,
      page: +req.query.page || 1,
      limit: +req.query.limit || 10,
      sort: req.query.sort || 'createdAt',
      orderBy: req.query.orderBy || 'DESC',
    };

    const { orders: items, pagination } = await service.orders(filters);

    success({
      message: 'Orders are loaded',
      data: { orders: items },
      pagination,
      res,
    });
    req.logger.info('Orders loaded', {
      userId,
      username,
      resource: 'orders',
      resourceId: 'all',
      action: 'load',
    });
  } catch (error) {
    req.logger.error(error.message, { stack: error.stack });
    next(error);
  }
}

async function byId(req, res, next) {
  try {
    if (!req.user) throw new AppError(401, 'Unauthenticated');

    const { userId, username } = req.user;
    const { orderId } = req.params;
    const data = await service.detailOrders({ orderId });

    success({
      message: 'Order details loaded',
      data: { order: data },
      res,
    });
    req.logger.info('Order id loaded', {
      userId,
      username,
      resource: 'orders',
      resourceId: orderId,
      action: 'load',
    });
  } catch (error) {
    req.logger.error(error.message, { stack: error.stack });
    next(error);
  }
}

async function create(req, res, next) {
  try {
    if (!req.user) throw new AppError(401, 'Unauthenticated');

    const { userId, username } = req.user;
    const { products, payment } = req.body;
    if (!Array.isArray(products) || products.length === 0) {
      throw new AppError(400, 'Invalid or empty transactions');
    }

    const { id } = await service.create({
      userId,
      username,
      products,
      payment,
    });

    success({
      message: 'Orders successfuly saved',
      data: { orderId: id },
      res,
    });
    req.logger.info('Order created', {
      userId,
      username,
      resource: 'orders',
      resourceId: id,
      action: 'create',
    });
  } catch (error) {
    req.logger.error(error.message, { stack: error.stack });
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    if (!req.user) throw new AppError(401, 'Unauthenticated');

    const { userId, username } = req.user;
    const { orderId } = req.params;

    await service.removeOrRestore({
      orderId,
      value: new Date(),
    });

    success({
      message: 'Orders successfuly removed',
      res,
    });
    req.logger.info('Order removed', {
      userId,
      username,
      resource: 'orders',
      resourceId: orderId,
      action: 'remove',
    });
  } catch (error) {
    req.logger.error(error.message, { stack: error.stack });
    next(error);
  }
}

async function restore(req, res, next) {
  try {
    if (!req.user) throw new AppError(401, 'Unauthenticated');

    const { userId, username } = req.user;
    const { orderId } = req.params;

    await service.removeOrRestore({
      orderId,
      value: null,
    });

    success({
      message: 'Orders successfuly restored',
      res,
    });
    req.logger.info('Order restored', {
      userId,
      username,
      resource: 'orders',
      resourceId: orderId,
      action: 'restore',
    });
  } catch (error) {
    req.logger.error(error.message, { stack: error.stack });
    next(error);
  }
}

module.exports = { orders, byId, create, remove, restore };
