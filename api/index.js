import express from 'express';
import cors from 'cors';
import { initDb } from '../server/db.js';
import authRoutes from '../server/routes/auth.js';
import taskRoutes from '../server/routes/tasks.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

let initialized = false;

export default async function handler(req, res) {
  if (!initialized) {
    await initDb();
    initialized = true;
  }
  return app(req, res);
}
