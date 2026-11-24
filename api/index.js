import express from 'express';
import cors from 'cors';
import authRoutes from '../server/routes/auth.js';
import taskRoutes from '../server/routes/tasks.js';
import { initDb } from '../server/db.js';
import { authorizedParties } from '../server/middleware/auth.js';

const app = express();
app.use(cors({ origin: authorizedParties(), methods: ['GET', 'POST', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json({ limit: '32kb' }));
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

let ready;
export default async function handler(req, res) {
  try {
    ready ||= initDb();
    await ready;
    return app(req, res);
  } catch (error) {
    ready = undefined;
    console.error('API initialization failed:', error.message);
    return res.status(error.code === 'DATABASE_NOT_CONFIGURED' ? 503 : 500)
      .json({ error: error.code === 'DATABASE_NOT_CONFIGURED' ? error.message : 'API unavailable' });
  }
}
