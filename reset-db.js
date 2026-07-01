const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function reset() {
  const publicUrl = process.env.DATABASE_URL.includes('proxy.rlwy.net') 
    ? process.env.DATABASE_URL 
    : process.env.DATABASE_URL;
  const pool = new Pool({ connectionString: publicUrl, ssl: { rejectUnauthorized: false } });

  // Create tables (same as server.js initPG)
  await pool.query(`CREATE TABLE IF NOT EXISTS settings (id SERIAL PRIMARY KEY, data JSONB NOT NULL DEFAULT '{}')`);
  await pool.query(`CREATE TABLE IF NOT EXISTS admin (id SERIAL PRIMARY KEY, username TEXT NOT NULL, password TEXT NOT NULL)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS categories (id SERIAL PRIMARY KEY, key TEXT NOT NULL UNIQUE, name TEXT NOT NULL)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, price TEXT, category TEXT, image TEXT, whatsapp TEXT)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS offers (id TEXT PRIMARY KEY, title TEXT, description TEXT, image TEXT, active BOOLEAN DEFAULT true, created_at TEXT)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY, type TEXT, url TEXT, title TEXT, created_at TEXT)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, customer TEXT, phone TEXT, products JSONB DEFAULT '[]', total TEXT, status TEXT DEFAULT 'pending', note TEXT DEFAULT '', created_at TEXT)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS push_subscriptions (id SERIAL PRIMARY KEY, endpoint TEXT UNIQUE, data JSONB)`);

  // Clear data
  await pool.query('DELETE FROM products');
  await pool.query('DELETE FROM offers');
  await pool.query('DELETE FROM media');
  await pool.query('DELETE FROM orders');
  await pool.query('DELETE FROM categories');
  await pool.query('DELETE FROM settings');
  await pool.query('DELETE FROM admin');
  await pool.query('DELETE FROM push_subscriptions');

  // Seed from db.json
  const seed = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'db.json'), 'utf-8'));

  await pool.query('INSERT INTO admin (username, password) VALUES ($1, $2)', [seed.admin.username, seed.admin.password]);
  await pool.query('INSERT INTO settings (data) VALUES ($1)', [JSON.stringify(seed.settings || {})]);

  for (const c of (seed.categories || [])) {
    await pool.query('INSERT INTO categories (key, name) VALUES ($1, $2)', [c.id, c.name]);
  }
  for (const p of (seed.products || [])) {
    await pool.query('INSERT INTO products (id, name, description, price, category, image, whatsapp) VALUES ($1,$2,$3,$4,$5,$6,$7)', [p.id, p.name, p.description, p.price, p.category, p.image, p.whatsapp]);
  }
  for (const o of (seed.offers || [])) {
    await pool.query('INSERT INTO offers (id, title, description, image, active, created_at) VALUES ($1,$2,$3,$4,$5,$6)', [o.id, o.title, o.description, o.image, o.active, o.createdAt]);
  }
  for (const m of (seed.media || [])) {
    await pool.query('INSERT INTO media (id, type, url, title, created_at) VALUES ($1,$2,$3,$4,$5)', [m.id, m.type, m.url, m.title, m.createdAt]);
  }

  console.log('✓ Database initialized and seeded with Fadora/Oriflame data');
  await pool.end();
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) { console.error('DATABASE_URL required'); process.exit(1); }
reset().catch(e => { console.error(e); process.exit(1); });
