const { getCategories, getCategoryIdentifier, createCategory, updateCategory, removeOrRestoreCategory } = require('./model')
const success = require('../common/helpers/response')
const dateNow = require('../common/helpers/date')
const AppError = require('../common/utils/AppError')

/**
 * @desc get all categories
 * @route GET /api/categories
 * @access Atleast email verfied
 */
async function categories(req, res, next) {
  try {
    const result = await getCategories({})
    success({
      message: "Categories are loaded",
      data: { categories: result },
      res
    })
    req.logger.info(`Categories loaded by ${req.user?.username}`, {
      user: req.user.username,
      requested_at: dateNow('iso')
    })
  } catch (e) {
    req.logger.error("Failed onload categories load", {error: e})
    next(e)
  }
}

/**
 * @desc get categories by ID
 * @route GET /api/categories/:id
 * @access Atleast admin or higher and email verfied
 */
async function byId(req, res, next) {
  try {
    const { id } = req.params
    if (isNaN(id)) throw new AppError(400, "Invalid id")
    
    const result = await getCategoryIdentifier({id})
    if (!result) throw new AppError(404, 'Category not found')
    
    success({
      message: `Category id ${id}`,
      data: {categories: [result]},
      res
    })
    req.logger.info(`Category id loaded by ${req.user?.username}`, {
      user: req.user.username,
      requested_at: dateNow('iso')
    })
  } catch (e) {
    req.logger.error("Failed onload category id", {error: e})
    next(e)
  }
}

/**
 * @desc create a category
 * @route POST /api/categories/create
 * @access Atleast admin or higher and email verfied
 */
async function create(req, res, next) {
  try {
    const { name, description } = req.body
    const found = await getCategoryIdentifier({name})
    if (found) throw new AppError(400, `Category ${name} already exists`)
    
    const result = await createCategory({
      name, 
      description
    })
    success({
      statusCode: 201, 
      message: `Category ${result[0].name} created`,
      data: {categories: result},
      res
    })
    req.logger.info(`Category ${name} created by ${req.user?.username}`, {
      user: req.user.username,
      created_at: dateNow('iso')
    })
  } catch (e) {
    req.logger.error("Failed on create category", {error: e})
    next(e)
  }
}

/**
 * @desc update category by ID
 * @route PUT /api/categories/:id/update
 * @access Atleast admin or higher and email verfied
 */
async function update(req, res, next) {
  try {
    const { id } = req.params
    const found = await getCategoryIdentifier({id})
    if (!found) throw new AppError(404, 'Category not found')

    const { name, description } = req.body
    
    const result = await updateCategory({name, description, id})
    success({
      message: `Category ${name} updated`,
      data: {categories: result},
      res
    })
    req.logger.info(`Category ${name} updated by ${req.user?.username}`, {
      user: req.user.username,
      updated_at: dateNow('iso')
    })
  } catch (e) {
    req.logger.error("Failed on update category", {error: e})
    next(e)
  }
}

/**
 * @desc remove category by ID
 * @route PATCH /api/categories/:id/remove
 * @access Atleast admin or higher and email verfied
 */
async function remove(req, res, next) {
  try {
    const { id } = req.params
    const found = await getCategoryIdentifier({id})
    if (!found) throw new AppError(404, 'Category not found')
    
    const result = await removeOrRestoreCategory({
      id,
      value: dateNow()
    })
    success({
      message: `Category ${result.name} deleted`,
      data: {categories: [result]},
      res
    })
    req.logger.info(`Category ${result.name} removed by ${req.user?.username}`, {
      user: req.user.username,
      removed_at: dateNow('iso')
    })
  } catch (e) {
    req.logger.error("Failed on remove category", {error: e})
    next(e)
  }
}

/**
 * @desc restore category by ID
 * @route PATCH /api/categories/:id/restore
 * @access Atleast admin or higher and email verfied
 */
async function restore(req, res, next) {
  try {
    const { id } = req.params
    const found = await getCategoryIdentifier({id})
    if (!found) throw new AppError(404, 'Category not found')
    
    const result = await removeOrRestoreCategory({id})
    success({
      message: `Category ${result.name} restored`,
      data: {categories: [result]},
      res
    })
    req.logger.info(`Category ${result.name} restored by ${req.user?.username}`, {
      user: req.user.username,
      restored_at: dateNow('iso')
    })
  } catch (e) {
    req.logger.error("Failed on restore category", {error: e})
    next(e)
  }
}

module.exports = { categories, byId, create, update, remove, restore }