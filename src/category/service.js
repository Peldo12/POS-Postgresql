const path = require('path');

const model = require('./model');
const redis = require(path.join(__dirname, '../config/redis'));
const AppError = require(path.join(__dirname, '../common/utils/AppError'));

async function categories(options) {
  const { key } = options;
  const cache = await redis.get(key);
  if (cache) {
    return cache;
  }

  const db = await model.getCategories(options);
  await redis.save({
    key,
    value: db,
  });
  return db;
}

async function createOrUpdate(options) {
  const { name, update, key } = options;
  let result;
  if (!update) {
    const found = await categories({ name, key });
    for (const item of found) {
      if (item.name === name) {
        throw new AppError(400, `Category ${name} already exists`);
      }
    }
    result = await model.createCategory(options);
  } else {
    result = await model.updateCategory(options);
  }

  await redis.clearCache(['categories', 'category']);

  return result;
}

module.exports = { categories, createOrUpdate };
