const express = require('express');
const router = express.Router();
const control = require('../product/controller');
const {
  authenticate,
  limit,
  validate,
  authorize,
  idNumber,
} = require('../config/routeConfig');
const {
  createProductSchema,
  updateProductSchema,
  updateStockSchema,
  filterSchema,
} = require('./validator');

const { USER, ADMIN, OWNER, SUPER_ADMIN } = require('../constants/roles');

const all = [USER, ADMIN, OWNER, SUPER_ADMIN];
const strict = [ADMIN, OWNER, SUPER_ADMIN];

router.use(authenticate.headers);

router.get('/stats', authorize(all), control.stats);

router.get('/', authorize(all), validate.query(filterSchema), control.products);

router.get('/:id', authorize(all), validate.params(idNumber), control.byId);

router.post(
  '/create',
  limit(60),
  authorize(strict),
  validate.body(createProductSchema),
  control.create
);

router.put(
  '/:id/update',
  limit(60),
  authorize(strict),
  validate.params(idNumber),
  validate.body(updateProductSchema),
  control.update
);

router.patch(
  '/stocks/update',
  limit(60),
  authorize(strict),
  validate.body(updateStockSchema),
  control.updateStock
);

router.patch(
  '/:id/remove',
  limit(60),
  authorize(strict),
  validate.params(idNumber),
  control.remove
);

router.patch(
  '/:id/restore',
  limit(60),
  authorize(strict),
  validate.params(idNumber),
  control.restore
);

module.exports = router;
