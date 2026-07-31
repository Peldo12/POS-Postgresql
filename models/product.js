const pool = require("../config/pool");
const AppError = require("../utils/AppError");

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

async function createProduct(options) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { product, user } = options;
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
      RETURNING *`,
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
      ],
    );

    await updateProductInfo({
      client,
      productId: rows[0].id, 
      userId: user.id
    });
    await createProductLog({
      client,
      userId: user.id,
      action: 'CREATE',
      data: {...product, id : rows[0].id}
    })

    await client.query("COMMIT");
    return rows;
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
    await client.query("BEGIN");
    const { product, user } = options;
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
      `UPDATE products p
      SET 
        sku = $1, barcode = $2, name = $3,
        buy = $4, sell = $5, category_id = $6,
        stock = $7, minimum_stock = $8,
        weight = $9, image = $10
      WHERE id = $11 
      RETURNING id, sku, barcode, name, buy, sell,
      category_id, stock, minimum_stock, weight,
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
      ],
    );

    await updateProductInfo({
      client,
      productId: id, 
      userId: user.id
    });
    await createProductLog({
      client,
      userId: user.id,
      action: 'CREATE',
      data: {...product, id : rows[0].id}
    })

    await client.query("COMMIT");
    return rows;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.release();
  }
}

async function updateProductInfo(options) {
  const { client, productId, userId } = options
  await client.query(
    `
    INSERT INTO product_info 
      (product_id, created_by, updated_by)
    VALUES
      ($1, $2, $2)
    ON CONFLICT (product_id)
    DO UPDATE
    SET
      product_id = EXCLUDED.product_id,
      updated_at = NOW(),
      updated_by = EXCLUDED.updated_by
  `,
    [productId, userId || "Anonymous"],
  );
}

async function createProductLog(options) {
  try {
    const { client, action, userId, data } = options
    const id = data.id
    const old = await productByIdentifier({id})
    await client.query(
      `
      INSERT INTO product_log
        (product_id, user_id, action, old_data, new_data)
      VALUES
        ($1, $2, $3, $4, $5)
    `,
      [id, userId, action, old, data]
    )
  } catch (error) {
    throw error
  }
}

async function updateStockProduct(data) {
  const result = [];
  const client = pool.connect();
  try {
    await client.query("BEGIN");
    for (const product of data) {
      const { updateStock, id } = product;
      const sql = `
      UPDATE products
      SET stock = stock + $1 
      WHERE id = $2 AND stock >= $1`;
      const stockUpdate = await client.query(sql, [updateStock, id]);
      if (stockUpdate.rowCount === 0)
        throw new AppError(400, `Insufficient stock product ${id}`);
      result.push({ id, status: "success" });
    }
    await client.query("COMMIT");
    return { item: result };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    await client.release();
  }
}

async function removeOrRestoreProduct(options) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { id, value = null, user } = options;
    const params = [];
    let action = value ? 'REMOVE' : 'RESTORE'
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
      RETURNING product_id`,
      params,
    );
    const old = await productByIdentifier({id})

    await updateProductInfo({
      client,
      productId: id, 
      userId: user.id
    });
    await createProductLog({
      client,
      userId: user.id,
      action,
      data: old
    })
    
    await client.query("COMMIT");
    const product = await productByIdentifier({ id });
    return product;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.release();
  }
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
    sort = "id",
    orderBy = "ASC",
  } = filters;

  const offset = (page - 1) * limit;

  let whereClause = "WHERE pi.deleted_at IS NULL";
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    whereClause += ` AND p.name ILIKE $${params.length}`;
  }
  if (categoryId) {
    params.push(categoryId);
    whereClause += ` AND p.category_id = $${params.length}`;
  }
  if (range === "price" && minPrice && maxPrice) {
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
    SELECT p.id, p.sku, p.barcode, p.name, c.name AS category, p.buy, p.sell, p.image 
    FROM products p 
    JOIN categories c 
    ON p.category_id = c.id 
    JOIN product_info pi
    ON pi.product_id = p.id
    ${whereClause}`;
  const direction = orderBy.toUpperCase() === "DESC" ? "DESC" : "ASC";
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
  productByIdentifier,
  createProduct,
  updateProduct,
  updateStockProduct,
  removeOrRestoreProduct,
  productJoin,
  statsProduct,
};
