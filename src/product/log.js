const { productByIdentifier } = require("./model");

async function create(options) {
  try {
    const { client, action, userId, data } = options;
    const id = data.id;
    const old = await productByIdentifier({ id });
    await client.query(
      `
      INSERT INTO product_log
        (product_id, user_id, action, old_data, new_data)
      VALUES
        ($1, $2, $3, $4, $5)
    `,
      [id, userId, action, old, data],
    );
  } catch (error) {
    throw error;
  }
}

module.exports = { create };
