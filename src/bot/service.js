const model = require("./model");
const agent = require("../config/agent");

async function create(options) {
  try {
    await model.create(options);
  } catch (error) {
    throw error;
  }
}

async function answer(prompt) {
  try {
    const result = await agent(prompt);

    return await result;
  } catch (error) {
    console.log(error);
  }
}

module.exports = { create, answer };
