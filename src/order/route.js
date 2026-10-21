const express = require('express');
const router = express.Router();

const control = require('./controller');
const { authenticate } = require('../common/middleware/authentication');

const limit = require('../common/middleware/limiter');
const { transactionLimit } = require('../config/rateLimitConfig');
const { oneMin, fiveMin } = require('../config/rateLimitTime');

const validate = require('../common/middleware/validate');
const { createSchema, filterSchema, orderIdSchema } = require('./validator');

const authorize = require('../common/middleware/authorize');
const { USER, ADMIN, OWNER, SUPER_ADMIN } = require('../constants/roles');

const all = [USER, ADMIN, OWNER, SUPER_ADMIN];
const strict = [ADMIN, OWNER, SUPER_ADMIN];

router.use(authenticate);

router.get(
  '/',
  limit(25, fiveMin),
  authorize(all),
  validate.query(filterSchema),
  control.orders
);

router.get('/:orderId', validate.params(orderIdSchema), control.byId);

router.post(
  '/create',
  limit(transactionLimit, oneMin),
  authorize(strict),
  validate.body(createSchema),
  control.create
);

router.patch(
  '/:orderId/remove',
  validate.params(orderIdSchema),
  control.remove
);
router.patch(
  '/:orderId/restore',
  validate.params(orderIdSchema),
  control.restore
);

module.exports = router;
