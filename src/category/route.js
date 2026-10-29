const express = require('express');
const router = express.Router();
const {
  router,
  authenticate,
  limit,
  validate,
  authorize,
  idNumber,
} = require('../config/routeConfig');

const control = require('../category/controller');
const { categorySchema } = require('./validator');

const { USER, ADMIN, OWNER, SUPER_ADMIN } = require('../constants/roles');
const all = [USER, ADMIN, OWNER, SUPER_ADMIN];
const strict = [ADMIN, OWNER, SUPER_ADMIN];

router.use(authenticate.headers);

router.get('/', authorize(all), control.categories);
router.get('/:id', authorize(all), validate.params(idNumber), control.byId);

router.post(
  '/create',
  limit(60),
  authorize(strict),
  validate.body(categorySchema),
  control.create
);

router.put(
  '/:id/update',
  limit(60),
  authorize(strict),
  validate.params(idNumber),
  validate.body(categorySchema),
  control.update
);

router.patch(
  '/:id/remove',
  limit(60),
  validate.params(idNumber),
  authorize(strict),
  control.remove
);

router.patch(
  '/:id/restore',
  limit(60),
  validate.params(idNumber),
  authorize(strict),
  control.restore
);

module.exports = router;
