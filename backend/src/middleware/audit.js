import { query } from '../db.js';

export function logAudit(staffId, action, details = null, ipAddress = null) {
  query(
    'INSERT INTO audit_logs (staff_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
    [staffId, action, details ? JSON.stringify(details) : null, ipAddress]
  ).catch(console.error);
}

export function auditMiddleware(action, getDetails) {
  return (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode < 400 && req.staff) {
        const details = typeof getDetails === 'function' ? getDetails(req, res) : getDetails;
        logAudit(req.staff.id, action, details, req.ip);
      }
    });
    next();
  };
}
