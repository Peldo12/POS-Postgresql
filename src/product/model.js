const pool = require('../config/pool');
const AppError = require('../common/utils/AppError');

async function productByIdentifier(options) {
  const { id, sku, name } = options;
  let sql = `
    SELECT p.*, pi.deleted_at, pi.deleted_by 
    FROM products p
    LEFT JOIN product_info pi
    ON pi.product_id = p.id
    WHERE 1=1`;
  const params = [];
  if (id) {
    params.push(id);
    sql += ` AND p.id = $${params.length}`;
  }
  if (sku) {
    params.push(sku);
    sql += ` AND p.sku = $${params.length}`;
  }
  if (name) {
    params.push(name);
    sql += ` AND p.name LIKE %${name}%`;
  }

  const { rows } = await pool.query(sql, params);
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
    image
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
      image
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
    id
  } = product;

  const { rows } = await client.query(
    `UPDATE products p
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
      id
    ]
  );
  return rows;
}

async function updateStockProduct(data) {
  const result = [];
  const client = pool.connect();
  try {
    await client.query('BEGIN');
    for (const product of data) {
      const { updateStock, id } = product;
      const sql = `
      UPDATE products
      SET stock = stock + $1 
      WHERE id = $2 AND stock >= $1`;
      const stockUpdate = await client.query(sql, [updateStock, id]);
      if (stockUpdate.rowCount === 0)
        throw new AppError(400, `Insufficient stock product ${id}`);
      result.push({ id, status: 'success' });
    }
    await client.query('COMMIT');
    return { item: result };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    await client.release();
  }
}

async function removeOrRestore(options) {
  const { client, id, value = null, user } = options;
  const params = [];
  params.push(value);
  let setClause = `
      UPDATE product_info
      SET deleted_at = $${params.length}
    `;
  if (value) {
    params.push(user.id);
    setClause += `, deleted_by = $${params.length}`;
  } else {
    setClause += `, deleted_by = NULL`;
  }
  params.push(id);
  const { rows } = await client.query(
    `${setClause}
      WHERE product_id = $${params.length}
      RETURNING product_id::int`,
    params
  );

  return rows;
}

async function permanentRemoveProduct(id) {
  const { rows } = await pool.query(
    `
  DELETE FROM products
  WHERE id = $1
  `,
    [id]
  );

  return rows;
}

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
    orderBy = 'ASC'
  } = filters;

  const offset = (page - 1) * limit;

  let whereClause = 'WHERE pi.deleted_at IS NULL';
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    whereClause += ` AND p.name ILIKE $${params.length}`;
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
    SELECT p.id, p.sku, p.barcode, p.name, c.name AS category, p.buy::int, p.sell::int, p.image 
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
    pool.query(sql, params)
  ]);

  return {
    products: dataResult.rows,
    pagination: {
      page: +page,
      limit: +limit,
      total: +countResult.rows[0].count
    }
  };
}

async function statsProduct() {
  const sql = `
    SELECT COUNT(*) 
    FROM products p
    JOIN product_info pi
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
    `)
  ]);

  return {
    stats: {
      products: +product.rows[0].count,
      categories: +categories.rows[0].count,
      low: +low.rows[0].count
    }
  };
}

module.exports = {
  productByIdentifier,
  create,
  update,
  updateStockProduct,
  removeOrRestore,
  permanentRemoveProduct,
  productJoin,
  statsProduct
};
