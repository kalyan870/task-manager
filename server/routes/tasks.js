import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { taskRepository } from '../db.js';

const router = Router();
const statuses = new Set(['pending', 'in_progress', 'completed']);
const priorities = new Set(['low', 'medium', 'high']);
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const validId = (id) => /^\d+$/.test(String(id)) && Number(id) > 0;
const validDate = (value) => value === null || value === '' || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)));
const emit = (req, event, data) => req.app.get('io')?.to(`tasks:${req.userId}`).emit(event, data);

router.use(authenticateToken);

router.get('/', asyncRoute(async (req, res) => {
  const { status, priority, sort } = req.query;
  if (status && !statuses.has(status)) return res.status(400).json({ error: 'Invalid status' });
  if (priority && !priorities.has(priority)) return res.status(400).json({ error: 'Invalid priority' });
  res.json({ tasks: await taskRepository.list(req.userId, { status, priority, sort }) });
}));

router.get('/:id', asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid task id' });
  const task = await taskRepository.find(req.userId, req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json({ task });
}));

router.post('/', asyncRoute(async (req, res) => {
  const { title, description = '', status = 'pending', priority = 'medium', due_date = null } = req.body || {};
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 200) return res.status(400).json({ error: 'Title is required and must be 200 characters or fewer' });
  if (typeof description !== 'string' || description.length > 4000) return res.status(400).json({ error: 'Description must be 4,000 characters or fewer' });
  if (!statuses.has(status) || !priorities.has(priority) || !validDate(due_date)) return res.status(400).json({ error: 'Invalid task fields' });
  const task = await taskRepository.create(req.userId, { title: title.trim(), description, status, priority, due_date: due_date || null });
  emit(req, 'task:created', task);
  res.status(201).json({ task });
}));

router.put('/:id', asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid task id' });
  const current = await taskRepository.find(req.userId, req.params.id);
  if (!current) return res.status(404).json({ error: 'Task not found' });
  const patch = req.body || {};
  const values = {
    title: patch.title === undefined ? current.title : typeof patch.title === 'string' ? patch.title.trim() : '',
    description: patch.description === undefined ? current.description : patch.description,
    status: patch.status === undefined ? current.status : patch.status,
    priority: patch.priority === undefined ? current.priority : patch.priority,
    due_date: patch.due_date === undefined ? (current.due_date ? current.due_date.slice(0, 10) : null) : patch.due_date,
  };
  if (!values.title || values.title.length > 200) return res.status(400).json({ error: 'Title is required and must be 200 characters or fewer' });
  if (typeof values.description !== 'string' || values.description.length > 4000) return res.status(400).json({ error: 'Description must be 4,000 characters or fewer' });
  if (!statuses.has(values.status) || !priorities.has(values.priority) || !validDate(values.due_date)) return res.status(400).json({ error: 'Invalid task fields' });
  const task = await taskRepository.update(req.userId, req.params.id, { ...values, due_date: values.due_date || null });
  emit(req, 'task:updated', task);
  res.json({ task });
}));

router.delete('/:id', asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid task id' });
  if (!await taskRepository.remove(req.userId, req.params.id)) return res.status(404).json({ error: 'Task not found' });
  emit(req, 'task:deleted', { id: String(req.params.id) });
  res.json({ message: 'Task deleted' });
}));

export default router;
