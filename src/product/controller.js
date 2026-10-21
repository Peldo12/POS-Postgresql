const service = require('./service');
const dateNow = require('../common/helpers/date');

const success = require('../common/helpers/response');
const AppError = require('../common/utils/AppError');

/**
 * @desc get all products
 * @route GET /api/products
 * @access Atleast email verfied
 */
async function products(req, res, next) {
  try {
    if (!req.user) throw new AppError(401, 'Unauthenticated');
    const { userId, username } = req.user;
    const filters = {
      page: +req.query.page || 1,
      limit: +req.query.limit || 10,
      search: req.query.search || '',
      range: req.query.range || null,
      minPrice: req.query.minPrice !== undefined ? +req.query.minPrice : null,
      maxPrice: req.query.maxPrice ? +req.query.maxPrice : null,
      categoryId: req.query.categoryId ? req.query.categoryId : null,
      sort: req.query.sort || 'id',
      orderBy: req.query.orderBy?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
    };

    const { products, pagination } = await service.getProducts(filters);

    success({
      message: 'Products are loaded',
      data: { products },
      pagination,
      res,
    });

    req.logger.info('Products loaded', {
      userId,
      username,
      resource: 'products',
      resourceId: 'all',
      action: 'load',
    });
  } catch (error) {
    req.logger.error(error.message, { stack: error.stack });
    next(error);
  }
}

/**
 * @desc get product by ID
 * @route GET /api/product/:id
 * @access Atleast admin or higher and email verfied
 */
async function byId(req, res, next) {
  try {
    if (!req.user) throw new AppError(401, 'Unauthenticated');
    const { userId, username } = req.user;
    const { id } = req.params;

    const { products } = await service.getProducts({ id });
    if (!products.length) throw new AppError(404, 'Product not found');

    success({
      message: 'Product are loaded',
      data: { products },
      res,
    });

    req.logger.info('Products id loaded', {
      userId,
      username,
      resource: 'products',
      resourceId: id,
      action: 'load',
    });
  } catch (error) {
    req.logger.error(error.message, { stack: error.stack });
    next(error);
  }
}

/**
 * @desc create a product
 * @route POST /api/product/create
 * @access Atleast admin or higher and email verfied
 */
async function create(req, res, next) {
  try {
    if (!req.user) throw new AppError(401, 'Unauthenticated');
    const { userId, username } = req.user;

    const product = await service.createProduct({
      product: req.body,
      user: req.user,
    });

    success({
      statusCode: 201,
      message: `Product ${product?.name} created`,
      data: { products: product },
      res,
    });

    req.logger.info('Products created', {
      userId,
      username,
      resource: 'products',
      resourceId: 'all',
      action: 'create',
    });
  } catch (error) {
    req.logger.error(error.message, { stack: error.stack });
    next(error);
  }
}

/**
 * @desc update product by ID
 * @route PUT /api/categories/:id/update
 * @access Atleast admin or higher and email verfied
 */
async function update(req, res, next) {
  try {
    if (!req.user) throw new AppError(401, 'Unauthenticated');
    const { userId, username } = req.user;

    const { id } = req.params;

    const result = await service.updateProduct({
      product: { ...req.body, id },
      user: req.user,
    });
    success({
      message: 'Product updated',
      data: { products: result },
      res,
    });
    req.logger.info('Product updated by', {
      userId,
      username,
      resource: 'products',
      resourceId: id,
      action: 'update',
    });
  } catch (error) {
    req.logger.error(error.message, { stack: error.stack });
    next(error);
  }
}

/**
 * @desc update products stock
 * @route PATCH /api/product/stocks/update
 * @access Atleast admin or higher and email verfied
 */
async function updateStock(req, res, next) {
  try {
    if (!req.user) throw new AppError(401, 'Unauthenticated');
    const { userId, username } = req.user;

    const { transactions } = req.body;
    if (!Array.isArray(transactions) || !transactions.length)
      throw new AppError(400, 'Invalid or empty transactions');
    const data = await service.updateStocks(transactions, req.user);
    success({
      message: 'Products stock updated',
      data,
      res,
    });
    req.logger.info('Products stock updated', {
      userId,
      username,
      resource: 'products',
      resourceId: 'all',
      action: 'stocks',
    });
  } catch (error) {
    req.logger.error(error.message, { stack: error.stack });
    next(error);
  }
}

/**
 * @desc remove product by ID
 * @route PATCH /api/product/:id/remove
 * @access Atleast admin or higher and email verfied
 */
async function remove(req, res, next) {
  try {
    if (!req.user) throw new AppError(401, 'Unauthenticated');
    const { userId, username } = req.user;
    const { id } = req.params;

    const { products } = await service.removeOrRestoreProduct({
      id,
      value: dateNow(),
      user: req.user,
    });

    success({
      message: `Product ${products[0].name} removed`,
      data: { products },
      res,
    });
    req.logger.info('Product removed', {
      userId,
      username,
      resource: 'products',
      resourceId: id,
      action: 'remove',
    });
  } catch (error) {
    req.logger.error(error.message, { stack: error.stack });
    next(error);
  }
}

/**
 * @desc restore product by ID
 * @route PATCH /api/product/:id/restore
 * @access Atleast admin or higher and email verfied
 */
async function restore(req, res, next) {
  try {
    if (!req.user) throw new AppError(401, 'Unauthenticated');
    const { userId, username } = req.user;

    const { id } = req.params;

    const { products } = await service.removeOrRestoreProduct({
      id,
      user: req.user,
    });
    success({
      message: `Product ${products[0].name} restored`,
      data: { products },
      res,
    });
    req.logger.info('Product restored', {
      userId,
      username,
      resource: 'products',
      resourceId: id,
      action: 'restore',
    });
  } catch (error) {
    req.logger.error(error.message, { stack: error.stack });
    next(error);
  }
}

async function removePermanent(req, res, next) {
  try {
    const { id } = req.params;
    const found = await getById({ id });
    if (!found) throw new AppError(404, 'Product not found');

    const result = await removePermanent(id);
    success({
      message: 'Product permanent deleted',
      data: { products: [result] },
      res,
    });
    req.logger.info('Product permanent deleted', {
      userId,
      username,
      resource: 'products',
      resourceId: id,
      action: 'delete',
    });
  } catch (error) {
    req.logger.error(error.message, { stack: error.stack });
    next(error);
  }
}

async function stats(req, res, next) {
  try {
    const data = await service.getStats();
    success({
      message: 'Stats products ready',
      data,
      res,
    });
  } catch (error) {
    req.logger.error(error.message, { stack: error.stack });
    next(error);
  }
}

module.exports = {
  products,
  byId,
  create,
  update,
  updateStock,
  remove,
  restore,
  removePermanent,
  stats,
};
