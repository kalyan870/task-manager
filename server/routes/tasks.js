import { Router } from 'express';
import { taskRepository } from '../db.js';
import { requireUser } from '../middleware/auth.js';

const router = Router();
router.use(requireUser);

const statuses = new Set(['pending', 'in_progress', 'completed']);
const priorities = new Set(['low', 'medium', 'high']);
const validId = (value) => /^\d+$/.test(value) && Number(value) > 0;
const fail = (res) => res.status(503).json({ error: 'Task storage is temporarily unavailable' });

router.get('/', async (req, res) => {
  const { status, priority, sort } = req.query;
  if (status && !statuses.has(status)) return res.status(400).json({ error: 'Invalid status' });
  if (priority && !priorities.has(priority)) return res.status(400).json({ error: 'Invalid priority' });
  try {
    const tasks = await taskRepository.list(req.userId, { status, priority, sort });
    res.json({ tasks });
  } catch { fail(res); }
});

router.get('/:id', async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid task id' });
  try {
    const task = await taskRepository.get(req.userId, req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ task });
  } catch { fail(res); }
});

router.post('/', async (req, res) => {
  const { title, description = '', status = 'pending', priority = 'medium', due_date = null } = req.body ?? {};
  if (typeof title !== 'string' || !title.trim() || title.length > 200) return res.status(400).json({ error: 'Title must contain 1 to 200 characters' });
  if (typeof description !== 'string' || description.length > 5000) return res.status(400).json({ error: 'Description is too long' });
  if (!statuses.has(status) || !priorities.has(priority)) return res.status(400).json({ error: 'Invalid task status or priority' });
  if (due_date !== null && (typeof due_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(due_date))) return res.status(400).json({ error: 'Invalid due date' });
  try {
    const task = await taskRepository.create(req.userId, { title: title.trim(), description, status, priority, due_date });
    res.status(201).json({ task });
  } catch { fail(res); }
});

router.put('/:id', async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid task id' });
  try {
    const current = await taskRepository.get(req.userId, req.params.id);
    if (!current) return res.status(404).json({ error: 'Task not found' });
    const { title = current.title, description = current.description, status = current.status, priority = current.priority, due_date = current.due_date } = req.body ?? {};
    if (typeof title !== 'string' || !title.trim() || title.length > 200) return res.status(400).json({ error: 'Title must contain 1 to 200 characters' });
    if (typeof description !== 'string' || description.length > 5000) return res.status(400).json({ error: 'Description is too long' });
    if (!statuses.has(status) || !priorities.has(priority)) return res.status(400).json({ error: 'Invalid task status or priority' });
    if (due_date !== null && typeof due_date !== 'string') return res.status(400).json({ error: 'Invalid due date' });
    const task = await taskRepository.update(req.userId, req.params.id, { title: title.trim(), description, status, priority, due_date });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ task });
  } catch { fail(res); }
});

router.delete('/:id', async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid task id' });
  try {
    if (!(await taskRepository.remove(req.userId, req.params.id))) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task deleted' });
  } catch { fail(res); }
});

export default router;
