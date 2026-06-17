import { Router } from 'express';
import db from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { auditMiddleware } from '../middleware/audit.js';

const router = Router();

router.get('/', authenticate, requireRole('manager'), (_req, res) => {
  const settings = db.prepare('SELECT key, value FROM settings').all();
  res.json(Object.fromEntries(settings.map((s) => [s.key, s.value])));
});

router.put('/', authenticate, requireRole('manager'), auditMiddleware('UPDATE_SETTINGS'), (req, res) => {
  const allowed = ['hourly_rate', 'center_name', 'center_address', 'center_phone', 'center_email', 'center_hours', 'inactivity_timeout_minutes'];
  const update = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      update.run(key, String(req.body[key]));
    }
  }

  const settings = db.prepare('SELECT key, value FROM settings').all();
  res.json(Object.fromEntries(settings.map((s) => [s.key, s.value])));
});

export default router;
