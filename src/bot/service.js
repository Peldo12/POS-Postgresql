const model = require("./model");

async function create(options) {
  try {
    await model.create(options);
  } catch (error) {
    throw error;
  }
}

module.exports = { create };
