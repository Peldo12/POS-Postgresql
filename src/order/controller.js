const generateToken = require("../common/helpers/token");
const generateCrypto = require("../common/helpers/crypto");
const dateNow = require("../common/helpers/date");

const service = require("./service");
const { orderJoin, orderById } = require("./model");
const success = require("../common/helpers/response");
const sendEmail = require("../common/helpers/email");
const AppError = require("../common/utils/AppError");

async function orders(req, res, next) {
  try {
    if (!req.user) throw new AppError(401, "Unauthenticated");
    const filters = {
      productId: req.query.productId || "",
      method: req.query.method || "",
      page: +req.query.page || 1,
      limit: +req.query.limit || 10,
      sort: req.query.sort || "id",
      orderBy: req.query.order || "ASC",
    };

    const data = await service.orders(filters);

    success({
      message: "Orders are loaded",
      data,
      res,
    });
    req.logger.info(`Orders requested by ${req.user.username}`, {
      user: req.user.username,
      requested_at: dateNow("iso"),
    });
  } catch (error) {
    req.logger.error("Failed on request orders", { error });
    next(error);
  }
}

async function byId(req, res, next) {
  try {
    const data = await service.byId(req.params.id);
    success({
      message: `Order id ${req.params.id} loaded`,
      data: { orders: data },
      res,
    });
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    if (!req.user) throw new AppError(401, "Unauthenticated");
    const { products, payment } = req.body;
    if (!Array.isArray(products) || products.length === 0)
      throw new AppError(400, "Invalid or empty transactions");
    const data = await service.create({
      user: {
        id: req.user.id,
        role: req.user.role,
      },
      products,
      payment: {
        method: payment.method,
        total: payment.total,
      },
    });
    success({
      message: "Orders successfuly saved",
      data,
      res,
    });
    req.logger.info(`Order created by user ${req.user.username}`, {
      user: req.user.username,
      created_at: dateNow("iso"),
    });
  } catch (error) {
    req.logger.error("Failed on create order", { error });
    next(error);
  }
}

module.exports = { orders, byId, create };
