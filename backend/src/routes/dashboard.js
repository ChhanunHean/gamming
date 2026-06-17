import { Router } from 'express';
import { queryOne, queryAll } from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/stats', authenticate, asyncHandler(async (_req, res) => {
  const activeCustomers = (await queryOne(
    "SELECT COUNT(*)::int AS count FROM sessions WHERE status = 'active'"
  )).count;

  const customersToday = (await queryOne(
    'SELECT COUNT(*)::int AS count FROM sessions WHERE check_in_time::date = CURRENT_DATE'
  )).count;

  const totalVisits = (await queryOne('SELECT COUNT(*)::int AS count FROM sessions')).count;

  const revenueToday = parseFloat(
    (await queryOne(
      'SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE payment_date::date = CURRENT_DATE'
    )).total
  );

  const revenueWeek = parseFloat(
    (await queryOne(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE payment_date::date >= CURRENT_DATE - INTERVAL '7 days'"
    )).total
  );

  const revenueMonth = parseFloat(
    (await queryOne(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE payment_date >= date_trunc('month', CURRENT_DATE)"
    )).total
  );

  const stationStats = await queryOne(`
    SELECT
      COUNT(*)::int AS total,
      SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END)::int AS occupied,
      SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END)::int AS available,
      SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END)::int AS maintenance
    FROM stations
  `);

  const occupancyRate = stationStats.total
    ? Math.round((stationStats.occupied / stationStats.total) * 100)
    : 0;

  const topStations = await queryAll(`
    SELECT st.name, COUNT(s.id)::int AS usage_count
    FROM stations st
    LEFT JOIN sessions s ON s.station_id = st.id
    GROUP BY st.id, st.name
    ORDER BY usage_count DESC
    LIMIT 5
  `);

  const revenueByMethod = await queryAll(`
    SELECT payment_method, COALESCE(SUM(amount), 0)::float AS total, COUNT(*)::int AS count
    FROM payments
    WHERE payment_date >= date_trunc('month', CURRENT_DATE)
    GROUP BY payment_method
  `);

  const peakHours = await queryAll(`
    SELECT TO_CHAR(check_in_time, 'HH24') AS hour, COUNT(*)::int AS visits
    FROM sessions
    GROUP BY 1
    ORDER BY visits DESC
    LIMIT 5
  `);

  const pendingPayments = (await queryOne(`
    SELECT COUNT(*)::int AS count
    FROM sessions s
    LEFT JOIN payments p ON p.session_id = s.id
    WHERE s.status = 'completed' AND p.id IS NULL
  `)).count;

  res.json({
    customers: {
      active: activeCustomers,
      today: customersToday,
      totalVisits,
    },
    revenue: {
      today: revenueToday,
      week: revenueWeek,
      month: revenueMonth,
      byMethod: revenueByMethod,
    },
    stations: {
      ...stationStats,
      occupancyRate,
      topStations,
    },
    operations: {
      activeSessions: activeCustomers,
      pendingPayments,
      peakHours,
    },
  });
}));

router.get('/staff-activity', authenticate, requireRole('manager'), asyncHandler(async (_req, res) => {
  const activity = await queryAll(`
    SELECT
      sf.name,
      sf.role,
      COUNT(DISTINCT s.id)::int AS sessions_handled,
      COUNT(DISTINCT p.id)::int AS payments_recorded,
      MAX(a.created_at) AS last_activity
    FROM staff sf
    LEFT JOIN sessions s ON s.check_in_staff_id = sf.id OR s.check_out_staff_id = sf.id
    LEFT JOIN payments p ON p.staff_id = sf.id
    LEFT JOIN audit_logs a ON a.staff_id = sf.id
    GROUP BY sf.id, sf.name, sf.role
    ORDER BY sessions_handled DESC
  `);
  res.json(activity);
}));

export default router;
