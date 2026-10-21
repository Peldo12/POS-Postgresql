const service = require('./service');
const dateNow = require('../common/helpers/date');

const success = require('../common/helpers/response');
const AppError = require('../common/utils/AppError');

async function dashboard(req, res, next) {
  try {
    const filters = {
      range: req.query.range || 'today',
    };
    const stats = await service.getStats(filters);
    success({
      message: 'POS Stats',
      data: { stats },
      res,
    });
  } catch (error) {
    req.logger.error(error.message, { stack: error.stack });
    next(error);
  }
}

module.exports = { dashboard };
