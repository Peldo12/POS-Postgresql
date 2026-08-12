const AppError = require("../common/utils/AppError");

async function create(options) {
  const { client, user, payment } = options;
  const { id, role } = user;
  const { total, method } = payment;

  const { rows } = await client.query(
    `
    INSERT INTO orders 
      (user_id, role, total, method)
    VALUES 
      ($1, $2, $3, $4)
    RETURNING id
    `,
    [id, role, total, method],
  );
  return rows[0];
}

async function getSell(client, id) {
  return await client.query(
    `
    SELECT sell::int
    FROM products 
    WHERE id = $1
    `,
    [id],
  );
}

async function detail(options) {
  const { client, orderId, productId, quantity, realPrice } = options;
  await client.query(
    `
    INSERT INTO order_items (
      order_id, 
      product_id, 
      quantity,
      sell
    ) 
    VALUES
      ($1, $2, $3, $4)
    `,
    [orderId, productId, quantity, realPrice],
  );
}

async function updateStock(options) {
  const { client, quantity, id } = options;
  await client.query(
    `
    UPDATE products
    SET stock = stock - $1
    WHERE id = $2 AND stock >= $1
    `,
    [quantity, id],
  );
}

async function orderJoin(filters) {
  const {
    productId,
    method,
    page = 1,
    limit = 10,
    sort = "id",
    orderBy = "ASC",
  } = filters;

  const offset = (page - 1) * limit;

  let whereClause = "WHERE o.deleted_at IS NULL";
  const params = [];

  if (productId) {
    params.push(productId);
    whereClause += ` AND product_id = $${params.length}`;
  }

  if (method) {
    params.push(method);
    whereClause += ` AND method = $${params.length}`;
  }

  const countSql = `SELECT COUNT(*) FROM orders o ${whereClause}`;

  let orderSql = `
  SELECT 
    o.id, o.user_id, o.role,
    COUNT(i.product_id)::int AS total_items,
    SUM(i.sell * i.quantity)::int AS total,
    o.method
  FROM orders o
  JOIN order_items i
  ON i.order_id = o.id
  ${whereClause}
  GROUP BY o.id
  `;
  const allowSortBy = ["id", "user_id", "role", "method", "total"];
  if (!allowSortBy.includes(sort))
    throw new AppError(400, "Invalid sort column");

  const direction = orderBy.toUpperCase() === "DESC" ? "DESC" : "ASC";
  orderSql += ` ORDER BY o.${sort} ${direction}`;

  params.push(limit, offset);
  orderSql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

  const [countRes, orderRes] = await Promise.all([
    pool.query(countSql),
    pool.query(orderSql, params),
  ]);

  return {
    orders: orderRes.rows,
    pagination: {
      page: +page,
      limit: +limit,
      total: countRes.rows[0].count,
    },
  };
}

async function orderById(id) {
  const { rows } = await pool.query(
    `
  SELECT 
    o.id,
    o.user_id,
    o.role,
    COUNT(i.product_id)::int AS total_items,
    SUM(i.sell * i.quantity)::int AS total,
    o.method
  FROM orders o
  JOIN order_items i
  ON i.order_id = o.id
  WHERE o.id = $1
  GROUP BY o.id
  `,
    [id],
  );
  return rows;
}

module.exports = { create, getSell, detail, updateStock, orderJoin, orderById };
