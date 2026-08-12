const { productByIdentifier } = require('./model');

async function create(options) {
  try {
    const { client, action, userId, data, refId, refType } = options;
    const id = data.id;
    const old = await productByIdentifier({ id });
    await client.query(
      `
      INSERT INTO product_log
        (product_id, user_id, action, old_data, new_data, refer_type, refer_id)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7)
    `,
      [id, userId, action, old, data, refType, refId]
    );
  } catch (error) {
    throw error;
  }
}

module.exports = { create };
