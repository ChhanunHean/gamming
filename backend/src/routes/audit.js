import { Router } from 'express';
import { queryAll } from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', authenticate, requireRole('manager'), asyncHandler(async (req, res) => {
  const { limit = 200 } = req.query;
  const logs = await queryAll(
    `SELECT a.*, sf.name AS staff_name, sf.username
     FROM audit_logs a
     LEFT JOIN staff sf ON sf.id = a.staff_id
     ORDER BY a.created_at DESC
     LIMIT $1`,
    [parseInt(limit, 10)]
  );
  res.json(logs);
}));

export default router;
