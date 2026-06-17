import { Router } from 'express';
import db from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { hashPassword, generateTotpSecret } from '../utils/auth.js';
import { auditMiddleware } from '../middleware/audit.js';

const router = Router();

router.get('/', authenticate, requireRole('manager'), (_req, res) => {
  const staff = db.prepare(`
    SELECT id, name, role, username, is_active, created_at
    FROM staff
    ORDER BY role DESC, name ASC
  `).all();

  res.json(staff);
});

router.post('/', authenticate, requireRole('manager'), auditMiddleware('CREATE_STAFF'), (req, res) => {
  const { name, role, username, password } = req.body;

  if (!name?.trim() || !username?.trim() || !password || !['manager', 'staff'].includes(role)) {
    return res.status(400).json({ error: 'Valid name, role, username, and password are required' });
  }

  const existing = db.prepare('SELECT id FROM staff WHERE username = ?').get(username.trim());
  if (existing) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  const totp = generateTotpSecret(username.trim());
  const result = db.prepare(`
    INSERT INTO staff (name, role, username, password_hash, totp_secret)
    VALUES (?, ?, ?, ?, ?)
  `).run(name.trim(), role, username.trim(), hashPassword(password), totp.base32);

  res.status(201).json({
    id: result.lastInsertRowid,
    name: name.trim(),
    role,
    username: username.trim(),
    totpSecret: totp.base32,
    otpauthUrl: totp.otpauth_url,
  });
});

router.patch('/:id', authenticate, requireRole('manager'), auditMiddleware('UPDATE_STAFF'), (req, res) => {
  const { name, role, isActive, password } = req.body;
  const staff = db.prepare('SELECT * FROM staff WHERE id = ?').get(req.params.id);

  if (!staff) {
    return res.status(404).json({ error: 'Staff not found' });
  }

  if (name?.trim()) {
    db.prepare('UPDATE staff SET name = ? WHERE id = ?').run(name.trim(), staff.id);
  }
  if (role && ['manager', 'staff'].includes(role)) {
    db.prepare('UPDATE staff SET role = ? WHERE id = ?').run(role, staff.id);
  }
  if (typeof isActive === 'boolean') {
    db.prepare('UPDATE staff SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, staff.id);
  }
  if (password) {
    db.prepare('UPDATE staff SET password_hash = ? WHERE id = ?').run(hashPassword(password), staff.id);
  }

  const updated = db.prepare('SELECT id, name, role, username, is_active, created_at FROM staff WHERE id = ?').get(staff.id);
  res.json(updated);
});

router.post('/:id/reset-2fa', authenticate, requireRole('manager'), auditMiddleware('RESET_2FA'), (req, res) => {
  const staff = db.prepare('SELECT * FROM staff WHERE id = ?').get(req.params.id);
  if (!staff) {
    return res.status(404).json({ error: 'Staff not found' });
  }

  const totp = generateTotpSecret(staff.username);
  db.prepare('UPDATE staff SET totp_secret = ? WHERE id = ?').run(totp.base32, staff.id);

  res.json({
    totpSecret: totp.base32,
    otpauthUrl: totp.otpauth_url,
  });
});

export default router;
