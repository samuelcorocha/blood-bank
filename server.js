const crypto = require('crypto');
const fs = require('fs');
const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const port = process.env.PORT || 3000;
const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'blood-bank.sqlite');

fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'donor')),
    bloodType TEXT,
    lastDonationDate TEXT,
    nextEligibleDonationDate TEXT
  );

  CREATE TABLE IF NOT EXISTS stock (
    bloodType TEXT PRIMARY KEY,
    unitsAvailable INTEGER NOT NULL,
    criticalThreshold INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    userId INTEGER NOT NULL,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users (id)
  );
`);

function ensureSeedData() {
  const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  if (userCount === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (name, email, password, role, bloodType, lastDonationDate, nextEligibleDonationDate)
      VALUES (@name, @email, @password, @role, @bloodType, @lastDonationDate, @nextEligibleDonationDate)
    `);

    const users = [
      {
        name: 'Admin Hemocentro',
        email: 'admin@hemocentro.local',
        password: 'admin123',
        role: 'admin',
        bloodType: null,
        lastDonationDate: null,
        nextEligibleDonationDate: null,
      },
      {
        name: 'Ana Silva',
        email: 'ana@doadores.local',
        password: 'donor123',
        role: 'donor',
        bloodType: 'O+',
        lastDonationDate: '2026-04-12',
        nextEligibleDonationDate: '2026-06-11',
      },
      {
        name: 'Bruno Lima',
        email: 'bruno@doadores.local',
        password: 'donor123',
        role: 'donor',
        bloodType: 'A-',
        lastDonationDate: '2026-03-04',
        nextEligibleDonationDate: '2026-05-29',
      },
    ];

    for (const user of users) {
      insertUser.run(user);
    }
  }

  const stockCount = db.prepare('SELECT COUNT(*) AS count FROM stock').get().count;
  if (stockCount === 0) {
    const insertStock = db.prepare(`
      INSERT INTO stock (bloodType, unitsAvailable, criticalThreshold)
      VALUES (@bloodType, @unitsAvailable, @criticalThreshold)
    `);

    [
      { bloodType: 'A+', unitsAvailable: 18, criticalThreshold: 10 },
      { bloodType: 'A-', unitsAvailable: 6, criticalThreshold: 8 },
      { bloodType: 'B+', unitsAvailable: 12, criticalThreshold: 10 },
      { bloodType: 'B-', unitsAvailable: 4, criticalThreshold: 7 },
      { bloodType: 'AB+', unitsAvailable: 8, criticalThreshold: 6 },
      { bloodType: 'AB-', unitsAvailable: 2, criticalThreshold: 5 },
      { bloodType: 'O+', unitsAvailable: 22, criticalThreshold: 12 },
      { bloodType: 'O-', unitsAvailable: 3, criticalThreshold: 8 },
    ].forEach((item) => insertStock.run(item));
  }
}

ensureSeedData();

function toPublicUser(user) {
  if (!user) {
    return null;
  }

  const { password, ...publicUser } = user;
  return publicUser;
}

function createToken() {
  return crypto.randomBytes(24).toString('hex');
}

function getAuthToken(req) {
  const header = req.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

function authRequired(req, res, next) {
  const token = getAuthToken(req);

  if (!token) {
    return res.status(401).json({ message: 'Token ausente.' });
  }

  const session = db.prepare('SELECT token, userId FROM sessions WHERE token = ?').get(token);
  if (!session) {
    return res.status(401).json({ message: 'Sessão inválida.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.userId);
  if (!user) {
    return res.status(401).json({ message: 'Usuário não encontrado.' });
  }

  req.user = user;
  req.sessionToken = token;
  next();
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Acesso restrito ao administrador.' });
  }

  next();
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'blood-bank', timestamp: new Date().toISOString() });
});

app.get('/api/public/urgent', (_req, res) => {
  const urgentStocks = db
    .prepare(`
      SELECT bloodType, unitsAvailable, criticalThreshold
      FROM stock
      WHERE unitsAvailable <= criticalThreshold
      ORDER BY unitsAvailable ASC, bloodType ASC
    `)
    .all();

  res.json({ urgentStocks });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Informe email e senha.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ? AND password = ?').get(email.trim().toLowerCase(), password);
  if (!user) {
    return res.status(401).json({ message: 'Credenciais inválidas.' });
  }

  const token = createToken();
  db.prepare('INSERT INTO sessions (token, userId, createdAt) VALUES (?, ?, ?)').run(token, user.id, new Date().toISOString());

  res.json({ token, user: toPublicUser(user) });
});

app.get('/api/me', authRequired, (req, res) => {
  res.json({ user: toPublicUser(req.user) });
});

app.get('/api/admin/dashboard', authRequired, adminOnly, (_req, res) => {
  const stock = db.prepare('SELECT bloodType, unitsAvailable, criticalThreshold FROM stock ORDER BY bloodType ASC').all();
  const urgentStocks = stock.filter((item) => item.unitsAvailable <= item.criticalThreshold);
  const donors = db.prepare(`
    SELECT id, name, email, bloodType, lastDonationDate, nextEligibleDonationDate
    FROM users
    WHERE role = 'donor'
    ORDER BY name ASC
  `).all();

  res.json({
    totals: {
      bloodTypesTracked: stock.length,
      criticalTypes: urgentStocks.length,
      donorsRegistered: donors.length,
    },
    stock,
    urgentStocks,
    donors,
  });
});

app.get('/api/donor/dashboard', authRequired, (req, res) => {
  if (req.user.role !== 'donor') {
    return res.status(403).json({ message: 'Acesso restrito ao doador.' });
  }

  const urgency = db
    .prepare(`
      SELECT bloodType, unitsAvailable, criticalThreshold
      FROM stock
      ORDER BY unitsAvailable ASC, bloodType ASC
    `)
    .all();

  res.json({
    profile: toPublicUser(req.user),
    urgency,
  });
});

app.patch('/api/admin/stock/:bloodType', authRequired, adminOnly, (req, res) => {
  const bloodType = req.params.bloodType.toUpperCase();
  const nextUnits = Number.parseInt(req.body?.unitsAvailable, 10);

  if (!Number.isInteger(nextUnits) || nextUnits < 0) {
    return res.status(400).json({ message: 'Quantidade inválida.' });
  }

  const existing = db.prepare('SELECT bloodType FROM stock WHERE bloodType = ?').get(bloodType);
  if (!existing) {
    return res.status(404).json({ message: 'Tipo sanguíneo não encontrado.' });
  }

  db.prepare('UPDATE stock SET unitsAvailable = ? WHERE bloodType = ?').run(nextUnits, bloodType);

  const updated = db.prepare('SELECT bloodType, unitsAvailable, criticalThreshold FROM stock WHERE bloodType = ?').get(bloodType);
  res.json({ stock: updated });
});

app.post('/api/logout', authRequired, (req, res) => {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(req.sessionToken);
  res.json({ ok: true });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Blood Bank running on http://localhost:${port}`);
});