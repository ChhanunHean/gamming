import { Router } from 'express';
import { queryOne, query } from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { hashPassword, generateTotpSecret } from '../utils/auth.js';
import { auditMiddleware } from '../middleware/audit.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', authenticate, requireRole('manager'), asyncHandler(async (_req, res) => {
  const staff = await queryAll(`
    SELECT id, name, role, username, is_active, created_at
    FROM staff
    ORDER BY role DESC, name ASC
  `);
  res.json(staff);
}));

router.post('/', authenticate, requireRole('manager'), auditMiddleware('CREATE_STAFF'), asyncHandler(async (req, res) => {
  const { name, role, username, password } = req.body;

  if (!name?.trim() || !username?.trim() || !password || !['manager', 'staff'].includes(role)) {
    return res.status(400).json({ error: 'Valid name, role, username, and password are required' });
  }

  const existing = await queryOne('SELECT id FROM staff WHERE username = $1', [username.trim()]);
  if (existing) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  const totp = generateTotpSecret(username.trim());
  const inserted = await queryOne(
    `INSERT INTO staff (name, role, username, password_hash, totp_secret)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [name.trim(), role, username.trim(), hashPassword(password), totp.base32]
  );

  res.status(201).json({
    id: inserted.id,
    name: name.trim(),
    role,
    username: username.trim(),
    totpSecret: totp.base32,
    otpauthUrl: totp.otpauth_url,
  });
}));

router.patch('/:id', authenticate, requireRole('manager'), auditMiddleware('UPDATE_STAFF'), asyncHandler(async (req, res) => {
  const { name, role, isActive, password } = req.body;
  const staff = await queryOne('SELECT * FROM staff WHERE id = $1', [req.params.id]);

  if (!staff) {
    return res.status(404).json({ error: 'Staff not found' });
  }

  if (name?.trim()) {
    await query('UPDATE staff SET name = $1 WHERE id = $2', [name.trim(), staff.id]);
  }
  if (role && ['manager', 'staff'].includes(role)) {
    await query('UPDATE staff SET role = $1 WHERE id = $2', [role, staff.id]);
  }
  if (typeof isActive === 'boolean') {
    await query('UPDATE staff SET is_active = $1 WHERE id = $2', [isActive, staff.id]);
  }
  if (password) {
    await query('UPDATE staff SET password_hash = $1 WHERE id = $2', [hashPassword(password), staff.id]);
  }

  const updated = await queryOne(
    'SELECT id, name, role, username, is_active, created_at FROM staff WHERE id = $1',
    [staff.id]
  );
  res.json(updated);
}));

router.post('/:id/reset-2fa', authenticate, requireRole('manager'), auditMiddleware('RESET_2FA'), asyncHandler(async (req, res) => {
  const staff = await queryOne('SELECT * FROM staff WHERE id = $1', [req.params.id]);
  if (!staff) {
    return res.status(404).json({ error: 'Staff not found' });
  }

  const totp = generateTotpSecret(staff.username);
  await query('UPDATE staff SET totp_secret = $1 WHERE id = $2', [totp.base32, staff.id]);

  res.json({
    totpSecret: totp.base32,
    otpauthUrl: totp.otpauth_url,
  });
}));

export default router;
