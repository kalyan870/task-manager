import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: { id: req.userId } });
});

export default router;
