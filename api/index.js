import express from 'express';
import cors from 'cors';
import authRoutes from '../server/routes/auth.js';
import taskRoutes from '../server/routes/tasks.js';
import { initDb } from '../server/db.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

let ready = false;

export default async function handler(req, res) {
  try {
    if (!ready) {
      await initDb();
      ready = true;
    }
    return app(req, res);
  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
