import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import db from '../db.js';
import {
  verifyPassword,
  verifyTotp,
  createPendingToken,
  verifyPendingToken,
  createAccessToken,
} from '../utils/auth.js';
import { authenticate, clearStaffActivity } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Try again later.' },
});

function logLoginAttempt(username, success, ip) {
  db.prepare(
    'INSERT INTO login_attempts (username, success, ip_address) VALUES (?, ?, ?)'
  ).run(username, success ? 1 : 0, ip);
}

router.post('/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;

  if (!username?.trim() || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const staff = db.prepare('SELECT * FROM staff WHERE username = ? AND is_active = 1').get(username.trim());

  if (!staff || !verifyPassword(password, staff.password_hash)) {
    logLoginAttempt(username.trim(), false, req.ip);
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  logLoginAttempt(username.trim(), true, req.ip);
  const pendingToken = createPendingToken(staff.id);

  res.json({
    requires2FA: true,
    pendingToken,
    staff: { id: staff.id, name: staff.name, role: staff.role, username: staff.username },
  });
});

router.post('/verify-2fa', loginLimiter, (req, res) => {
  const { pendingToken, otp } = req.body;

  if (!pendingToken || !otp?.trim()) {
    return res.status(400).json({ error: 'Pending token and OTP are required' });
  }

  try {
    const { staffId } = verifyPendingToken(pendingToken);
    const staff = db.prepare('SELECT * FROM staff WHERE id = ? AND is_active = 1').get(staffId);

    if (!staff) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    if (!verifyTotp(staff.totp_secret, otp.trim())) {
      logLoginAttempt(staff.username, false, req.ip);
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
});

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
