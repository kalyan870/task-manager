import { Router } from 'express';
import { getDb, saveDb } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

function queryAll(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row;
}

router.get('/', (req, res) => {
  const { status, priority, sort } = req.query;
  let sql = 'SELECT * FROM tasks WHERE user_id = ?';
  const params = [req.user.id];

  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (priority) { sql += ' AND priority = ?'; params.push(priority); }

  if (sort === 'due_date') sql += ' ORDER BY due_date ASC';
  else if (sort === 'priority') sql += " ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END";
  else if (sort === 'created_at') sql += ' ORDER BY created_at DESC';
  else sql += ' ORDER BY created_at DESC';

  const tasks = queryAll(sql, params);
  res.json({ tasks });
});

router.get('/:id', (req, res) => {
  const task = queryOne('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json({ task });
});

router.post('/', (req, res) => {
  const db = getDb();
  const { title, description, status, priority, due_date } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });

  db.run(
    'INSERT INTO tasks (user_id, title, description, status, priority, due_date) VALUES (?, ?, ?, ?, ?, ?)',
    [req.user.id, title.trim(), description || '', status || 'pending', priority || 'medium', due_date || null]
  );
  saveDb();

  const result = db.exec('SELECT last_insert_rowid() as id');
  const id = result[0].values[0][0];
  const task = queryOne('SELECT * FROM tasks WHERE id = ?', [id]);

  const io = req.app.get('io'); if (io?.emit) io.emit('task:created', task);
  res.status(201).json({ task });
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const existing = queryOne('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!existing) return res.status(404).json({ error: 'Task not found' });

  const { title, description, status, priority, due_date } = req.body;

  db.run(
    `UPDATE tasks SET title = COALESCE(?, title), description = COALESCE(?, description),
     status = COALESCE(?, status), priority = COALESCE(?, priority),
     due_date = COALESCE(?, due_date), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [title || null, description !== undefined ? description : null,
     status || null, priority || null, due_date !== undefined ? due_date : null, req.params.id]
  );
  saveDb();

  const task = queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  const io2 = req.app.get('io'); if (io2?.emit) io2.emit('task:updated', task);
  res.json({ task });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const existing = queryOne('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!existing) return res.status(404).json({ error: 'Task not found' });

  db.run('DELETE FROM tasks WHERE id = ?', [req.params.id]);
  saveDb();

  const io3 = req.app.get('io'); if (io3?.emit) io3.emit('task:deleted', { id: parseInt(req.params.id) });
  res.json({ message: 'Task deleted' });
});

export default router;
