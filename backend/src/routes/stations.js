import { Router } from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { auditMiddleware } from '../middleware/audit.js';

const router = Router();

router.get('/', authenticate, (_req, res) => {
  const stations = db.prepare(`
    SELECT
      st.*,
      s.id as active_session_id,
      c.name as current_customer,
      s.check_in_time as current_check_in
    FROM stations st
    LEFT JOIN sessions s ON s.station_id = st.id AND s.status = 'active'
    LEFT JOIN customers c ON c.id = s.customer_id
    ORDER BY st.name ASC
  `).all();

  res.json(stations);
});

router.get('/stats', authenticate, (_req, res) => {
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
      SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied,
      SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance
    FROM stations
  `).get();

  res.json(stats);
});

router.patch('/:id', authenticate, auditMiddleware('UPDATE_STATION'), (req, res) => {
  const { status } = req.body;
  const validStatuses = ['available', 'occupied', 'maintenance'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const station = db.prepare('SELECT * FROM stations WHERE id = ?').get(req.params.id);
  if (!station) {
    return res.status(404).json({ error: 'Station not found' });
  }

  if (status === 'available' || status === 'maintenance') {
    const activeSession = db
      .prepare("SELECT id FROM sessions WHERE station_id = ? AND status = 'active'")
      .get(station.id);
    if (activeSession) {
      return res.status(400).json({ error: 'Cannot change status while session is active' });
    }
  }

  db.prepare('UPDATE stations SET status = ? WHERE id = ?').run(status, station.id);
  const updated = db.prepare('SELECT * FROM stations WHERE id = ?').get(station.id);
  res.json(updated);
});

export default router;
