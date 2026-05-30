const express = require('express');
const session = require('express-session');
const { Pool } = require('pg');
const path = require('path');

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin1234';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-this-secret-in-production';
const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set.');
  console.error('On Railway: add a Postgres service to your project — DATABASE_URL will be injected automatically.');
  console.error('Local dev: export DATABASE_URL=postgres://user:pass@host:5432/dbname');
  process.exit(1);
}

const useSSL = !/\.railway\.internal|localhost|127\.0\.0\.1/.test(DATABASE_URL);
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : false
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS registrations (
      id SERIAL PRIMARY KEY,
      phone TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ip TEXT
    );
  `);
}

const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 8
  }
}));

function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'unauthorized' });
  return res.redirect('/login.html');
}

app.post('/api/register', async (req, res) => {
  try {
    const raw = (req.body.phone || '').toString().trim();
    const phone = raw.replace(/[\s\-()]/g, '');
    if (!/^[0-9+]{8,15}$/.test(phone)) {
      return res.status(400).json({ error: 'เบอร์โทรไม่ถูกต้อง' });
    }
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString();
    await pool.query('INSERT INTO registrations (phone, ip) VALUES ($1, $2)', [phone, ip]);
    res.json({ ok: true });
  } catch (err) {
    console.error('register error:', err);
    res.status(500).json({ error: 'server error' });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.isAdmin = true;
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', (req, res) => {
  res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

app.get('/api/registrations', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, phone, created_at, ip FROM registrations ORDER BY id DESC'
    );
    res.json({ rows: result.rows, count: result.rows.length });
  } catch (err) {
    console.error('list error:', err);
    res.status(500).json({ error: 'server error' });
  }
});

app.delete('/api/registrations/:id', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'bad id' });
  try {
    await pool.query('DELETE FROM registrations WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('delete error:', err);
    res.status(500).json({ error: 'server error' });
  }
});

app.get('/admin.html', requireAuth, (req, res, next) => next());
app.use(express.static(path.join(__dirname, 'public')));

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Admin login: ${ADMIN_USER} / ${ADMIN_PASS}`);
    });
  })
  .catch((err) => {
    console.error('Failed to init DB:', err);
    process.exit(1);
  });
