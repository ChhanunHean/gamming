import { Router } from 'express';
import { query, queryAll } from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { auditMiddleware } from '../middleware/audit.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', authenticate, requireRole('manager'), asyncHandler(async (_req, res) => {
  const settings = await queryAll('SELECT key, value FROM settings');
  res.json(Object.fromEntries(settings.map((s) => [s.key, s.value])));
}));

router.put('/', authenticate, requireRole('manager'), auditMiddleware('UPDATE_SETTINGS'), asyncHandler(async (req, res) => {
  const allowed = [
    'hourly_rate', 'center_name', 'center_address', 'center_phone',
    'center_email', 'center_hours', 'inactivity_timeout_minutes',
  ];

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      await query(
        `INSERT INTO settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, String(req.body[key])]
      );
    }
  }

  const settings = await queryAll('SELECT key, value FROM settings');
  res.json(Object.fromEntries(settings.map((s) => [s.key, s.value])));
}));

export default router;
