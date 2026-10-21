const { productJoin } = require('./model');

async function create(options) {
  const { client, action, userId, data, refId, refType } = options;
  const id = data.id;
  const { products } = await productJoin({ id });
  await client.query(
    `
      INSERT INTO product_log
        (product_id, user_id, action, old_data, new_data, refer_type, refer_id)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7)
    `,
    [id, userId, action, products[0], data, refType, refId]
  );
}

module.exports = { create };
