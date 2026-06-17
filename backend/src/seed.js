import './db.js';
import db from './db.js';
import { hashPassword, generateTotpSecret } from './utils/auth.js';

const staffAccounts = [
  { name: 'Alex Manager', role: 'manager', username: 'manager', password: 'Manager@123' },
  { name: 'Sam Staff', role: 'staff', username: 'staff1', password: 'Staff@123' },
  { name: 'Jordan Staff', role: 'staff', username: 'staff2', password: 'Staff@123' },
  { name: 'Taylor Staff', role: 'staff', username: 'staff3', password: 'Staff@123' },
  { name: 'Casey Staff', role: 'staff', username: 'staff4', password: 'Staff@123' },
];

const stationCount = db.prepare('SELECT COUNT(*) as count FROM stations').get().count;

if (stationCount === 0) {
  const insertStation = db.prepare('INSERT INTO stations (name) VALUES (?)');
  for (let i = 1; i <= 12; i += 1) {
    insertStation.run(`Station ${String(i).padStart(2, '0')}`);
  }
  console.log('Created 12 gaming stations');
}

const existingStaff = db.prepare('SELECT COUNT(*) as count FROM staff').get().count;

if (existingStaff === 0) {
  const insertStaff = db.prepare(`
    INSERT INTO staff (name, role, username, password_hash, totp_secret)
    VALUES (?, ?, ?, ?, ?)
  `);

  console.log('\n=== STAFF ACCOUNTS CREATED ===\n');
  console.log('Use Google Authenticator or any TOTP app with these secrets:\n');

  for (const account of staffAccounts) {
    const totp = generateTotpSecret(account.username);
    insertStaff.run(
      account.name,
      account.role,
      account.username,
      hashPassword(account.password),
      totp.base32
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
