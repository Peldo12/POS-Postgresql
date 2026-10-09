const service = require('./service');
const success = require('../common/helpers/response');
const dateNow = require('../common/helpers/date');
const AppError = require('../common/utils/AppError');

/**
 * @desc get all categories
 * @route GET /api/categories
 * @access Atleast email verfied
 */
async function categories(req, res, next) {
  try {
    const { userId, username } = req.user;
    const categories = await service.categories({ key: 'categories:all' });
    success({
      message: 'Categories are loaded',
      data: { categories },
      res,
    });
    req.logger.info('Categories loaded', {
      userId,
      username,
      resource: 'categories',
      resourceId: 'all',
      action: 'load',
    });
  } catch (e) {
    req.logger.error(error.message, { stack: error.stack });
    next(e);
  }
}

/**
 * @desc get categories by ID
 * @route GET /api/categories/:id
 * @access Atleast admin or higher and email verfied
 */
async function byId(req, res, next) {
  try {
    const { userId, username } = req.user;

    const { id } = req.params;
    if (isNaN(id)) throw new AppError(400, 'Invalid id');

    const categories = await service.categories({
      id,
      key: `categories:${id}`,
    });
    if (categories.length === 0) throw new AppError(404, 'Category not found');

    success({
      message: `Category id ${id}`,
      data: { categories },
      res,
    });
    req.logger.info('Category id loaded', {
      userId,
      username,
      resource: 'category',
      resourceId: id,
      action: 'load',
    });
  } catch (e) {
    req.logger.error(error.message, { stack: error.stack });
    next(e);
  }
}

/**
 * @desc create a category
 * @route POST /api/categories/create
 * @access Atleast admin or higher and email verfied
 */
async function create(req, res, next) {
  try {
    const { userId, username } = req.user;

    const { name } = req.body;
    const result = await service.createOrUpdate(req.body);

    success({
      statusCode: 201,
      message: `Category ${name} created`,
      data: { categories: result },
      res,
    });
    req.logger.info('Category created', {
      userId,
      username,
      resource: 'id',
      resourceId: result[0].id,
      action: 'create',
    });
  } catch (e) {
    req.logger.error(error.message, { stack: error.stack });
    next(e);
  }
}

/**
 * @desc update category by ID
 * @route PUT /api/categories/:id/update
 * @access Atleast admin or higher and email verfied
 */
async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const { userId, username } = req.user;

    const categories = await service.createOrUpdate({
      ...req.body,
      id,
      update: true,
      key: `categories:${id}`,
    });
    success({
      message: `Category ${name} updated`,
      data: { categories },
      res,
    });
    req.logger.info('Category updated', {
      userId,
      username,
      resource: 'category',
      resourceId: id,
      action: 'update',
    });
  } catch (e) {
    req.logger.error(error.message, { stack: error.stack });
    next(e);
  }
}

/**
 * @desc remove category by ID
 * @route PATCH /api/categories/:id/remove
 * @access Atleast admin or higher and email verfied
 */
async function remove(req, res, next) {
  try {
    const { userId, username } = req.user;

    const { id } = req.params;
    const categories = await service.createOrUpdate({
      id,
      value: dateNow(),
      update: true,
      key: `categories:${id}`,
    });
    success({
      message: `Category ${categories.name} deleted`,
      data: { categories },
      res,
    });
    req.logger.info('Category removed', {
      userId,
      username,
      resource: 'category',
      resourceId: id,
      action: 'remove',
    });
  } catch (e) {
    req.logger.error(error.message, { stack: error.stack });
    next(e);
  }
}

/**
 * @desc restore category by ID
 * @route PATCH /api/categories/:id/restore
 * @access Atleast admin or higher and email verfied
 */
async function restore(req, res, next) {
  try {
    const { userId, username } = req.user;

    const { id } = req.params;
    const categories = await service.createOrUpdate({
      id,
      value: null,
      update: true,
      key: `categories:${id}`,
    });

    success({
      message: `Category ${categories.name} restored`,
      data: { categories },
      res,
    });
    req.logger.info('Category removed', {
      userId,
      username,
      resource: 'category',
      resourceId: id,
      action: 'restore',
    });
  } catch (e) {
    req.logger.error(error.message, { stack: error.stack });
    next(e);
  }
}

module.exports = { categories, byId, create, update, remove, restore };
