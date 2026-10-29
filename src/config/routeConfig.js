const authenticate = require('../common/middleware/authentication');
const limit = require('../common/middleware/limiter');
const validate = require('../common/middleware/validate');
const authorize = require('../common/middleware/authorize');
const { idNumber, idString } = require('../common/global');

module.exports = {
  authenticate,
  authorize,
  limit,
  validate,
  idNumber,
  idString,
};
