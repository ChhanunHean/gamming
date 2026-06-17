import { queryOne } from '../db.js';

export async function getHourlyRate() {
  const row = await queryOne("SELECT value FROM settings WHERE key = 'hourly_rate'");
  return parseFloat(row?.value || '5');
}

export async function calculateSessionAmount(durationMinutes) {
  const hourlyRate = await getHourlyRate();
  const hours = durationMinutes / 60;
  return Math.round(hours * hourlyRate * 100) / 100;
}

export async function generateReceiptNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const row = await queryOne(
    'SELECT COUNT(*)::int AS count FROM payments WHERE receipt_number LIKE $1',
    [`RCP-${date}-%`]
  );
  return `RCP-${date}-${String((row?.count || 0) + 1).padStart(4, '0')}`;
}

export async function getSetting(key, fallback = '') {
  const row = await queryOne('SELECT value FROM settings WHERE key = $1', [key]);
  return row?.value ?? fallback;
}
