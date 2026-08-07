const pool = require("../config/pool");

async function create(options) {
  const { fileId, fileName, type, fileSize, userName } = options;
  const { rows } = pool.query(
    `
  INSERT INTO cloud_files 
    (file_id, file_name, type, file_size, uploaded_by)
  VALUES 
    ($1, $2, $3, $4, $5)
  `,
    [fileId, fileName, type, fileSize, userName],
  );
}

module.exports = { create };
