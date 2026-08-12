const pool = require('../config/pool');
const info = require('./info');
const log = require('./log');
const model = require('./model');

async function getProducts(filters) {
  try {
    return await model.productJoin(filters);
  } catch (error) {
    throw error;
  }
}

async function getById(options) {
  try {
    return await model.productByIdentifier(options);
  } catch (error) {
    throw error;
  }
}

async function createProduct(options) {
  const client = await pool.connect();
  try {
    const { product, user } = options;
    await client.query('BEGIN');

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
      action: 'CREATE',
      userId: user.id,
      data: { ...product, id: result[0].id },
      refId: result[0].id,
      refType: 'PRODUCT',
    });

    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.release();
  }
}

async function updateProduct(options) {
  const client = await pool.connect();
  try {
    const { product, user } = options;
    await client.query('BEGIN');

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
      action: 'UPDATE',
      userId: user.id,
      data: product,
      refId: product.id,
      refType: 'PRODUCT',
    });

    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.release();
  }
}

async function removeOrRestoreProduct(options) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id, value = null, user } = options;
    let action = value ? 'REMOVE' : 'RESTORE';

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
      refId: result.id,
      refType: 'PRODUCT',
    });

    await client.query('COMMIT');
    const product = await model.productByIdentifier({ id });
    return product;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.release();
  }
}

async function permanentDelete() {
  const client = await pool.connect();
  try {
    const result = await model.permanentRemoveProduct(id);

    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

module.exports = {
  getProducts,
  getById,
  createProduct,
  updateProduct,
  removeOrRestoreProduct,
  permanentDelete,
};
