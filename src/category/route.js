<<<<<<< HEAD
const express = require('express')
const router = express.Router()

const { authenticate } = require('../common/middleware/authentication')

const { categories, byId, create, update, remove, restore } = require('./controller')

const validateBody = require('../common/middleware/validateBody')
const validateParams = require('../common/middleware/validateParams')
const { categorySchema, idSchema } = require('./validator')

const limit = require('../common/middleware/limiter')
const { transactionLimit } = require('../config/rateLimitConfig')
const { fiveMin } = require('../config/rateLimitTime')

const authorize = require('../common/middleware/authorize')
const { USER, ADMIN, OWNER, SUPER_ADMIN } = require('../constants/roles')

const all = [USER, ADMIN, OWNER, SUPER_ADMIN]
const strict = [ADMIN, OWNER, SUPER_ADMIN]

router.use(authenticate)

router.get("/", authorize(all), categories)
router.get(
  "/:id", 
  authorize(all),
  validateParams(idSchema),
  byId
)

router.post(
  "/create",
  limit(transactionLimit, fiveMin),
  authorize(strict), 
  validateBody(categorySchema), 
  create
)

router.put(
  "/:id/update", 
=======
const express = require('express');
const router = express.Router();

const {
  authenticate,
  limit,
  validateBody,
  validateParams,
  validateQuery,
  idSchema,
  authorize,
} = require('../config/baseConfig');

const {
  categories,
  byId,
  create,
  update,
  remove,
  restore,
} = require('./controller');
const { categorySchema } = require('./validator');

const { transactionLimit } = require('../config/rateLimitConfig');
const { fiveMin } = require('../config/rateLimitTime');

const { USER, ADMIN, OWNER, SUPER_ADMIN } = require('../constants/roles');

const all = [USER, ADMIN, OWNER, SUPER_ADMIN];
const strict = [ADMIN, OWNER, SUPER_ADMIN];

router.use(authenticate);

router.get('/', authorize(all), categories);
router.get('/:id', authorize(all), validateParams(idSchema), byId);

router.post(
  '/create',
  limit(transactionLimit, fiveMin),
  authorize(strict),
  validateBody(categorySchema),
  create
);

router.put(
  '/:id/update',
>>>>>>> wip
  limit(transactionLimit, fiveMin),
  authorize(strict),
  validateParams(idSchema),
  validateBody(categorySchema),
  update
<<<<<<< HEAD
)

router.patch(
  "/:id/remove", 
=======
);

router.patch(
  '/:id/remove',
>>>>>>> wip
  limit(transactionLimit),
  validateParams(idSchema),
  authorize(strict),
  remove
<<<<<<< HEAD
)

router.patch(
  "/:id/restore", 
=======
);

router.patch(
  '/:id/restore',
>>>>>>> wip
  limit(transactionLimit),
  validateParams(idSchema),
  authorize(strict),
  restore
<<<<<<< HEAD
)

module.exports = router
=======
);

module.exports = router;
>>>>>>> wip
