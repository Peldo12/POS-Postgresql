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
  const { name, description, update, key } = options;
  let result = {};
  if (!update) {
    const found = await categories({ name, key });
    for (let item of found) {
      if (item.name === name)
        throw new AppError(400, `Category ${name} already exists`);
    }
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
