import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { verifyToken } from '@clerk/backend';
import { authorizedParties, verifyOptions } from './middleware/auth.js';
import { initDb } from './db.js';
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';

const app = express();
const server = createServer(app);
const origins = authorizedParties();
const corsOptions = { origin: origins, methods: ['GET', 'POST', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'] };
const io = new Server(server, { cors: corsOptions });
app.use(cors(corsOptions));
app.use(express.json({ limit: '32kb' }));
app.set('io', io);
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (typeof token !== 'string' || (!process.env.CLERK_SECRET_KEY && !process.env.CLERK_JWT_KEY) || !origins.length) {
    return next(new Error('Unauthorized'));
  }
  try {
    const claims = await verifyToken(token, verifyOptions());
    if (typeof claims.sub !== 'string' || !claims.sub) return next(new Error('Unauthorized'));
    socket.data.userId = claims.sub;
    return next();
  } catch {
    return next(new Error('Unauthorized'));
  }
});
io.on('connection', (socket) => socket.join(`tasks:${socket.data.userId}`));

const here = dirname(fileURLToPath(import.meta.url));
const clientDist = join(here, '..', 'client', 'dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) res.sendFile(join(clientDist, 'index.html'));
  });
}

app.use((error, req, res, _next) => {
  console.error('Request failed:', error.message);
  const status = error.code === 'DATABASE_NOT_CONFIGURED' ? 503 : 500;
  res.status(status).json({ error: status === 503 ? error.message : 'Request could not be completed' });
});

const port = process.env.PORT || 5000;
initDb().then(() => server.listen(port, '0.0.0.0', () => console.log(`Task API listening on ${port}`)))
  .catch((error) => { console.error('Database initialization failed:', error.message); process.exitCode = 1; });
