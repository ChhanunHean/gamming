import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { query, queryOne } from '../db.js';
import {
  verifyPassword,
  verifyTotp,
  createPendingToken,
  verifyPendingToken,
  createAccessToken,
} from '../utils/auth.js';
import { authenticate, clearStaffActivity } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Try again later.' },
});

async function logLoginAttempt(username, success, ip) {
  await query(
    'INSERT INTO login_attempts (username, success, ip_address) VALUES ($1, $2, $3)',
    [username, success, ip]
  );
}

router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username?.trim() || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const staff = await queryOne(
    'SELECT * FROM staff WHERE username = $1 AND is_active = TRUE',
    [username.trim()]
  );

  if (!staff || !verifyPassword(password, staff.password_hash)) {
    await logLoginAttempt(username.trim(), false, req.ip);
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  await logLoginAttempt(username.trim(), true, req.ip);
  const pendingToken = createPendingToken(staff.id);

  res.json({
    requires2FA: true,
    pendingToken,
    staff: { id: staff.id, name: staff.name, role: staff.role, username: staff.username },
  });
}));

router.post('/verify-2fa', loginLimiter, asyncHandler(async (req, res) => {
  const { pendingToken, otp } = req.body;

  if (!pendingToken || !otp?.trim()) {
    return res.status(400).json({ error: 'Pending token and OTP are required' });
  }

  try {
    const { staffId } = verifyPendingToken(pendingToken);
    const staff = await queryOne(
      'SELECT * FROM staff WHERE id = $1 AND is_active = TRUE',
      [staffId]
    );

    if (!staff) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    if (!verifyTotp(staff.totp_secret, otp.trim())) {
      await logLoginAttempt(staff.username, false, req.ip);
      return res.status(401).json({ error: 'Invalid OTP code' });
    }

    const accessToken = createAccessToken(staff);
    logAudit(staff.id, 'LOGIN', { username: staff.username }, req.ip);

    res.json({
      accessToken,
      staff: {
        id: staff.id,
        name: staff.name,
        role: staff.role,
        username: staff.username,
      },
    });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired verification session' });
  }
}));

router.get('/me', authenticate, (req, res) => {
  res.json({
    id: req.staff.id,
    name: req.staff.name,
    role: req.staff.role,
    username: req.staff.username,
  });
});

router.post('/logout', authenticate, (req, res) => {
  logAudit(req.staff.id, 'LOGOUT', null, req.ip);
  clearStaffActivity(req.staff.id);
  res.json({ message: 'Logged out successfully' });
});

export default router;
