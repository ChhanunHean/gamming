import { Router } from 'express';
import { queryOne, queryAll } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { auditMiddleware } from '../middleware/audit.js';
import { calculateSessionAmount, generateReceiptNumber } from '../utils/pricing.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { period = 'all' } = req.query;
  let dateFilter = '';
  const params = [];

  if (period === 'today') {
    dateFilter = 'AND p.payment_date::date = CURRENT_DATE';
  } else if (period === 'week') {
    dateFilter = "AND p.payment_date::date >= CURRENT_DATE - INTERVAL '7 days'";
  } else if (period === 'month') {
    dateFilter = 'AND p.payment_date >= date_trunc(\'month\', CURRENT_DATE)';
  }

  const payments = await queryAll(`
    SELECT
      p.*,
      s.duration_minutes,
      c.name AS customer_name,
      st.name AS station_name,
      sf.name AS staff_name
    FROM payments p
    JOIN sessions s ON s.id = p.session_id
    JOIN customers c ON c.id = s.customer_id
    JOIN stations st ON st.id = s.station_id
    JOIN staff sf ON sf.id = p.staff_id
    WHERE 1=1 ${dateFilter}
    ORDER BY p.payment_date DESC
    LIMIT 500
  `, params);

  res.json(payments);
}));

router.post('/', authenticate, auditMiddleware('RECORD_PAYMENT'), asyncHandler(async (req, res) => {
  const { sessionId, paymentMethod, amount } = req.body;
  const validMethods = ['cash', 'card', 'qr', 'ewallet'];

  if (!sessionId || !validMethods.includes(paymentMethod)) {
    return res.status(400).json({ error: 'Session ID and valid payment method are required' });
  }

  const session = await queryOne('SELECT * FROM sessions WHERE id = $1', [sessionId]);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (session.status !== 'completed') {
    return res.status(400).json({ error: 'Session must be checked out before payment' });
  }

  const existing = await queryOne('SELECT id FROM payments WHERE session_id = $1', [sessionId]);
  if (existing) {
    return res.status(400).json({ error: 'Payment already recorded for this session' });
  }

  const calculatedAmount = amount ?? await calculateSessionAmount(session.duration_minutes || 0);
  const receiptNumber = await generateReceiptNumber();

  const payment = await queryOne(
    `INSERT INTO payments (session_id, amount, payment_method, receipt_number, staff_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [sessionId, calculatedAmount, paymentMethod, receiptNumber, req.staff.id]
  ).then(async (inserted) =>
    queryOne(
      `SELECT p.*, c.name AS customer_name, st.name AS station_name
       FROM payments p
       JOIN sessions s ON s.id = p.session_id
       JOIN customers c ON c.id = s.customer_id
       JOIN stations st ON st.id = s.station_id
       WHERE p.id = $1`,
      [inserted.id]
    )
  );

  res.status(201).json(payment);
}));

router.get('/calculate/:sessionId', authenticate, asyncHandler(async (req, res) => {
  const session = await queryOne('SELECT * FROM sessions WHERE id = $1', [req.params.sessionId]);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const duration = session.duration_minutes || 0;
  res.json({
    durationMinutes: duration,
    amount: await calculateSessionAmount(duration),
  });
}));

export default router;
