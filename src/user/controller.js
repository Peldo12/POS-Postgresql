const success = require('../common/helpers/response');
const AppError = require('../common/utils/AppError');

const service = require('./service');

async function users(req, res, next) {
  try {
    if (!req.user) throw new AppError(401, 'Unauthenticated');
    const { userId, username } = req.user;

    const filters = {
      role: req.query.role || '',
      search: req.query.search || '',
      type: req.query.type || 'REFRESH_TOKEN',
      range: req.query.range || 'today',
      deleted: req.query.deleted || true,
    };

    const { items, pagination } = await service.giveUsers(filters);

    success({
      message: 'Users loaded',
      data: { users: items },
      pagination,
      res,
    });
    req.logger.info('Users loaded', {
      userId,
      username,
      resource: 'users',
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

    const { id } = req.params;
    const { items } = await service.giveUsers({ id });

    success({
      message: 'User id loaded',
      data: { users: items },
      res,
    });
    req.logger.info('Users id loaded', {
      userId,
      username,
      resource: 'users',
      resourceId: id,
      action: 'load',
    });
  } catch (error) {
    req.logger.error(error.message, { stack: error.stack });

    next(error);
  }
}

module.exports = {
  users,
  byId,
};
