import { Router } from 'express';
import { getDb, saveDb } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/', (req, res) => {
  const { status, priority, sort } = req.query;
  let tasks = getDb().tasks.filter(t => t.user_id === req.user.id);

  if (status) tasks = tasks.filter(t => t.status === status);
  if (priority) tasks = tasks.filter(t => t.priority === priority);

  if (sort === 'due_date') tasks.sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));
  else if (sort === 'priority') { const p = { high: 1, medium: 2, low: 3 }; tasks.sort((a, b) => (p[a.priority] || 0) - (p[b.priority] || 0)); }
  else tasks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.json({ tasks });
});

router.get('/:id', (req, res) => {
  const task = getDb().tasks.find(t => t.id === parseInt(req.params.id) && t.user_id === req.user.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json({ task });
});

router.post('/', (req, res) => {
  const { title, description, status, priority, due_date } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });

  const now = new Date().toISOString();
  const task = {
    id: Date.now(), user_id: req.user.id, title: title.trim(),
    description: description || '', status: status || 'pending',
    priority: priority || 'medium', due_date: due_date || null,
    created_at: now, updated_at: now
  };
  getDb().tasks.unshift(task);
  saveDb();

  const io = req.app.get('io');
  if (io?.emit) io.emit('task:created', task);
  res.status(201).json({ task });
});

router.put('/:id', (req, res) => {
  const task = getDb().tasks.find(t => t.id === parseInt(req.params.id) && t.user_id === req.user.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const { title, description, status, priority, due_date } = req.body;
  if (title !== undefined) task.title = title.trim();
  if (description !== undefined) task.description = description;
  if (status !== undefined) task.status = status;
  if (priority !== undefined) task.priority = priority;
  if (due_date !== undefined) task.due_date = due_date;
  task.updated_at = new Date().toISOString();
  saveDb();

  const io = req.app.get('io');
  if (io?.emit) io.emit('task:updated', task);
  res.json({ task });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const idx = db.tasks.findIndex(t => t.id === parseInt(req.params.id) && t.user_id === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Task not found' });

  db.tasks.splice(idx, 1);
  saveDb();

  const io = req.app.get('io');
  if (io?.emit) io.emit('task:deleted', { id: parseInt(req.params.id) });
  res.json({ message: 'Task deleted' });
});

export default router;
