const express = require('express');
const router = express.Router();

const authenticate = require('../common/middleware/authentication');
const limit = require('../common/middleware/limiter');
const validate = require('../common/middleware/validate');
const authorize = require('../common/middleware/authorize');
const { idNumber, idString } = require('../common/global');

module.exports = {
  router,
  authenticate,
  limit,
  validate,
  authorize,
  idNumber,
  idString,
};
