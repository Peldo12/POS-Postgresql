const control = require('./controller');
const {
  router,
  authenticate,
  limit,
  validate,
  authorize,
} = require('../config/base');

const { createSchema, filterSchema, orderIdSchema } = require('./validator');

const { USER, ADMIN, OWNER, SUPER_ADMIN } = require('../constants/roles');

const all = [USER, ADMIN, OWNER, SUPER_ADMIN];
const strict = [ADMIN, OWNER, SUPER_ADMIN];

router.use(authenticate.headers);

router.get(
  '/',
  limit(60),
  authorize(all),
  validate.query(filterSchema),
  control.orders
);

router.get('/:orderId', validate.params(orderIdSchema), control.byId);

router.post(
  '/create',
  limit(60),
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
