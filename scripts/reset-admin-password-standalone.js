/**
 * Standalone admin password reset — no TypeScript deps
 * Run: node scripts/reset-admin-password-standalone.js [username] [newPassword]
 */
const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');

const username = process.argv[2] || 'captain';
const newPassword = process.argv[3];

if (!newPassword) { console.error('Usage: node reset-admin-password-standalone.js <username> <password>'); process.exit(1); }

const dbPath = path.join(process.cwd(), '.data', 'mission-control.db');
const db = new Database(dbPath);

// Generate scrypt hash (N=65536, salt=16 bytes, key=32 bytes)
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.scryptSync(newPassword, salt, 32, { N: 65536, maxmem: 128 * 65536 * 8 * 2 }).toString('hex');
const passwordHash = `${salt}:${hash}`;

console.log(`DB: ${dbPath}`);
console.log(`Updating password for: ${username}`);

const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
if (existing) {
  db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(passwordHash, username);
  console.log(`Updated password for ${username} (ID: ${existing.id})`);
} else {
  db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(username, passwordHash, 'admin');
  console.log(`Created ${username}`);
}

// Verify
const user = db.prepare('SELECT id, username, role, password_hash FROM users WHERE username = ?').get(username);
console.log(`User: ${user.username} (${user.role})`);
console.log(`Hash stored: ${user.password_hash.substring(0, 40)}...`);

db.close();
