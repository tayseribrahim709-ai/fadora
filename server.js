const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');
const webpush = require('web-push');
const nodemailer = require('nodemailer');

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BDitqIMvkhQtLRSY-UsSQpo_4Q0fHRa1R80n7suB0VbWVcXmnVJdrifF2mvsDzfQtSlQuI2aLp2nsWl8Q3Q-HSM';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '0b9zUtKHbPTjJFqlz2Bbazt8fcTUSMJCdzVnTNn3QPc';
webpush.setVapidDetails('mailto:faddo87@gmail.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fadora-secret-key-2026';
const DB_PATH = path.join(__dirname, 'data', 'db.json');
const USE_PG = !!process.env.DATABASE_URL;

// Email transporter for order notifications
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = process.env.EMAIL_PASS || '';
const ADMIN_EMAIL = 'faddo87@gmail.com';
let transporter = null;
if (EMAIL_USER && EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: EMAIL_USER, pass: EMAIL_PASS }
  });
}

async function sendNotification(order) {
  const msg = `🛒 طلب جديد من Fadora
━━━━━━━━━━━━━━━
👤 العميل: ${order.customer}
📞 الجوال: ${order.phone}
📦 المنتجات: ${(order.products || []).map(p => p.name || p).join(', ')}
💰 الإجمالي: ${order.total || '—'}
📝 ملاحظات: ${order.note || '—'}
🆔 رقم الطلب: ${order.id}
━━━━━━━━━━━━━━━
⏰ ${order.createdAt}`;

  // 1) Send to WhatsApp via CallMeBot if API key is configured
  const whatsappApiKey = process.env.WM_API_KEY;
  if (whatsappApiKey) {
    try {
      const settings = await getSettings();
      const waNumber = (settings.social?.whatsapp || '249924643848').replace(/[^0-9]/g, '');
      const url = `https://api.callmebot.com/whatsapp.php?phone=${waNumber}&text=${encodeURIComponent(msg)}&apikey=${whatsappApiKey}`;
      const r = await fetch(url);
      const text = await r.text();
      if (text.includes('OK')) console.log('✓ WhatsApp sent for order', order.id);
      else console.log('WhatsApp API:', text);
    } catch (e) { console.log('WhatsApp failed:', e.message); }
  }

  // 2) Send email if configured
  if (transporter) {
    try {
      await transporter.sendMail({
        from: EMAIL_USER,
        to: ADMIN_EMAIL,
        subject: `🛒 طلب جديد من ${order.customer}`,
        text: msg
      });
      console.log('✓ Email sent for order', order.id);
    } catch (e) { console.log('Email failed:', e.message); }
  }
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files safely - block sensitive files
const BLOCKED = ['server.js', 'package.json', 'package-lock.json', '.env', '.gitignore', 'node_modules'];
app.use((req, res, next) => {
  if (BLOCKED.some(p => req.path === '/' + p || req.path.startsWith('/' + p + '/'))) {
    return res.status(404).send();
  }
  next();
});
app.use(express.static(__dirname, { index: ['index.html'] }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============ PostgreSQL (production) ============
let pool;
if (USE_PG) {
  pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
}

async function pgQuery(text, params) {
  if (!pool) return null;
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (err) {
    console.error('PG Error:', err.message);
    throw err;
  }
}

async function initPG() {
  await pgQuery(`CREATE TABLE IF NOT EXISTS settings (id SERIAL PRIMARY KEY, data JSONB NOT NULL DEFAULT '{}')`);
  await pgQuery(`CREATE TABLE IF NOT EXISTS admin (id SERIAL PRIMARY KEY, username TEXT NOT NULL, password TEXT NOT NULL)`);
  await pgQuery(`CREATE TABLE IF NOT EXISTS categories (id SERIAL PRIMARY KEY, key TEXT NOT NULL UNIQUE, name TEXT NOT NULL)`);
  await pgQuery(`CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, price TEXT, category TEXT, image TEXT, whatsapp TEXT)`);
  await pgQuery(`CREATE TABLE IF NOT EXISTS offers (id TEXT PRIMARY KEY, title TEXT, description TEXT, image TEXT, active BOOLEAN DEFAULT true, created_at TEXT)`);
  await pgQuery(`CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY, type TEXT, url TEXT, title TEXT, created_at TEXT)`);
  await pgQuery(`CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, customer TEXT, phone TEXT, products JSONB DEFAULT '[]', total TEXT, status TEXT DEFAULT 'pending', note TEXT DEFAULT '', created_at TEXT)`);
  await pgQuery(`CREATE TABLE IF NOT EXISTS push_subscriptions (id SERIAL PRIMARY KEY, endpoint TEXT UNIQUE, data JSONB)`);
  await pgQuery(`CREATE TABLE IF NOT EXISTS popups (id TEXT PRIMARY KEY, title TEXT, description TEXT, image TEXT, link TEXT, active BOOLEAN DEFAULT true, created_at TEXT)`);

  const adminCount = await pgQuery('SELECT COUNT(*) FROM admin');
  if (parseInt(adminCount.rows[0].count) === 0) {
    const seed = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    await pgQuery('INSERT INTO admin (username, password) VALUES ($1, $2)', [seed.admin.username, seed.admin.password]);
    await pgQuery('INSERT INTO settings (data) VALUES ($1)', [JSON.stringify(seed.settings || {})]);
    for (const c of (seed.categories || [])) {
      await pgQuery('INSERT INTO categories (key, name) VALUES ($1, $2) ON CONFLICT DO NOTHING', [c.id, c.name]);
    }
    for (const p of (seed.products || [])) {
      await pgQuery('INSERT INTO products (id, name, description, price, category, image, whatsapp) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING', [p.id, p.name, p.description, p.price, p.category, p.image, p.whatsapp]);
    }
    for (const o of (seed.offers || [])) {
      await pgQuery('INSERT INTO offers (id, title, description, image, active, created_at) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING', [o.id, o.title, o.description, o.image, o.active, o.createdAt]);
    }
    for (const m of (seed.media || [])) {
      await pgQuery('INSERT INTO media (id, type, url, title, created_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING', [m.id, m.type, m.url, m.title, m.createdAt]);
    }
    console.log('✓ PostgreSQL seeded from db.json');
  }
  // Ensure settings row exists even if admin already existed
  const settingsCount = await pgQuery('SELECT COUNT(*) FROM settings');
  if (parseInt(settingsCount.rows[0].count) === 0) {
    const seed = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    await pgQuery('INSERT INTO settings (data) VALUES ($1)', [JSON.stringify(seed.settings || {})]);
    console.log('✓ Settings row inserted');
  }
  // Re-seed products/categories/offers if empty (fresh DB)
  const prodCount = await pgQuery('SELECT COUNT(*) FROM products');
  if (parseInt(prodCount.rows[0].count) === 0) {
    const seed = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    for (const c of (seed.categories || [])) {
      await pgQuery('INSERT INTO categories (key, name) VALUES ($1, $2) ON CONFLICT DO NOTHING', [c.id, c.name]);
    }
    for (const p of (seed.products || [])) {
      await pgQuery('INSERT INTO products (id, name, description, price, category, image, whatsapp) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING', [p.id, p.name, p.description, p.price, p.category, p.image, p.whatsapp]);
    }
    for (const o of (seed.offers || [])) {
      await pgQuery('INSERT INTO offers (id, title, description, image, active, created_at) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING', [o.id, o.title, o.description, o.image, o.active, o.createdAt]);
    }
    console.log('✓ Products re-seeded');
  }
}

// ============ JSON fallback (local dev) ============
function readDB() {
  let raw = fs.readFileSync(DB_PATH, 'utf-8');
  raw = raw.replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// ============ Unified DB helpers ============
async function getSettings() {
  if (USE_PG) {
    const r = await pgQuery('SELECT data FROM settings LIMIT 1');
    return r.rows.length ? r.rows[0].data : { social: {}, payment: {} };
  }
  return readDB().settings || { social: {}, payment: {} };
}

async function saveSettings(data) {
  if (USE_PG) {
    await pgQuery('UPDATE settings SET data = $1 WHERE id = 1', [JSON.stringify(data)]);
  }
  const db = readDB();
  db.settings = data;
  writeDB(db);
  return data;
}

async function getAdmin() {
  if (USE_PG) {
    const r = await pgQuery('SELECT username, password FROM admin LIMIT 1');
    return r.rows[0] || { username: 'admin', password: '' };
  }
  return readDB().admin;
}

async function updatePassword(hash) {
  if (USE_PG) {
    await pgQuery('UPDATE admin SET password = $1 WHERE id = 1', [hash]);
    return;
  }
  const db = readDB();
  db.admin.password = hash;
  writeDB(db);
}

async function getCategories() {
  if (USE_PG) {
    const r = await pgQuery('SELECT key, name FROM categories ORDER BY id');
    return r.rows;
  }
  return readDB().categories || [];
}

async function getProducts(category) {
  if (USE_PG) {
    if (category) {
      const r = await pgQuery('SELECT * FROM products WHERE category = $1 ORDER BY id', [category]);
      return r.rows;
    }
    const r = await pgQuery('SELECT * FROM products ORDER BY id');
    return r.rows;
  }
  const db = readDB();
  if (category) return db.products.filter(p => p.category === category);
  return db.products;
}

async function createProduct(data) {
  if (USE_PG) {
    await pgQuery('INSERT INTO products (id, name, description, price, category, image, whatsapp) VALUES ($1,$2,$3,$4,$5,$6,$7)', [data.id, data.name, data.description, data.price, data.category, data.image, data.whatsapp]);
    return data;
  }
  const db = readDB();
  db.products.push(data);
  writeDB(db);
  return data;
}

async function updateProduct(id, data) {
  if (USE_PG) {
    const sets = []; const vals = []; let i = 1;
    for (const k of ['name', 'description', 'price', 'category', 'image', 'whatsapp']) {
      if (data[k] !== undefined) { sets.push(`${k}=$${i}`); vals.push(data[k]); i++; }
    }
    if (sets.length) {
      vals.push(id);
      await pgQuery(`UPDATE products SET ${sets.join(',')} WHERE id=$${i}`, vals);
    }
    const r = await pgQuery('SELECT * FROM products WHERE id=$1', [id]);
    return r.rows[0];
  }
  const db = readDB();
  const idx = db.products.findIndex(p => p.id === id);
  if (idx === -1) return null;
  db.products[idx] = { ...db.products[idx], ...data };
  writeDB(db);
  return db.products[idx];
}

async function deleteProduct(id) {
  if (USE_PG) {
    const r = await pgQuery('DELETE FROM products WHERE id=$1 RETURNING id', [id]);
    return r.rows.length > 0;
  }
  const db = readDB();
  const idx = db.products.findIndex(p => p.id === id);
  if (idx === -1) return false;
  db.products.splice(idx, 1);
  writeDB(db);
  return true;
}

async function getOffers() {
  if (USE_PG) {
    const r = await pgQuery('SELECT * FROM offers ORDER BY id');
    return r.rows;
  }
  return readDB().offers;
}

async function createOffer(data) {
  if (USE_PG) {
    await pgQuery('INSERT INTO offers (id, title, description, image, active, created_at) VALUES ($1,$2,$3,$4,$5,$6)', [data.id, data.title, data.description, data.image, data.active, data.createdAt]);
    return data;
  }
  const db = readDB();
  db.offers.push(data);
  writeDB(db);
  return data;
}

async function updateOffer(id, data) {
  if (USE_PG) {
    const sets = []; const vals = []; let i = 1;
    for (const k of ['title', 'description', 'image', 'active']) {
      if (data[k] !== undefined) { sets.push(`${k}=$${i}`); vals.push(data[k]); i++; }
    }
    if (data.createdAt !== undefined) { sets.push(`created_at=$${i}`); vals.push(data.createdAt); i++; }
    if (sets.length) { vals.push(id); await pgQuery(`UPDATE offers SET ${sets.join(',')} WHERE id=$${i}`, vals); }
    const r = await pgQuery('SELECT * FROM offers WHERE id=$1', [id]);
    return r.rows[0];
  }
  const db = readDB();
  const idx = db.offers.findIndex(o => o.id === id);
  if (idx === -1) return null;
  db.offers[idx] = { ...db.offers[idx], ...data };
  writeDB(db);
  return db.offers[idx];
}

async function deleteOffer(id) {
  if (USE_PG) {
    const r = await pgQuery('DELETE FROM offers WHERE id=$1 RETURNING id', [id]);
    return r.rows.length > 0;
  }
  const db = readDB();
  const idx = db.offers.findIndex(o => o.id === id);
  if (idx === -1) return false;
  db.offers.splice(idx, 1);
  writeDB(db);
  return true;
}

async function getMedia() {
  if (USE_PG) {
    const r = await pgQuery('SELECT * FROM media ORDER BY id');
    return r.rows;
  }
  return readDB().media;
}

async function createMedia(data) {
  if (USE_PG) {
    await pgQuery('INSERT INTO media (id, type, url, title, created_at) VALUES ($1,$2,$3,$4,$5)', [data.id, data.type, data.url, data.title, data.createdAt]);
    return data;
  }
  const db = readDB();
  db.media.push(data);
  writeDB(db);
  return data;
}

async function deleteMedia(id) {
  if (USE_PG) {
    const r = await pgQuery('DELETE FROM media WHERE id=$1 RETURNING url', [id]);
    return r.rows[0] || null;
  }
  const db = readDB();
  const idx = db.media.findIndex(m => m.id === id);
  if (idx === -1) return null;
  const item = db.media[idx];
  db.media.splice(idx, 1);
  writeDB(db);
  return item;
}

async function getOrders() {
  if (USE_PG) {
    const r = await pgQuery('SELECT * FROM orders ORDER BY id');
    return r.rows.map(o => ({ ...o, products: typeof o.products === 'string' ? JSON.parse(o.products) : o.products }));
  }
  return readDB().orders || [];
}

async function createOrder(data) {
  if (USE_PG) {
    await pgQuery('INSERT INTO orders (id, customer, phone, products, total, status, note, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [data.id, data.customer, data.phone, JSON.stringify(data.products), data.total, data.status, data.note, data.createdAt]);
    return data;
  }
  const db = readDB();
  db.orders = db.orders || [];
  db.orders.push(data);
  writeDB(db);
  return data;
}

async function updateOrder(id, data) {
  if (USE_PG) {
    const sets = []; const vals = []; let i = 1;
    for (const k of ['customer', 'phone', 'total', 'status', 'note']) {
      if (data[k] !== undefined) { sets.push(`${k}=$${i}`); vals.push(data[k]); i++; }
    }
    if (data.products !== undefined) { sets.push(`products=$${i}`); vals.push(JSON.stringify(data.products)); i++; }
    if (sets.length) { vals.push(id); await pgQuery(`UPDATE orders SET ${sets.join(',')} WHERE id=$${i}`, vals); }
    const r = await pgQuery('SELECT * FROM orders WHERE id=$1', [id]);
    return r.rows[0] ? { ...r.rows[0], products: typeof r.rows[0].products === 'string' ? JSON.parse(r.rows[0].products) : r.rows[0].products } : null;
  }
  const db = readDB();
  const idx = (db.orders || []).findIndex(o => o.id === id);
  if (idx === -1) return null;
  db.orders[idx] = { ...db.orders[idx], ...data };
  writeDB(db);
  return db.orders[idx];
}

async function deleteOrder(id) {
  if (USE_PG) {
    const r = await pgQuery('DELETE FROM orders WHERE id=$1 RETURNING id', [id]);
    return r.rows.length > 0;
  }
  const db = readDB();
  const idx = (db.orders || []).findIndex(o => o.id === id);
  if (idx === -1) return false;
  db.orders.splice(idx, 1);
  writeDB(db);
  return true;
}

// ============ File Upload ============
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isVideo = file.mimetype.startsWith('video/');
    const dir = isVideo ? path.join(__dirname, 'uploads', 'videos') : path.join(__dirname, 'uploads', 'images');
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uuidv4().slice(0, 8)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedImages = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const allowedVideos = ['video/mp4', 'video/webm', 'video/ogg'];
    if ([...allowedImages, ...allowedVideos].includes(file.mimetype)) return cb(null, true);
    cb(new Error('صيغة الملف غير مدعومة'));
  }
});

// ============ Auth Middleware ============
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'غير مصرح' });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'انتهت الجلسة' });
  }
}

// ============ Auth Routes ============
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await getAdmin();
    if (username !== admin.username || !bcrypt.compareSync(password, admin.password)) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور خطأ' });
    }
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

app.post('/api/change-password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const admin = await getAdmin();
    if (!bcrypt.compareSync(oldPassword, admin.password)) return res.status(400).json({ error: 'كلمة المرور الحالية خطأ' });
    await updatePassword(bcrypt.hashSync(newPassword, 10));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// ============ Settings Routes ============
app.get('/api/settings', async (req, res) => {
  try { res.json(await getSettings()); }
  catch (e) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

app.put('/api/settings', authMiddleware, async (req, res) => {
  try { res.json(await saveSettings(req.body)); }
  catch (e) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// ============ Notification ============
let pushSubscriptions = [];

app.post('/api/subscribe', async (req, res) => {
  const sub = req.body;
  if (sub && sub.endpoint) {
    pushSubscriptions = pushSubscriptions.filter(s => s.endpoint !== sub.endpoint);
    pushSubscriptions.push(sub);
    // Persist to PG if available
    if (USE_PG) {
      try {
        await pgQuery('INSERT INTO push_subscriptions (endpoint, data) VALUES ($1, $2) ON CONFLICT (endpoint) DO UPDATE SET data = $2', [sub.endpoint, JSON.stringify(sub)]);
      } catch {}
    }
  }
  res.json({ success: true, count: pushSubscriptions.length });
});

app.post('/api/notify-offer', authMiddleware, async (req, res) => {
  const { title, body } = req.body;
  if (!pushSubscriptions.length) return res.json({ success: true, sent: 0 });
  const payload = JSON.stringify({ title: title || 'Fadora', body: body || 'عرض جديد', url: '/' });
  const results = await Promise.allSettled(pushSubscriptions.map(sub =>
    webpush.sendNotification(sub, payload).catch(e => {
      if (e.statusCode === 410) {
        pushSubscriptions = pushSubscriptions.filter(s => s.endpoint !== sub.endpoint);
        if (USE_PG) pgQuery('DELETE FROM push_subscriptions WHERE endpoint=$1', [sub.endpoint]).catch(() => {});
      }
    })
  ));
  res.json({ success: true, sent: results.filter(r => r.status === 'fulfilled').length, total: pushSubscriptions.length });
});

// ============ Categories Routes ============
app.get('/api/categories', async (req, res) => {
  try { res.json(await getCategories()); }
  catch (e) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// ============ Products Routes ============
app.get('/api/products', async (req, res) => {
  try {
    const { category } = req.query;
    res.json(await getProducts(category));
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

app.get('/api/products/:category', async (req, res) => {
  try { res.json(await getProducts(req.params.category)); }
  catch (e) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

app.post('/api/products', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const product = {
      id: uuidv4().slice(0, 8),
      name: req.body.name,
      description: req.body.description,
      price: req.body.price,
      category: req.body.category,
      image: req.file ? `uploads/images/${req.file.filename}` : req.body.image || 'images/product-oriflame.svg',
      whatsapp: `أريد ${req.body.name}`
    };
    res.json(await createProduct(product));
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

app.put('/api/products/:id', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const data = {};
    if (req.body.name) { data.name = req.body.name; data.whatsapp = `أريد ${req.body.name}`; }
    if (req.body.description) data.description = req.body.description;
    if (req.body.price) data.price = req.body.price;
    if (req.body.category) data.category = req.body.category;
    if (req.file) data.image = `uploads/images/${req.file.filename}`;
    const result = await updateProduct(req.params.id, data);
    if (!result) return res.status(404).json({ error: 'المنتج غير موجود' });
    res.json(result);
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

app.delete('/api/products/:id', authMiddleware, async (req, res) => {
  try {
    const ok = await deleteProduct(req.params.id);
    if (!ok) return res.status(404).json({ error: 'المنتج غير موجود' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// ============ Offers Routes ============
app.get('/api/offers', async (req, res) => {
  try { res.json(await getOffers()); }
  catch (e) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

app.post('/api/offers', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const offer = {
      id: uuidv4().slice(0, 8),
      title: req.body.title,
      description: req.body.description,
      image: req.file ? `uploads/images/${req.file.filename}` : '',
      active: req.body.active === 'true' || req.body.active === true,
      createdAt: new Date().toISOString().split('T')[0]
    };
    res.json(await createOffer(offer));
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

app.put('/api/offers/:id', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const data = {};
    if (req.body.title) data.title = req.body.title;
    if (req.body.description) data.description = req.body.description;
    if (req.body.active !== undefined) data.active = req.body.active === 'true' || req.body.active === true;
    if (req.file) data.image = `uploads/images/${req.file.filename}`;
    const result = await updateOffer(req.params.id, data);
    if (!result) return res.status(404).json({ error: 'العرض غير موجود' });
    res.json(result);
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

app.delete('/api/offers/:id', authMiddleware, async (req, res) => {
  try {
    const ok = await deleteOffer(req.params.id);
    if (!ok) return res.status(404).json({ error: 'العرض غير موجود' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// ============ Media Routes ============
app.get('/api/media', async (req, res) => {
  try { res.json(await getMedia()); }
  catch (e) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

app.post('/api/media', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'الملف مطلوب' });
  try {
    const isVideo = req.file.mimetype.startsWith('video/');
    const item = {
      id: uuidv4().slice(0, 8),
      type: isVideo ? 'video' : 'image',
      url: isVideo ? `uploads/videos/${req.file.filename}` : `uploads/images/${req.file.filename}`,
      title: req.body.title || req.file.originalname,
      createdAt: new Date().toISOString().split('T')[0]
    };
    res.json(await createMedia(item));
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

app.delete('/api/media/:id', authMiddleware, async (req, res) => {
  try {
    const item = await deleteMedia(req.params.id);
    if (!item) return res.status(404).json({ error: 'الملف غير موجود' });
    const filePath = path.join(__dirname, item.url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// ============ Orders Routes ============
app.get('/api/orders', async (req, res) => {
  try { res.json(await getOrders()); }
  catch (e) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

app.post('/api/orders', async (req, res) => {
  try {
    const order = {
      id: uuidv4().slice(0, 8),
      customer: req.body.customer,
      phone: req.body.phone,
      products: req.body.products || [],
      total: req.body.total,
      status: req.body.status || 'pending',
      note: req.body.note || '',
      createdAt: new Date().toISOString().split('T')[0]
    };
    const saved = await createOrder(order);
    sendNotification(saved);
    res.json(saved);
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

app.put('/api/orders/:id', async (req, res) => {
  try {
    const result = await updateOrder(req.params.id, req.body);
    if (!result) return res.status(404).json({ error: 'الطلب غير موجود' });
    res.json(result);
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

app.delete('/api/orders/:id', async (req, res) => {
  try {
    const ok = await deleteOrder(req.params.id);
    if (!ok) return res.status(404).json({ error: 'الطلب غير موجود' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// ============ Dashboard Stats ============
app.get('/api/stats', authMiddleware, async (req, res) => {
  try {
    let products, offers, media, orders, categories;
    if (USE_PG) {
      const [p, o, m, ord, cat] = await Promise.all([
        pgQuery('SELECT COUNT(*) FROM products'),
        pgQuery('SELECT COUNT(*) FROM offers WHERE active=true'),
        pgQuery('SELECT COUNT(*) FROM media'),
        pgQuery('SELECT COUNT(*) FROM orders'),
        pgQuery('SELECT COUNT(*) FROM categories')
      ]);
      products = parseInt(p.rows[0].count);
      offers = parseInt(o.rows[0].count);
      media = parseInt(m.rows[0].count);
      orders = parseInt(ord.rows[0].count);
      categories = parseInt(cat.rows[0].count);
    } else {
      const db = readDB();
      products = db.products.length;
      offers = db.offers.filter(o => o.active).length;
      media = db.media.length;
      orders = (db.orders || []).length;
      categories = (db.categories || []).length;
    }
    const imagesDir = path.join(__dirname, 'uploads', 'images');
    const videosDir = path.join(__dirname, 'uploads', 'videos');
    const imageCount = fs.existsSync(imagesDir) ? fs.readdirSync(imagesDir).length : 0;
    const videoCount = fs.existsSync(videosDir) ? fs.readdirSync(videosDir).length : 0;
    res.json({ products, offers, media, images: imageCount, videos: videoCount, categories, orders });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// ============ Popup Ads Routes ============
app.get('/api/popups', async (req, res) => {
  try {
    if (USE_PG) {
      const r = await pgQuery("SELECT id, title, description, image, link, active FROM popups WHERE active=true ORDER BY created_at DESC");
      return res.json(r.rows);
    }
    const db = readDB();
    res.json((db.popups || []).filter(p => p.active));
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

app.get('/api/admin/popups', authMiddleware, async (req, res) => {
  try {
    if (USE_PG) {
      const r = await pgQuery("SELECT * FROM popups ORDER BY created_at DESC");
      return res.json(r.rows);
    }
    const db = readDB();
    res.json(db.popups || []);
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

app.post('/api/popups', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const popup = {
      id: uuidv4().slice(0, 8),
      title: req.body.title,
      description: req.body.description || '',
      image: req.file ? '/uploads/images/' + req.file.filename : (req.body.image || ''),
      link: req.body.link || '',
      active: req.body.active !== 'false',
      createdAt: new Date().toISOString()
    };
    if (USE_PG) {
      await pgQuery("INSERT INTO popups (id, title, description, image, link, active, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)", [popup.id, popup.title, popup.description, popup.image, popup.link, popup.active, popup.createdAt]);
      return res.json(popup);
    }
    const db = readDB();
    if (!db.popups) db.popups = [];
    db.popups.push(popup);
    writeDB(db);
    res.json(popup);
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

app.put('/api/popups/:id', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    if (USE_PG) {
      const existing = await pgQuery("SELECT image FROM popups WHERE id=$1", [id]);
      if (!existing.rows.length) return res.status(404).json({ error: 'غير موجود' });
      const image = req.file ? '/uploads/images/' + req.file.filename : (req.body.image || existing.rows[0].image);
      await pgQuery("UPDATE popups SET title=$1, description=$2, image=$3, link=$4, active=$5 WHERE id=$6", [req.body.title, req.body.description || '', image, req.body.link || '', req.body.active !== 'false', id]);
      return res.json({ id: id, ...req.body, image: image });
    }
    const db = readDB();
    const idx = (db.popups || []).findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'غير موجود' });
    db.popups[idx] = { ...db.popups[idx], ...req.body, image: req.file ? '/uploads/images/' + req.file.filename : (req.body.image || db.popups[idx].image) };
    writeDB(db);
    res.json(db.popups[idx]);
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

app.delete('/api/popups/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (USE_PG) {
      await pgQuery("DELETE FROM popups WHERE id=$1", [id]);
      return res.json({ success: true });
    }
    const db = readDB();
    db.popups = (db.popups || []).filter(p => p.id !== id);
    writeDB(db);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// ============ Start Server ============
async function start() {
  if (USE_PG) {
    await initPG();
    console.log('✓ PostgreSQL connected');
  } else {
    console.log('✓ Using file-based JSON (local dev)');
  }
  app.listen(PORT, () => {
    console.log(`✓ Fadora - الخادم يعمل على http://localhost:${PORT}`);
    console.log(`✓ لوحة الإدارة: http://localhost:${PORT}/admin/`);
    console.log(`✓ الموقع: http://localhost:${PORT}/index.html`);
  });
}

start();

module.exports = app;
