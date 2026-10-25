const { pool } = require('../config/pool');

async function productJoin(filters) {
  const {
    page = 1,
    limit = 10,
    search,
    range,
    categoryId,
    minPrice,
    maxPrice,
    sort = 'id',
    orderBy = 'ASC',
    id,
    sku,
    deleted = false,
  } = filters;

  const offset = (page - 1) * limit;

  let whereClause = deleted
    ? 'WHERE pi.deleted_at IS NOT NULL'
    : 'WHERE pi.deleted_at IS NULL';
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    whereClause += ` AND p.name ILIKE $${params.length}`;
  }

  if (id) {
    params.push(id);
    whereClause += ` AND p.id = $${params.length}`;
  }
  if (sku) {
    params.push(sku);
    whereClause += ` AND p.sku = $${params.length}`;
  }

  if (categoryId) {
    params.push(categoryId);
    whereClause += ` AND p.category_id = $${params.length}`;
  }
  if (range === 'price' && minPrice && maxPrice) {
    params.push(minPrice, maxPrice);
    whereClause += ` AND sell BETWEEN $${params.length - 1} AND $${params.length}`;
  }

  const countSql = `
  SELECT COUNT(*) 
  FROM products p
  JOIN product_info pi
  ON pi.product_id = p.id
  ${whereClause}`;

  let sql = `
    SELECT p.id, p.sku, p.barcode, p.name, 
      c.name AS category, p.buy::int, p.sell::int,
      p.image, pi.deleted_at
    FROM products p 
    JOIN categories c 
    ON p.category_id = c.id 
    JOIN product_info pi
    ON pi.product_id = p.id
    ${whereClause}`;
  const direction = orderBy.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
  sql += ` ORDER BY p.${sort} ${direction}`;

  params.push(limit, offset);
  sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

  const [countResult, dataResult] = await Promise.all([
    pool.query(countSql, params.slice(0, params.length - 2)),
    pool.query(sql, params),
  ]);

  return {
    products: dataResult.rows,
    pagination: {
      page: +page,
      limit: +limit,
      total: +countResult.rows[0].count,
    },
  };
}

async function getPrice(client, id) {
  const { rows } = await pool.query(
    `
    SELECT name, sell::int
    FROM products 
    WHERE id = $1
    `,
    [id]
  );

  return rows[0];
}

async function create(options) {
  const { client, product } = options;
  const {
    sku,
    barcode,
    name,
    buy,
    sell,
    category_id,
    stock,
    minimum_stock,
    weight,
    image,
  } = product;

  const { rows } = await client.query(
    `INSERT INTO products 
        (sku, barcode, name,
        buy, sell, category_id, 
        stock, minimum_stock, 
        weight, image) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, sku, barcode, name, buy::int, sell::int,
      category_id, stock::int, minimum_stock::int, weight::int, image`,
    [
      sku,
      barcode,
      name,
      buy,
      sell,
      category_id,
      stock,
      minimum_stock,
      weight,
      image,
    ]
  );

  return rows;
}

async function update(options) {
  const { client, product } = options;
  const {
    sku,
    barcode,
    name,
    buy,
    sell,
    category_id,
    stock,
    minimum_stock,
    weight,
    image,
    id,
  } = product;

  const { rows } = await client.query(
    `UPDATE products
      SET 
        sku = $1, barcode = $2, name = $3,
        buy = $4, sell = $5, category_id = $6,
        stock = $7, minimum_stock = $8,
        weight = $9, image = $10
      WHERE id = $11 
      RETURNING id, sku, barcode, name, buy::int, sell::int,
      category_id, stock::int, minimum_stock::int, weight::int,
      image`,
    [
      sku,
      barcode,
      name,
      buy,
      sell,
      category_id,
      stock,
      minimum_stock,
      weight,
      image,
      id,
    ]
  );
  return rows;
}

async function increaseStock(options, client) {
  const { quantity, id } = options;
  const sql = `
      UPDATE products
      SET stock = stock + $1 
      WHERE id = $2`;

  return await client.query(sql, [quantity, id]);
}

async function decreaseStock(options, client) {
  const { id, quantity } = options;

  const sql = `
    UPDATE products
    SET stock = stock + $1
    WHERE id = $2
      AND stock >= ABS($1)
  `;

  return await client.query(sql, [quantity, id]);
}

async function removeOrRestore(options) {
  const { client, id, value = null } = options;
  const params = [];
  params.push(value);
  const setClause = `
      UPDATE product_info
      SET deleted_at = $${params.length}
    `;
  params.push(id);
  const { rows } = await client.query(
    `${setClause}
      WHERE product_id = $${params.length}
      RETURNING product_id::int`,
    params
  );

  return rows;
}

async function permanentRemoveProduct({ client, id }) {
  const { rows } = await client.query(
    `
  DELETE FROM products
  WHERE id = $1
  `,
    [id]
  );

  return rows;
}

async function statsProducts() {
  const sql = `
    SELECT COUNT(*)
    FROM products p
    LEFT JOIN product_info pi
    ON pi.product_id = p.id
  `;
  const [product, categories, low] = await Promise.all([
    pool.query(`
      ${sql}
      WHERE pi.deleted_at IS NULL
    `),
    pool.query(`
      SELECT COUNT(*)
      FROM categories
      WHERE deleted_at IS NULL
    `),
    pool.query(`
      ${sql}
      WHERE 
        pi.deleted_at IS NULL 
        AND p.stock <= p.minimum_stock
    `),
  ]);

  return {
    stats: {
      products: +product.rows[0].count,
      categories: +categories.rows[0].count,
      low: +low.rows[0].count,
    },
  };
}

module.exports = {
  productJoin,
  getPrice,
  create,
  update,
  increaseStock,
  decreaseStock,
  removeOrRestore,
  permanentRemoveProduct,
  statsProducts,
};
