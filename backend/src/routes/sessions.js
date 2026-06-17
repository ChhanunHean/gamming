import { Router } from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { auditMiddleware } from '../middleware/audit.js';

const router = Router();

router.get('/', authenticate, (_req, res) => {
  const sessions = db.prepare(`
    SELECT
      s.*,
      c.name as customer_name,
      st.name as station_name,
      si.name as check_in_staff_name
    FROM sessions s
    JOIN customers c ON c.id = s.customer_id
    JOIN stations st ON st.id = s.station_id
    JOIN staff si ON si.id = s.check_in_staff_id
    ORDER BY s.check_in_time DESC
    LIMIT 200
  `).all();

  res.json(sessions);
});

router.get('/active', authenticate, (_req, res) => {
  const sessions = db.prepare(`
    SELECT
      s.*,
      c.name as customer_name,
      st.name as station_name,
      st.status as station_status,
      si.name as check_in_staff_name,
      ROUND((julianday('now') - julianday(s.check_in_time)) * 24 * 60) as elapsed_minutes
    FROM sessions s
    JOIN customers c ON c.id = s.customer_id
    JOIN stations st ON st.id = s.station_id
    JOIN staff si ON si.id = s.check_in_staff_id
    WHERE s.status = 'active'
    ORDER BY s.check_in_time ASC
  `).all();

  res.json(sessions);
});

router.post('/check-in', authenticate, auditMiddleware('CHECK_IN'), (req, res) => {
  const { customerName, stationId } = req.body;

  if (!customerName?.trim() || !stationId) {
    return res.status(400).json({ error: 'Customer name and station are required' });
  }

  const station = db.prepare('SELECT * FROM stations WHERE id = ?').get(stationId);

  if (!station) {
    return res.status(404).json({ error: 'Station not found' });
  }

  if (station.status !== 'available') {
    return res.status(400).json({ error: `Station is ${station.status}` });
  }

  const activeOnStation = db
    .prepare("SELECT id FROM sessions WHERE station_id = ? AND status = 'active'")
    .get(stationId);

  if (activeOnStation) {
    return res.status(400).json({ error: 'Station already has an active session' });
  }

  const transaction = db.transaction(() => {
    let customer = db.prepare('SELECT * FROM customers WHERE name = ?').get(customerName.trim());
    if (!customer) {
      const result = db.prepare('INSERT INTO customers (name) VALUES (?)').run(customerName.trim());
      customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
    }

    const sessionResult = db.prepare(`
      INSERT INTO sessions (customer_id, station_id, check_in_staff_id)
      VALUES (?, ?, ?)
    `).run(customer.id, stationId, req.staff.id);

    db.prepare("UPDATE stations SET status = 'occupied' WHERE id = ?").run(stationId);

    return db.prepare(`
      SELECT s.*, c.name as customer_name, st.name as station_name
      FROM sessions s
      JOIN customers c ON c.id = s.customer_id
      JOIN stations st ON st.id = s.station_id
      WHERE s.id = ?
    `).get(sessionResult.lastInsertRowid);
  });

  const session = transaction();
  res.status(201).json(session);
});

router.post('/:id/check-out', authenticate, auditMiddleware('CHECK_OUT'), (req, res) => {
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (session.status !== 'active') {
    return res.status(400).json({ error: 'Session is already completed' });
  }

  const transaction = db.transaction(() => {
    db.prepare(`
      UPDATE sessions
      SET status = 'completed',
          check_out_time = datetime('now'),
          duration_minutes = ROUND((julianday('now') - julianday(check_in_time)) * 24 * 60),
          check_out_staff_id = ?
      WHERE id = ?
    `).run(req.staff.id, session.id);

    db.prepare("UPDATE stations SET status = 'available' WHERE id = ?").run(session.station_id);

    return db.prepare(`
      SELECT s.*, c.name as customer_name, st.name as station_name
      FROM sessions s
      JOIN customers c ON c.id = s.customer_id
      JOIN stations st ON st.id = s.station_id
      WHERE s.id = ?
    `).get(session.id);
  });

  const updated = transaction();
  res.json(updated);
});

export default router;
