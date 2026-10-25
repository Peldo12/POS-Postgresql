const { Pool } = require('pg');
const hash = require('../common/helpers/hash');
const dbUser = process.env.DB_USER;
const dbPass = process.env.DB_PASSWORD;
const dbHost = process.env.DB_HOST;
const dbName = process.env.DB_NAME;

const pool = new Pool({
  connectionString: `postgresql://${dbUser}:${dbPass}@${dbHost}:5432/${dbName}`,
  ssl: false,
});

async function testConnect() {
  const client = await pool.connect();
  try {
    console.warn(`${new Date().toLocaleTimeString()}: Connected to PostgreSQL`);
  } finally {
    client.release();
  }
}

async function initDB() {
  try {
    const hashed = await hash.create(process.env.SUPER_PASS);

    await testConnect();

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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(64) NOT NULL UNIQUE,
    email VARCHAR(64) NOT NULL UNIQUE,
    email_verified_at TIMESTAMP DEFAULT NULL,
    role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
      [process.env.SUPER_NAME, process.env.SUPER_EMAIL, hashed]
    );

    await pool.query(`
    CREATE TABLE IF NOT EXISTS user_tokens(
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE,
    type VARCHAR(30) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expired_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP DEFAULT NULL,
    
    CHECK (type IN (
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
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
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
    deleted_at TIMESTAMP DEFAULT NULL
    )`);

    await pool.query(`
    CREATE TABLE IF NOT EXISTS product_log (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(32) NOT NULL CHECK (
      action IN(
      'CREATE',
      'UPDATE',
      'REMOVE',
      'RESTORE',
      'STOCK_IN', 
      'STOCK_OUT'
      )
    ),
    refer_type VARCHAR(32),
    refer_id INTEGER,
    old_data JSONB DEFAULT NULL,
    new_data JSONB DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(30) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    subtotal NUMERIC(12,0) NOT NULL,
    discount NUMERIC(12,0) DEFAULT 0,
    tax NUMERIC(12,0) DEFAULT 0,
    total NUMERIC(12,0) NOT NULL,

    method VARCHAR(32) DEFAULT 'cash',
    payment_status VARCHAR(20) DEFAULT 'paid',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,

    CHECK (total >= 0),
    CHECK (method IN ('cash', 'qris')),
    CHECK (payment_status IN ('pending', 'paid', 'cancelled'))
    )`);

    await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    
    quantity INTEGER NOT NULL,
    price NUMERIC(12,0) NOT NULL,
    subtotal NUMERIC(12,0) NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CHECK (quantity > 0),
    CHECK (price >= 0),
    CHECK (subtotal >= 0)
    
    )`);

    await pool.query(`
    CREATE SEQUENCE IF NOT EXISTS invoice_sequence
    START 1
    INCREMENT 1
    `);

    await pool.query(`
    CREATE TABLE IF NOT EXISTS cloud_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id TEXT NOT NULL,
    file_name TEXT,
    type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by BIGINT NOT NULL
    )`);
  } catch (e) {
    console.error(e);
  }
}

module.exports = { pool, initDB };
