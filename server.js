const express = require('express');
const session = require('express-session');
const Database = require('better-sqlite3');
const path = require('path');

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin1234';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-this-secret-in-production';
const PORT = process.env.PORT || 3000;

const db = new Database(path.join(__dirname, 'data.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip TEXT
  );
`);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 8 }
}));

function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'unauthorized' });
  return res.redirect('/login.html');
}

app.post('/api/register', (req, res) => {
  const raw = (req.body.phone || '').toString().trim();
  const phone = raw.replace(/[\s\-()]/g, '');
  if (!/^[0-9+]{8,15}$/.test(phone)) {
    return res.status(400).json({ error: 'เบอร์โทรไม่ถูกต้อง' });
  }
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString();
  db.prepare('INSERT INTO registrations (phone, ip) VALUES (?, ?)').run(phone, ip);
  res.json({ ok: true });
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

app.get('/api/registrations', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT id, phone, created_at, ip FROM registrations ORDER BY id DESC').all();
  res.json({ rows, count: rows.length });
});

app.delete('/api/registrations/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'bad id' });
  db.prepare('DELETE FROM registrations WHERE id = ?').run(id);
  res.json({ ok: true });
});

app.get('/admin.html', requireAuth, (req, res, next) => next());

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Admin login: ${ADMIN_USER} / ${ADMIN_PASS}`);
});
