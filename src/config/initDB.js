const pool = require("../config/pool");
const bcrypt = require("bcryptjs");

async function createTable() {
  try {
    const hashed = await bcrypt.hash(process.env.SUPER_PASS, 10);

    await pool.query(`
    CREATE TABLE IF NOT EXISTS roles(
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
    )
    `);

    await pool.query(`
    INSERT INTO roles(name) VALUES ('user'), ('admin'), ('owner'), ('super_admin') ON CONFLICT DO NOTHING 
    `);

    await pool.query(`
    CREATE TABLE IF NOT EXISTS users(
    id SERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    email VARCHAR(64) NOT NULL UNIQUE,
    email_verified_at TIMESTAMP DEFAULT NULL,
    role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP DEFAULT NULL,
    deleted_at TIMESTAMP DEFAULT NULL
    )`);

    await pool.query(`ALTER TABLE users ALTER COLUMN role_id SET DEFAULT 1`);

    await pool.query(
      `INSERT INTO users 
        (username, email, email_verified_at, 
        role_id, password) 
      VALUES 
        ($1, $2, NOW(), 4, $3)
      ON CONFLICT DO NOTHING`,
      [process.env.SUPER_NAME,
       process.env.SUPER_EMAIL,
       hashed],
    );

    await pool.query(`
    CREATE TABLE IF NOT EXISTS user_tokens(
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE,
    type VARCHAR(30) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expired_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP DEFAULT NULL,
    
    CHECK (type IN (
    'EMAIL_VERIFY',
    'PASSWORD_RESET',
    'REFRESH_TOKEN'
    )),
    
    UNIQUE (user_id, type)
    )
    `);

    await pool.query(`
    CREATE TABLE IF NOT EXISTS categories(
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL
    )
    `);

    await pool.query(`
    CREATE TABLE IF NOT EXISTS products(
    id SERIAL PRIMARY KEY,
    sku VARCHAR(64) NOT NULL UNIQUE,
    barcode VARCHAR,
    name VARCHAR(255) NOT NULL,
    buy NUMERIC NOT NULL,
    sell NUMERIC NOT NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    stock NUMERIC NOT NULL,
    minimum_stock NUMERIC DEFAULT 0,
    weight NUMERIC DEFAULT 0,
    image TEXT DEFAULT NULL,
    
    CHECK (sell >= buy), -- sell harus >= buy
    CHECK (stock >= 0),  -- stock harus >= 0
    CHECK (minimum_stock >= 0) -- minimum_stock harus >= 0
    )`);

    await pool.query(`
    CREATE TABLE IF NOT EXISTS product_info (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    deleted_by INTEGER REFERENCES users(id) ON DELETE SET NULL
    
    )`);

    await pool.query(`
    CREATE TABLE IF NOT EXISTS product_log (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(32) NOT NULL CHECK (
      action IN('CREATE', 'UPDATE', 'REMOVE', 'RESTORE')
    ),
    old_data JSONB DEFAULT NULL,
    new_data JSONB DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`)

    await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role TEXT REFERENCES roles(name) ON DELETE CASCADE,
    total NUMERIC NOT NULL,
    method VARCHAR(32) DEFAULT 'cash',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    
    CHECK (total >= 0)
    )`);

    await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL NOT NULL,
    quantity NUMERIC NOT NULL,
    sell NUMERIC NOT NULL,
    
    CHECK (quantity > 0),
    CHECK (sell >= 0)
    
    )`);
  } catch (e) {
    console.log(e);
  }
}

module.exports = createTable;
