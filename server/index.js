import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const allowedOrigins = new Set((process.env.CORS_ORIGINS || 'http://localhost:3000').split(',').map((origin) => origin.trim()).filter(Boolean));

// Clerk validates the session JWT and attaches verified auth state before routes run.
app.use(clerkMiddleware());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '64kb' }));
app.get('/api/health', (_req, res) => res.json({ ok: true, configured: { clerk: Boolean(process.env.CLERK_SECRET_KEY), database: Boolean(process.env.DATABASE_URL) } }));
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

const clientDist = join(__dirname, '..', 'client', 'dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) res.sendFile(join(clientDist, 'index.html'));
  });
}

app.use((error, _req, res, _next) => {
  if (error.message === 'Origin not allowed') return res.status(403).json({ error: 'Origin not allowed' });
  console.error('Request failed:', error.message);
  return res.status(500).json({ error: 'Internal server error' });
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = process.env.PORT || 5000;
  app.listen(port, '0.0.0.0', () => console.log(`Server running on port ${port}`));
}

export default app;
