import { queryOne } from '../db.js';
import { verifyAccessToken } from '../utils/auth.js';

const activityMap = new Map();
const TIMEOUT_KEY = 'inactivity_timeout_minutes';

async function getTimeoutMs() {
  const row = await queryOne('SELECT value FROM settings WHERE key = $1', [TIMEOUT_KEY]);
  const minutes = parseInt(row?.value || '30', 10);
  return minutes * 60 * 1000;
}

export async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const token = header.slice(7);
    const payload = verifyAccessToken(token);
    const staff = await queryOne(
      'SELECT * FROM staff WHERE id = $1 AND is_active = TRUE',
      [payload.staffId]
    );

    if (!staff) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const lastActivity = activityMap.get(staff.id) || Date.now();
    const inactiveFor = Date.now() - lastActivity;

    if (inactiveFor > (await getTimeoutMs())) {
      activityMap.delete(staff.id);
      return res.status(401).json({ error: 'Session expired due to inactivity' });
    }

    activityMap.set(staff.id, Date.now());
    req.staff = staff;
    req.tokenPayload = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.staff || !roles.includes(req.staff.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export function clearStaffActivity(staffId) {
  activityMap.delete(staffId);
}
