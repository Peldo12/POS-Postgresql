async function updateInfo(options) {
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

module.exports = updateInfo