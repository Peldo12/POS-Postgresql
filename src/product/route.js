// module
const express = require("express");
const router = express.Router();

const {
  products,
  byId,
  create,
  update,
  updateStock,
  remove,
  restore,
  stats,
} = require("./controller");
const { authenticate } = require("../common/middleware/authentication");

const limit = require("../common/middleware/limiter");
const { transactionLimit } = require("../config/rateLimitConfig");
const { oneMin, fiveMin } = require("../config/rateLimitTime");

const validateBody = require("../common/middleware/validateBody");
const validateParams = require("../common/middleware/validateParams");
const validateQuery = require("../common/middleware/validateQuery");
const { idSchema } = require('../common/global')
const {
  createProductSchema,
  updateProductSchema,
  updateStockSchema,
  filterSchema,
} = require("./validator");

const authorize = require("../common/middleware/authorize");
const { USER, ADMIN, OWNER, SUPER_ADMIN } = require("../constants/roles");

// constants
const all = [USER, ADMIN, OWNER, SUPER_ADMIN];
const strict = [ADMIN, OWNER, SUPER_ADMIN];

//middleware
router.use(authenticate);

// endpoint
router.get("/stats", authorize(all), stats);

router.get("/", authorize(all), validateQuery(filterSchema), products);

router.get("/:id", authorize(all), validateParams(idSchema), byId);

router.post(
  "/create",
  limit(transactionLimit, fiveMin),
  authorize(strict),
  validateBody(createProductSchema),
  create,
);

router.put(
  "/:id/update",
  limit(transactionLimit, fiveMin),
  authorize(strict),
  validateParams(idSchema),
  validateBody(updateProductSchema),
  update,
);

router.patch(
  "/stocks/update",
  limit(transactionLimit, fiveMin),
  authorize(strict),
  validateBody(updateStockSchema),
  updateStock,
);

router.patch(
  "/:id/remove",
  limit(transactionLimit, fiveMin),
  authorize(strict),
  validateParams(idSchema),
  remove,
);

router.patch(
  "/:id/restore",
  limit(transactionLimit, fiveMin),
  authorize(strict),
  validateParams(idSchema),
  restore,
);

module.exports = router;
