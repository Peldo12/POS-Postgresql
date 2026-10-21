const { pool } = require('../config/pool');
const query = require('./query');
const AppError = require('../common/utils/AppError');

async function create(options) {
  const { client, userId, payment } = options;
  const { invoice, subtotal, discount, tax, total, method } = payment;

  const { rows } = await client.query(
    `
    INSERT INTO orders 
      (invoice_number, user_id, subtotal, discount, tax, total, method)
    VALUES 
      ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
    `,
    [invoice, userId, subtotal, discount, tax, total, method]
  );
  return rows[0];
}

async function detail(options) {
  const { client, order } = options;
  const { orderId, productId, productName, quantity, price, subtotal } = order;
  return await client.query(
    `
    INSERT INTO order_items (
      order_id, 
      product_id,
      product_name,
      quantity,
      price,
      subtotal
    ) 
    VALUES
      ($1, $2, $3, $4, $5, $6)
    `,
    [orderId, productId, productName, quantity, price, subtotal]
  );
}

async function decreaseStock({ client, productId, quantity }) {
  return await client.query(
    `
  UPDATE products
  SET stock = stock - $1
  WHERE id = $2
    AND stock >= $1
  RETURNING stock
  `,
    [quantity, productId]
  );
}

async function getOrders(filters) {
  const {
    page = 1,
    limit = 10,
    sort = 'createdAt',
    orderBy = 'DESC',
  } = filters;
  const sortMap = {
    id: 'o.id',
    userId: 'o.user_id',
    method: 'o.method',
    status: 'o.payment_status',
    total: 'o.total',
    createdAt: 'o.created_at',
  };

  const offset = (page - 1) * limit;

  const joinClause = `
    LEFT JOIN users u 
    ON o.user_id = u.id`;
  const { selectClause } = query.buildSelectOrder(filters);
  const { whereClause, params } = query.buildOrderFilter(filters);

  const countParams = [...params];
  const countSql = `SELECT COUNT(*) FROM orders o ${joinClause} ${whereClause}`;

  let orderSql = `
  ${selectClause},
    o.total::int, o.method, o.payment_status, o.created_at
  FROM orders o
  JOIN order_items i
  ON i.order_id = o.id
  ${joinClause}
  ${whereClause}
  GROUP BY o.id, u.username
  `;

  if (!sortMap[sort]) throw new AppError(400, 'Invalid sort column');

  const direction = orderBy.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
  orderSql += ` ORDER BY ${sortMap[sort]} ${direction}`;

  params.push(limit, offset);
  orderSql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

  const [countRes, orderRes] = await Promise.all([
    pool.query(countSql, countParams),
    pool.query(orderSql, params),
  ]);

  return {
    orders: orderRes.rows,
    pagination: {
      page: +page,
      limit: +limit,
      total: +countRes.rows[0].count,
    },
  };
}

async function getItems(filters) {
  const { orderId } = filters;
  const params = [];
  let sql = `
  SELECT 
    i.product_name, i.quantity::int, 
    i.price::int, i.subtotal::int
  FROM order_items i
  JOIN orders o
  ON i.order_id = o.id`;
  if (orderId) {
    params.push(orderId);
    sql += `
    WHERE i.order_id = $${params.length}`;
  }
  const { rows } = await pool.query(sql, params);

  return rows;
}

async function removeOrRestoreOrder({ client, orderId, value }) {
  const { rows } = await client.query(
    `
  UPDATE orders
  SET deleted_at = $1
  WHERE id = $2
  RETURNING id, deleted_at`,
    [value, orderId]
  );

  return rows[0];
}

async function updateStatusOrder({ client, orderId }) {
  const { rows } = await client.query(
    `
  UPDATE orders
  SET payment_status = 'paid'
  WHERE id = $1
  RETURNING id, payment_status
  `,
    [orderId]
  );

  return rows[0];
}

async function orderStats({ range }) {
  let whereClause = 'WHERE o.deleted_at IS NULL';

  if (range) {
    switch (range) {
      case 'today':
        whereClause += `
        AND o.created_at >= CURRENT_DATE
        AND o.created_at < CURRENT_DATE + INTERVAL '1 day'`;
        break;

      case 'week':
        whereClause += `
        AND o.created_at >= DATE_TRUNC('week', CURRENT_DATE)
        AND o.created_at < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 week'`;
        break;

      case 'month':
        whereClause += `
        AND o.created_at >= DATE_TRUNC('month', CURRENT_DATE)
        AND o.created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' `;
        break;

      case 'year':
        whereClause += `
        AND o.created_at >= DATE_TRUNC('year', CURRENT_DATE)
        AND o.created_at < DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year'`;
        break;
    }
  }

  const { rows } = await pool.query(
    `
  SELECT
    COUNT(o.id)::int AS orders,
    COALESCE(SUM(o.total), 0)::int AS omzet,
    COALESCE(SUM(i.items), 0)::int AS items
  FROM orders o
  LEFT JOIN (
      SELECT
          order_id,
          SUM(quantity) AS items
      FROM order_items
      GROUP BY order_id
  ) i ON i.order_id = o.id
  ${whereClause}
  `
  );

  return rows[0];
}

module.exports = {
  create,
  detail,
  decreaseStock,
  getOrders,
  getItems,
  removeOrRestoreOrder,
  orderStats,
};
