async function create(options) {
  const { client, productId } = options;
  await client.query(
    `
    INSERT INTO product_info 
      (product_id)
    VALUES
      ($1)
    ON CONFLICT (product_id)
    DO UPDATE
    SET
      product_id = EXCLUDED.product_id::int,
      updated_at = NOW()
  `,
    [productId]
  );
}

module.exports = { create };
