import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDb, saveDb } from '../db.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';

const router = Router();

router.post('/register', (req, res) => {
  const db = getDb();
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields required' });
  }

  const existing = db.exec(`SELECT id FROM users WHERE email = '${email}'`);
  if (existing.length > 0 && existing[0].values.length > 0) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const hashed = bcrypt.hashSync(password, 10);
  db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashed]);
  saveDb();

  const result = db.exec('SELECT last_insert_rowid() as id');
  const id = result[0].values[0][0];
  const user = { id, name, email };
  const token = generateToken(user);

  res.status(201).json({ user, token });
});

router.post('/login', (req, res) => {
  const db = getDb();
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  stmt.bind([email]);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();

  if (!row || !bcrypt.compareSync(password, row.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = generateToken({ id: row.id, email: row.email });
  res.json({ user: { id: row.id, name: row.name, email: row.email }, token });
});

router.get('/me', authenticateToken, (req, res) => {
  const db = getDb();
  const stmt = db.prepare('SELECT id, name, email FROM users WHERE id = ?');
  stmt.bind([req.user.id]);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();

  if (!row) return res.status(404).json({ error: 'User not found' });
  res.json({ user: row });
});

export default router;
