const pool = require("../config/pool");
const info = require("./info");
const log = require("./log");
const model = require("./model");

async function createProduct(options) {
  const client = await pool.connect();
  try {
    const { product, user } = options;
    await client.query("BEGIN");

    const result = await model.create({
      client,
      product,
    });
    await info.create({
      client,
      productId: result[0].id,
      userId: user.id,
    });
    await log.create({
      client,
      action: "UPDATE",
      userId: user.id,
      data: { ...product, id: result[0].id },
    });

    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.release();
  }
}

async function updateProduct(options) {
  const client = await pool.connect();
  try {
    const { product, user } = options;
    await client.query("BEGIN");

    const result = await model.update({
      client,
      product,
    });
    await info.create({
      client,
      productId: product.id,
      userId: user.id,
    });
    await log.create({
      client,
      action: "UPDATE",
      userId: user.id,
      data: product,
    });

    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.release();
  }
}

async function removeOrRestoreProduct(options) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { id, value = null, user } = options;
    let action = value ? "REMOVE" : "RESTORE";

    const result = await model.removeOrRestore({
      client,
      ...options,
    });
    const old = await model.productByIdentifier({ id });

    await log.create({
      client,
      userId: user.id,
      action,
      data: old,
    });

    await client.query("COMMIT");
    const product = await model.productByIdentifier({ id });
    return product;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.release();
  }
}

module.exports = { createProduct, updateProduct, removeOrRestoreProduct };
