import db from '../db.js';

export function getHourlyRate() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'hourly_rate'").get();
  return parseFloat(row?.value || '5');
}

export function calculateSessionAmount(durationMinutes) {
  const hourlyRate = getHourlyRate();
  const hours = durationMinutes / 60;
  return Math.round(hours * hourlyRate * 100) / 100;
}

export function generateReceiptNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = db
    .prepare("SELECT COUNT(*) as count FROM payments WHERE receipt_number LIKE ?")
    .get(`RCP-${date}-%`).count;
  return `RCP-${date}-${String(count + 1).padStart(4, '0')}`;
}

export function getSetting(key, fallback = '') {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row?.value ?? fallback;
}
