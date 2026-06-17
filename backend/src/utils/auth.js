import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';

const JWT_SECRET = process.env.JWT_SECRET || 'gaming-center-dev-secret-change-in-production';
const PENDING_SECRET = process.env.PENDING_SECRET || 'gaming-center-pending-secret';

export function hashPassword(password) {
  return bcrypt.hashSync(password, 12);
}

export function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

export function generateTotpSecret(label) {
  return speakeasy.generateSecret({
    name: `Gaming Center (${label})`,
    length: 20,
  });
}

export function verifyTotp(secret, token) {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1,
  });
}

export function createPendingToken(staffId) {
  return jwt.sign({ staffId, type: 'pending' }, PENDING_SECRET, { expiresIn: '5m' });
}

export function verifyPendingToken(token) {
  const payload = jwt.verify(token, PENDING_SECRET);
  if (payload.type !== 'pending') throw new Error('Invalid token type');
  return payload;
}

export function createAccessToken(staff) {
  return jwt.sign(
    {
      staffId: staff.id,
      role: staff.role,
      name: staff.name,
      username: staff.username,
      type: 'access',
    },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

export function verifyAccessToken(token) {
  const payload = jwt.verify(token, JWT_SECRET);
  if (payload.type !== 'access') throw new Error('Invalid token type');
  return payload;
}

export { JWT_SECRET };
