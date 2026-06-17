import { Router } from 'express';
import db from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/customers', authenticate, (req, res) => {
  const { period = 'daily' } = req.query;
  let groupBy = "date(check_in_time)";
  let limit = 30;

  if (period === 'weekly') {
    groupBy = "strftime('%Y-W%W', check_in_time)";
    limit = 12;
  } else if (period === 'monthly') {
    groupBy = "strftime('%Y-%m', check_in_time)";
    limit = 12;
  }

  const data = db.prepare(`
    SELECT ${groupBy} as period, COUNT(*) as visits, COUNT(DISTINCT customer_id) as unique_customers
    FROM sessions
    GROUP BY period
    ORDER BY period DESC
    LIMIT ?
  `).all(limit);

  res.json(data.reverse());
});

router.get('/revenue', authenticate, (req, res) => {
  const { period = 'daily' } = req.query;
  let groupBy = "date(payment_date)";
  let limit = 30;

  if (period === 'weekly') {
    groupBy = "strftime('%Y-W%W', payment_date)";
    limit = 12;
  } else if (period === 'monthly') {
    groupBy = "strftime('%Y-%m', payment_date)";
    limit = 12;
  }

  const data = db.prepare(`
    SELECT ${groupBy} as period, COALESCE(SUM(amount), 0) as revenue, COUNT(*) as transactions
    FROM payments
    GROUP BY period
    ORDER BY period DESC
    LIMIT ?
  `).all(limit);

  res.json(data.reverse());
});

router.get('/stations', authenticate, (_req, res) => {
  const usage = db.prepare(`
    SELECT
      st.name,
      st.status,
      COUNT(s.id) as total_sessions,
      SUM(CASE WHEN s.status = 'active' THEN 1 ELSE 0 END) as active_sessions,
      COALESCE(SUM(s.duration_minutes), 0) as total_minutes
    FROM stations st
    LEFT JOIN sessions s ON s.station_id = st.id
    GROUP BY st.id
    ORDER BY total_sessions DESC
  `).all();

  res.json(usage);
});

router.get('/staff-activity', authenticate, requireRole('manager'), (_req, res) => {
  const logins = db.prepare(`
    SELECT username, success, ip_address, created_at
    FROM login_attempts
    ORDER BY created_at DESC
    LIMIT 100
  `).all();

  const transactions = db.prepare(`
    SELECT sf.name, sf.role, COUNT(p.id) as payment_count, COALESCE(SUM(p.amount), 0) as total_amount
    FROM staff sf
    LEFT JOIN payments p ON p.staff_id = sf.id
    GROUP BY sf.id
    ORDER BY payment_count DESC
  `).all();

  const activityLogs = db.prepare(`
    SELECT a.*, sf.name as staff_name
    FROM audit_logs a
    LEFT JOIN staff sf ON sf.id = a.staff_id
    ORDER BY a.created_at DESC
    LIMIT 100
  `).all();

  res.json({ logins, transactions, activityLogs });
});

export default router;
