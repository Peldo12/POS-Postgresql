const model = require('./model');
const AppError = require('../common/utils/AppError');

async function categories(options) {
  return await model.getCategories(options);
}

async function createOrUpdate(options) {
  const { name, description, update } = options;

  if (!update) {
    const found = await categories({ name });
    if (found.length !== 0)
      throw new AppError(400, `Category ${name} already exists`);
    return await model.createCategory(options);
  }
  return await model.updateCategory(options);
}

module.exports = { categories, createOrUpdate };
