const pool = require("../config/pool");

async function create(options) {
  const { fileId, fileName, type, fileSize, userName } = options;
  const { rows } = await pool.query(
    `
  INSERT INTO cloud_files 
    (file_id, file_name, type, file_size, uploaded_by)
  VALUES 
    ($1, $2, $3, $4, $5)
  RETURNING id
  `,
    [fileId, fileName, type, fileSize, userName],
  );

  return rows[0];
}

async function byId(id) {
  const { rows } = await pool.query(
    `
  SELECT * FROM cloud_files WHERE id = $1
  `,
    [id],
  );
  return rows[0];
}

module.exports = { create, byId };
