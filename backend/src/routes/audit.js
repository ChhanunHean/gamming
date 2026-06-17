import { Router } from 'express';
import db from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, requireRole('manager'), (req, res) => {
  const { limit = 200 } = req.query;
  const logs = db.prepare(`
    SELECT a.*, sf.name as staff_name, sf.username
    FROM audit_logs a
    LEFT JOIN staff sf ON sf.id = a.staff_id
    ORDER BY a.created_at DESC
    LIMIT ?
  `).all(parseInt(limit, 10));

  res.json(logs);
});

export default router;
