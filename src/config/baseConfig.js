const { authenticate } = require("../common/middleware/authentication");
const limit = require("../common/middleware/limiter");
const validateBody = require("../common/middleware/validateBody");
const validateParams = require("../common/middleware/validateParams");
const validateQuery = require("../common/middleware/validateQuery");
const { idSchema } = require("../common/global");
const authorize = require("../common/middleware/authorize");

module.exports = {
  authenticate,
  limit,
  validateBody,
  validateParams,
  validateQuery,
  idSchema,
  authorize,
};
