import { Router } from 'express';
import { queryOne, queryAll, query } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { auditMiddleware } from '../middleware/audit.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', authenticate, asyncHandler(async (_req, res) => {
  const stations = await queryAll(`
    SELECT
      st.*,
      s.id AS active_session_id,
      c.name AS current_customer,
      s.check_in_time AS current_check_in
    FROM stations st
    LEFT JOIN sessions s ON s.station_id = st.id AND s.status = 'active'
    LEFT JOIN customers c ON c.id = s.customer_id
    ORDER BY st.name ASC
  `);
  res.json(stations);
}));

router.get('/stats', authenticate, asyncHandler(async (_req, res) => {
  const stats = await queryOne(`
    SELECT
      COUNT(*)::int AS total,
      SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END)::int AS available,
      SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END)::int AS occupied,
      SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END)::int AS maintenance
    FROM stations
  `);
  res.json(stats);
}));

router.patch('/:id', authenticate, auditMiddleware('UPDATE_STATION'), asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['available', 'occupied', 'maintenance'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const station = await queryOne('SELECT * FROM stations WHERE id = $1', [req.params.id]);
  if (!station) {
    return res.status(404).json({ error: 'Station not found' });
  }

  if (status === 'available' || status === 'maintenance') {
    const activeSession = await queryOne(
      "SELECT id FROM sessions WHERE station_id = $1 AND status = 'active'",
      [station.id]
    );
    if (activeSession) {
      return res.status(400).json({ error: 'Cannot change status while session is active' });
    }
  }

  await query('UPDATE stations SET status = $1 WHERE id = $2', [status, station.id]);
  const updated = await queryOne('SELECT * FROM stations WHERE id = $1', [station.id]);
  res.json(updated);
}));

export default router;
