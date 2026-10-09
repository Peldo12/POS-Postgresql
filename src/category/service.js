const model = require('./model');
const redis = require('./redis');
const AppError = require('../common/utils/AppError');

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
    options: {
      EX: 300,
    },
  });
  return db;
}

async function createOrUpdate(options) {
  const { name, description, update, key } = options;
  let result = {};
  if (!update) {
    const found = await categories({ name });
    if (found.length !== 0)
      throw new AppError(400, `Category ${name} already exists`);
    result = await model.createCategory(options);
  } else {
    result = await model.updateCategory(options);
  }
  try {
    const list = await categories({ key: 'categories:all' });
    const keyAll = list.map((el) => (el.id = `categories:${el.id}`));
    keyAll.push('categories:all');

    await redis.removeInvalid(keyAll);
  } catch (error) {
    console.log(error.message, (stack = error.stack));
  }

  return result;
}

module.exports = { categories, createOrUpdate };
