import { Router } from 'express';
import db from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/stats', authenticate, (_req, res) => {
  const activeCustomers = db
    .prepare("SELECT COUNT(*) as count FROM sessions WHERE status = 'active'")
    .get().count;

  const customersToday = db
    .prepare("SELECT COUNT(*) as count FROM sessions WHERE date(check_in_time) = date('now')")
    .get().count;

  const totalVisits = db.prepare('SELECT COUNT(*) as count FROM sessions').get().count;

  const revenueToday = db
    .prepare("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE date(payment_date) = date('now')")
    .get().total;

  const revenueWeek = db
    .prepare("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE date(payment_date) >= date('now', '-7 days')")
    .get().total;

  const revenueMonth = db
    .prepare("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE date(payment_date) >= date('now', 'start of month')")
    .get().total;

  const stationStats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied,
      SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
      SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance
    FROM stations
  `).get();

  const occupancyRate = stationStats.total
    ? Math.round((stationStats.occupied / stationStats.total) * 100)
    : 0;

  const topStations = db.prepare(`
    SELECT st.name, COUNT(s.id) as usage_count
    FROM stations st
    LEFT JOIN sessions s ON s.station_id = st.id
    GROUP BY st.id
    ORDER BY usage_count DESC
    LIMIT 5
  `).all();

  const revenueByMethod = db.prepare(`
    SELECT payment_method, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
    FROM payments
    WHERE date(payment_date) >= date('now', 'start of month')
    GROUP BY payment_method
  `).all();

  const peakHours = db.prepare(`
    SELECT strftime('%H', check_in_time) as hour, COUNT(*) as visits
    FROM sessions
    GROUP BY hour
    ORDER BY visits DESC
    LIMIT 5
  `).all();

  const pendingPayments = db.prepare(`
    SELECT COUNT(*) as count
    FROM sessions s
    LEFT JOIN payments p ON p.session_id = s.id
    WHERE s.status = 'completed' AND p.id IS NULL
  `).get().count;

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
});

router.get('/staff-activity', authenticate, requireRole('manager'), (_req, res) => {
  const activity = db.prepare(`
    SELECT
      sf.name,
      sf.role,
      COUNT(DISTINCT s.id) as sessions_handled,
      COUNT(DISTINCT p.id) as payments_recorded,
      MAX(a.created_at) as last_activity
    FROM staff sf
    LEFT JOIN sessions s ON s.check_in_staff_id = sf.id OR s.check_out_staff_id = sf.id
    LEFT JOIN payments p ON p.staff_id = sf.id
    LEFT JOIN audit_logs a ON a.staff_id = sf.id
    GROUP BY sf.id
    ORDER BY sessions_handled DESC
  `).all();

  res.json(activity);
});

export default router;
