const model = require("./model");
const agent = require("../config/agent");

async function create(options) {
  try {
    const result = await model.create(options);
    return result.id;
  } catch (error) {
    throw error;
  }
}

async function byId(id) {
  try {
    return await model.byId(id);
  } catch (error) {
    throw error;
  }
}

async function answer(prompt) {
  try {
    const result = await agent(prompt || "");

    return await result;
  } catch (error) {
    throw error;
  }
}

module.exports = { create, byId, answer };
