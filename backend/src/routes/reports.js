import { Router } from 'express';
import { queryAll } from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/customers', authenticate, asyncHandler(async (req, res) => {
  const { period = 'daily' } = req.query;
  let groupExpr = 'check_in_time::date';
  let limit = 30;

  if (period === 'weekly') {
    groupExpr = "TO_CHAR(check_in_time, 'IYYY-IW')";
    limit = 12;
  } else if (period === 'monthly') {
    groupExpr = "TO_CHAR(check_in_time, 'YYYY-MM')";
    limit = 12;
  }

  const data = await queryAll(
    `SELECT ${groupExpr} AS period,
            COUNT(*)::int AS visits,
            COUNT(DISTINCT customer_id)::int AS unique_customers
     FROM sessions
     GROUP BY 1
     ORDER BY period DESC
     LIMIT $1`,
    [limit]
  );

  res.json(data.reverse());
}));

router.get('/revenue', authenticate, asyncHandler(async (req, res) => {
  const { period = 'daily' } = req.query;
  let groupExpr = 'payment_date::date';
  let limit = 30;

  if (period === 'weekly') {
    groupExpr = "TO_CHAR(payment_date, 'IYYY-IW')";
    limit = 12;
  } else if (period === 'monthly') {
    groupExpr = "TO_CHAR(payment_date, 'YYYY-MM')";
    limit = 12;
  }

  const data = await queryAll(
    `SELECT ${groupExpr} AS period,
            COALESCE(SUM(amount), 0)::float AS revenue,
            COUNT(*)::int AS transactions
     FROM payments
     GROUP BY 1
     ORDER BY period DESC
     LIMIT $1`,
    [limit]
  );

  res.json(data.reverse());
}));

router.get('/stations', authenticate, asyncHandler(async (_req, res) => {
  const usage = await queryAll(`
    SELECT
      st.name,
      st.status,
      COUNT(s.id)::int AS total_sessions,
      SUM(CASE WHEN s.status = 'active' THEN 1 ELSE 0 END)::int AS active_sessions,
      COALESCE(SUM(s.duration_minutes), 0)::int AS total_minutes
    FROM stations st
    LEFT JOIN sessions s ON s.station_id = st.id
    GROUP BY st.id, st.name, st.status
    ORDER BY total_sessions DESC
  `);
  res.json(usage);
}));

router.get('/staff-activity', authenticate, requireRole('manager'), asyncHandler(async (_req, res) => {
  const logins = await queryAll(`
    SELECT username, success, ip_address, created_at
    FROM login_attempts
    ORDER BY created_at DESC
    LIMIT 100
  `);

  const transactions = await queryAll(`
    SELECT sf.name, sf.role,
           COUNT(p.id)::int AS payment_count,
           COALESCE(SUM(p.amount), 0)::float AS total_amount
    FROM staff sf
    LEFT JOIN payments p ON p.staff_id = sf.id
    GROUP BY sf.id, sf.name, sf.role
    ORDER BY payment_count DESC
  `);

  const activityLogs = await queryAll(`
    SELECT a.*, sf.name AS staff_name
    FROM audit_logs a
    LEFT JOIN staff sf ON sf.id = a.staff_id
    ORDER BY a.created_at DESC
    LIMIT 100
  `);

  res.json({ logins, transactions, activityLogs });
}));

export default router;
