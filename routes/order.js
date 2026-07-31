const express = require('express')
const router = express.Router()

const { orders, byId, create } = require('../controllers/order')
const { authenticate } = require('../middleware/authentication')

const limit = require('../middleware/limiter')
const {
  transactionLimit
} = require('../config/rateLimitConfig')
const { 
  oneMin,
  fiveMin
} = require('../config/rateLimitTime')

const validateBody = require('../middleware/validateBody')
const validateQuery = require('../middleware/validateQuery')
const {
  createSchema, filterSchema 
} = require('../validations/order')

const authorize = require('../middleware/authorize')
const { USER, ADMIN, OWNER, SUPER_ADMIN } = require('../constants/roles')

const all = [USER, ADMIN, OWNER, SUPER_ADMIN]
const strict = [ADMIN, OWNER, SUPER_ADMIN]

router.use(authenticate)

router.get(
  "/",
  limit(25, fiveMin), 
  authorize(all), 
  validateQuery(filterSchema),
  orders
)

router.get(
  "/:id",
  byId
)

router.post(
  "/create",
  limit(transactionLimit, oneMin),
  authorize(strict), 
  validateBody(createSchema), 
  create
)

module.exports = router