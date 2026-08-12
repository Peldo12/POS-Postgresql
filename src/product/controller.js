const { updateStockProduct, statsProduct } = require("./model");
const {
  getProducts,
  getById,
  createProduct,
  updateProduct,
  removeOrRestoreProduct,
  permanentDelete,
} = require("./service");
const success = require("../common/helpers/response");
const dateNow = require("../common/helpers/date");
const AppError = require("../common/utils/AppError");

/**
 * @desc get all products
 * @route GET /api/products
 * @access Atleast email verfied
 */
async function products(req, res, next) {
  try {
    if (!req.user) throw new AppError(401, "Unauthenticated");
    const filters = {
      page: +req.query.page || 1,
      limit: +req.query.limit || 10,
      search: req.query.search || "",
      range: req.query.range || null,
      minPrice: req.query.minPrice !== undefined ? +req.query.minPrice : null,
      maxPrice: req.query.maxPrice ? +req.query.maxPrice : null,
      categoryId: req.query.categoryId ? req.query.categoryId : null,
      sort: req.query.sort || "id",
      orderBy: req.query.orderBy?.toUpperCase() === "DESC" ? "DESC" : "ASC",
    };

    const { products, pagination } = await getProducts(filters);
    req.logger.info(`Products loaded by ${req.user.username}`, {
      user: req.user.username,
      role: req.user.role,
      requested_at: dateNow("iso"),
    });
    success({
      message: "Products are loaded",
      data: { products },
      pagination,
      res,
    });
  } catch (e) {
    req.logger.error("Failed on load products", { error: e });
    next(e);
  }
}

/**
 * @desc get product by ID
 * @route GET /api/product/:id
 * @access Atleast admin or higher and email verfied
 */
async function byId(req, res, next) {
  try {
    if (!req.user) throw new AppError(401, "Unauthenticated");
    const { id } = req.params;

    const product = await getById({ id });
    if (!product) throw new AppError(404, "Product not found");
    success({
      message: `Product id ${id} loaded`,
      data: { products: [product] },
      res,
    });
    req.logger.info(`Product id loaded by ${req.user.username}`, {
      user: req.user.username,
      role: req.user.role,
      requested_at: dateNow("iso"),
    });
  } catch (e) {
    req.logger.error(`Failed on load product ${req.params.id}`, { error: e });
    next(e);
  }
}

/**
 * @desc create a product
 * @route POST /api/product/create
 * @access Atleast admin or higher and email verfied
 */
async function create(req, res, next) {
  try {
    if (!req.user) throw new AppError(401, "Unauthenticated");
    const { sku } = req.body;
    const found = await getById({ sku });
    if (found && sku === found.sku) throw new AppError(400, "SKU already used");

    const product = await createProduct({
      product: req.body,
      user: req.user,
    });

    success({
      statusCode: 201,
      message: `Product ${product[0].name} created`,
      data: { products: product },
      res,
    });
    req.logger.info(
      `Product ${product[0].name} created by ${req.user.username}`,
      {
        user: req.user.username,
        role: req.user.role,
        created_at: dateNow("iso"),
      },
    );
  } catch (e) {
    req.logger.error(`Failed create product ${req.body.name}`, { error: e });
    next(e);
  }
}

/**
 * @desc update product by ID
 * @route PUT /api/categories/:id/update
 * @access Atleast admin or higher and email verfied
 */
async function update(req, res, next) {
  try {
    if (!req.user) throw new AppError(401, "Unauthenticated");
    const { id } = req.params;

    const { sku } = req.body;
    const found = await getById({ id });
    if (!found) throw new AppError(404, "Product not found");
    if (sku !== found.sku) throw new AppError(400, "SKU unable to change");
    const result = await updateProduct({
      product: { ...req.body, id },
      user: req.user,
    });
    success({
      message: `Product ${result[0].name} updated`,
      data: { products: result },
      res,
    });
    req.logger.info(
      `Product ${result[0].name} updated by  ${req.user.username}`,
      {
        user: req.user.username,
        role: req.user.role,
        updated_at: dateNow("iso"),
      },
    );
  } catch (e) {
    req.logger.error(`Failed update product id ${req.params.id}`, { error: e });
    next(e);
  }
}

/**
 * @desc update products stock
 * @route PATCH /api/product/stocks/update
 * @access Atleast admin or higher and email verfied
 */
async function updateStock(req, res, next) {
  try {
    if (!req.user) throw new AppError(401, "Unauthenticated");
    const { transactions } = req.body;
    if (!Array.isArray(transactions) || transactions.length === 0)
      throw new AppError(400, "Invalid or empty transactions");
    const data = await updateStockProduct(transactions);
    success({
      message: "Stocks updated",
      data,
      res,
    });
    req.logger.info(`Products stocks updated by ${req.user.username}`, {
      user: req.user.username,
      role: req.user.role,
      updated_at: dateNow("iso"),
    });
  } catch (e) {
    req.logger.error("Failed update stocks products", { error: e });
    next(e);
  }
}

/**
 * @desc remove product by ID
 * @route PATCH /api/product/:id/remove
 * @access Atleast admin or higher and email verfied
 */
async function remove(req, res, next) {
  try {
    if (!req.user) throw new AppError(401, "Unauthenticated");
    const { id } = req.params;
    const found = await getById({ id });
    if (!found) throw new AppError(404, "Product not found");
    if (found.deleted_at) throw new AppError(400, "Product already deleted");

    const result = await removeOrRestoreProduct({
      id,
      value: dateNow(),
      user: req.user,
    });

    success({
      message: `Product ${result.name} removed`,
      data: { products: [result] },
      res,
    });
    req.logger.info(`Product ${result.name} removed by ${req.user.username}`, {
      user: req.user.username,
      role: req.user.role,
      removed_at: dateNow("iso"),
    });
  } catch (e) {
    req.logger.error(`Failed remove product id ${req.params.id}`, { error: e });
    next(e);
  }
}

/**
 * @desc restore product by ID
 * @route PATCH /api/product/:id/restore
 * @access Atleast admin or higher and email verfied
 */
async function restore(req, res, next) {
  try {
    if (!req.user) throw new AppError(401, "Unauthenticated");
    const { id } = req.params;
    const found = await getById({ id });
    if (!found) throw new AppError(404, "Product not found");
    if (!found.deleted_at) throw new AppError(400, "Product not deleted");

    const result = await removeOrRestoreProduct({
      id,
      user: req.user,
    });
    success({
      message: `Product ${result.name} restored`,
      data: { products: [result] },
      res,
    });
    req.logger.info(`Product ${result.name} restored by ${req.user.username}`, {
      user: req.user.username,
      role: req.user.role,
      requested_at: dateNow("iso"),
    });
  } catch (e) {
    req.logger.error(`Failed restore product id ${req.params.id}`, {
      error: e,
    });
    next(e);
  }
}

async function removePermanent(req, res, next) {
  try {
    const { id } = req.params;
    const found = await getById({ id });
    if (!found) throw new AppError(404, "Product not found");

    const result = await removePermanent(id);
    success({
      message: `Product ${id} permanent deleted`,
      data: { products: [result] },
      res,
    });
  } catch (error) {
    req.logger.error(`Failed permanent delete product ${req.params.id}`, {
      error: e,
    });
    next(e);
  }
}

async function stats(req, res, next) {
  try {
    const data = await statsProduct();
    success({
      message: "Stats products ready",
      data,
      res,
    });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  products,
  byId,
  create,
  update,
  updateStock,
  remove,
  restore,
  removePermanent,
  stats,
};
