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
  limit(transactionLimit, fiveMin),
  authorize(strict),
  validateParams(idSchema),
  validateBody(categorySchema),
  update
)

router.patch(
  "/:id/remove", 
  limit(transactionLimit),
  validateParams(idSchema),
  authorize(strict),
  remove
)

router.patch(
  "/:id/restore", 
  limit(transactionLimit),
  validateParams(idSchema),
  authorize(strict),
  restore
)

module.exports = router