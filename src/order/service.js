const model = require("./model");
const pool = require("../config/pool");

async function orders(filters) {
  try {
    return await model.orderJoin(filters)
  } catch (error) {
    throw error
  }
}

async function byId(id) {
  try {
    return await model.orderById(id)
  } catch (error) {
    throw error
  }
}

async function create(options) {
  const client = await pool.connect();
  try {
    const { user, products, payment } = options;
    const result = [];
    let sumTotal = 0;

    await client.query("BEGIN");

    const order = await model.create({
      client,
      user,
      payment,
    });

    for (let product of products) {
      const { id, quantity, sell } = product;
      const item = await model.getSell(client, id);

      if (item.rowCount === 0) throw new AppError(404, "Product not found");
      if (item.rows[0].sell !== sell)
        throw new AppError(400, `Invalid price product ${id}`);
      const realPrice = item.rows[0].sell;
      sumTotal += realPrice * quantity;

      await model.detail({
        client,
        orderId: order.id,
        productId: id,
        quantity,
        realPrice,
      });

      const updateProduct = await model.updateStock({
        client,
        quantity,
        id,
      });
      if (updateProduct.rowCount === 0)
        throw new AppError(400, `Insufficient stock for product ${id}`);

      result.push({ status: "success", product: id });
    }

    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.release();
  }
}

module.exports = { orders, create };
