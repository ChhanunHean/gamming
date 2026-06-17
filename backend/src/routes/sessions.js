import { Router } from 'express';
import { queryOne, queryAll, withTransaction } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { auditMiddleware } from '../middleware/audit.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', authenticate, asyncHandler(async (_req, res) => {
  const sessions = await queryAll(`
    SELECT
      s.*,
      c.name AS customer_name,
      st.name AS station_name,
      si.name AS check_in_staff_name
    FROM sessions s
    JOIN customers c ON c.id = s.customer_id
    JOIN stations st ON st.id = s.station_id
    JOIN staff si ON si.id = s.check_in_staff_id
    ORDER BY s.check_in_time DESC
    LIMIT 200
  `);
  res.json(sessions);
}));

router.get('/active', authenticate, asyncHandler(async (_req, res) => {
  const sessions = await queryAll(`
    SELECT
      s.*,
      c.name AS customer_name,
      st.name AS station_name,
      st.status AS station_status,
      si.name AS check_in_staff_name,
      ROUND(EXTRACT(EPOCH FROM (NOW() - s.check_in_time)) / 60)::int AS elapsed_minutes
    FROM sessions s
    JOIN customers c ON c.id = s.customer_id
    JOIN stations st ON st.id = s.station_id
    JOIN staff si ON si.id = s.check_in_staff_id
    WHERE s.status = 'active'
    ORDER BY s.check_in_time ASC
  `);
  res.json(sessions);
}));

router.post('/check-in', authenticate, auditMiddleware('CHECK_IN'), asyncHandler(async (req, res) => {
  const { customerName, stationId } = req.body;

  if (!customerName?.trim() || !stationId) {
    return res.status(400).json({ error: 'Customer name and station are required' });
  }

  const station = await queryOne('SELECT * FROM stations WHERE id = $1', [stationId]);

  if (!station) {
    return res.status(404).json({ error: 'Station not found' });
  }

  if (station.status !== 'available') {
    return res.status(400).json({ error: `Station is ${station.status}` });
  }

  const activeOnStation = await queryOne(
    "SELECT id FROM sessions WHERE station_id = $1 AND status = 'active'",
    [stationId]
  );

  if (activeOnStation) {
    return res.status(400).json({ error: 'Station already has an active session' });
  }

  const session = await withTransaction(async (client) => {
    let customer = (
      await client.query('SELECT * FROM customers WHERE name = $1', [customerName.trim()])
    ).rows[0];

    if (!customer) {
      customer = (
        await client.query(
          'INSERT INTO customers (name) VALUES ($1) RETURNING *',
          [customerName.trim()]
        )
      ).rows[0];
    }

    const sessionResult = await client.query(
      `INSERT INTO sessions (customer_id, station_id, check_in_staff_id)
       VALUES ($1, $2, $3) RETURNING id`,
      [customer.id, stationId, req.staff.id]
    );

    await client.query("UPDATE stations SET status = 'occupied' WHERE id = $1", [stationId]);

    return (
      await client.query(
        `SELECT s.*, c.name AS customer_name, st.name AS station_name
         FROM sessions s
         JOIN customers c ON c.id = s.customer_id
         JOIN stations st ON st.id = s.station_id
         WHERE s.id = $1`,
        [sessionResult.rows[0].id]
      )
    ).rows[0];
  });

  res.status(201).json(session);
}));

router.post('/:id/check-out', authenticate, auditMiddleware('CHECK_OUT'), asyncHandler(async (req, res) => {
  const session = await queryOne('SELECT * FROM sessions WHERE id = $1', [req.params.id]);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (session.status !== 'active') {
    return res.status(400).json({ error: 'Session is already completed' });
  }

  const updated = await withTransaction(async (client) => {
    await client.query(
      `UPDATE sessions
       SET status = 'completed',
           check_out_time = NOW(),
           duration_minutes = ROUND(EXTRACT(EPOCH FROM (NOW() - check_in_time)) / 60)::int,
           check_out_staff_id = $1
       WHERE id = $2`,
      [req.staff.id, session.id]
    );

    await client.query("UPDATE stations SET status = 'available' WHERE id = $1", [session.station_id]);

    return (
      await client.query(
        `SELECT s.*, c.name AS customer_name, st.name AS station_name
         FROM sessions s
         JOIN customers c ON c.id = s.customer_id
         JOIN stations st ON st.id = s.station_id
         WHERE s.id = $1`,
        [session.id]
      )
    ).rows[0];
  });

  res.json(updated);
}));

export default router;
