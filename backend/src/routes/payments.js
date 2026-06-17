import { Router } from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { auditMiddleware } from '../middleware/audit.js';
import { calculateSessionAmount, generateReceiptNumber } from '../utils/pricing.js';

const router = Router();

router.get('/', authenticate, (req, res) => {
  const { period = 'all' } = req.query;
  let dateFilter = '';

  if (period === 'today') dateFilter = "AND date(p.payment_date) = date('now')";
  else if (period === 'week') dateFilter = "AND date(p.payment_date) >= date('now', '-7 days')";
  else if (period === 'month') dateFilter = "AND date(p.payment_date) >= date('now', 'start of month')";

  const payments = db.prepare(`
    SELECT
      p.*,
      s.duration_minutes,
      c.name as customer_name,
      st.name as station_name,
      sf.name as staff_name
    FROM payments p
    JOIN sessions s ON s.id = p.session_id
    JOIN customers c ON c.id = s.customer_id
    JOIN stations st ON st.id = s.station_id
    JOIN staff sf ON sf.id = p.staff_id
    WHERE 1=1 ${dateFilter}
    ORDER BY p.payment_date DESC
    LIMIT 500
  `).all();

  res.json(payments);
});

router.post('/', authenticate, auditMiddleware('RECORD_PAYMENT'), (req, res) => {
  const { sessionId, paymentMethod, amount } = req.body;
  const validMethods = ['cash', 'card', 'qr', 'ewallet'];

  if (!sessionId || !validMethods.includes(paymentMethod)) {
    return res.status(400).json({ error: 'Session ID and valid payment method are required' });
  }

  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (session.status !== 'completed') {
    return res.status(400).json({ error: 'Session must be checked out before payment' });
  }

  const existing = db.prepare('SELECT id FROM payments WHERE session_id = ?').get(sessionId);
  if (existing) {
    return res.status(400).json({ error: 'Payment already recorded for this session' });
  }

  const calculatedAmount = amount ?? calculateSessionAmount(session.duration_minutes || 0);
  const receiptNumber = generateReceiptNumber();

  const result = db.prepare(`
    INSERT INTO payments (session_id, amount, payment_method, receipt_number, staff_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(sessionId, calculatedAmount, paymentMethod, receiptNumber, req.staff.id);

  const payment = db.prepare(`
    SELECT p.*, c.name as customer_name, st.name as station_name
    FROM payments p
    JOIN sessions s ON s.id = p.session_id
    JOIN customers c ON c.id = s.customer_id
    JOIN stations st ON st.id = s.station_id
    WHERE p.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(payment);
});

router.get('/calculate/:sessionId', authenticate, (req, res) => {
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const duration = session.duration_minutes || 0;
  res.json({
    durationMinutes: duration,
    amount: calculateSessionAmount(duration),
  });
});

export default router;
