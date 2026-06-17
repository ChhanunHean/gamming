import { initDb, query, queryOne } from './db.js';
import { hashPassword, generateTotpSecret } from './utils/auth.js';

const staffAccounts = [
  { name: 'Alex Manager', role: 'manager', username: 'manager', password: 'Manager@123' },
  { name: 'Sam Staff', role: 'staff', username: 'staff1', password: 'Staff@123' },
  { name: 'Jordan Staff', role: 'staff', username: 'staff2', password: 'Staff@123' },
  { name: 'Taylor Staff', role: 'staff', username: 'staff3', password: 'Staff@123' },
  { name: 'Casey Staff', role: 'staff', username: 'staff4', password: 'Staff@123' },
];

await initDb();

const stationCount = (await queryOne('SELECT COUNT(*)::int AS count FROM stations')).count;

if (stationCount === 0) {
  for (let i = 1; i <= 12; i += 1) {
    await query('INSERT INTO stations (name) VALUES ($1)', [`Station ${String(i).padStart(2, '0')}`]);
  }
  console.log('Created 12 gaming stations');
}

const existingStaff = (await queryOne('SELECT COUNT(*)::int AS count FROM staff')).count;

if (existingStaff === 0) {
  console.log('\n=== STAFF ACCOUNTS CREATED ===\n');
  console.log('Use Google Authenticator or any TOTP app with these secrets:\n');

  for (const account of staffAccounts) {
    const totp = generateTotpSecret(account.username);
    await query(
      `INSERT INTO staff (name, role, username, password_hash, totp_secret)
       VALUES ($1, $2, $3, $4, $5)`,
      [account.name, account.role, account.username, hashPassword(account.password), totp.base32]
    );

    console.log(`${account.name} (${account.role})`);
    console.log(`  Username: ${account.username}`);
    console.log(`  Password: ${account.password}`);
    console.log(`  2FA Secret: ${totp.base32}`);
    console.log(`  OTP Auth URL: ${totp.otpauth_url}\n`);
  }

  console.log('================================\n');
} else {
  console.log('Database already seeded. Skipping staff creation.');
}

console.log('Seed complete.');
process.exit(0);
