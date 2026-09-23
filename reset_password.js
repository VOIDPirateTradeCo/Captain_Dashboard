const Database = require('better-sqlite3');
const { scryptSync, randomBytes } = require('crypto');

const dbPath = '.data/mission-control.db';

console.log('=== Reset Captain Password ===\n');

const db = new Database(dbPath);

// Check users table schema
const tableInfo = db.prepare("PRAGMA table_info(users)").all();
console.log('Users table schema:');
for (const col of tableInfo) {
  console.log(`  ${col.name} (${col.type})`);
}

// Hash password with scrypt (matching app's algorithm)
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;
const SCRYPT_COST = 16384;

const salt = randomBytes(SALT_LENGTH).toString('hex');
const hash = scryptSync('voidcaptain2026', salt, KEY_LENGTH, { N: SCRYPT_COST }).toString('hex');
const passwordHash = `${salt}:${hash}`;

// Delete existing captain/Captain users
db.prepare("DELETE FROM users WHERE username IN ('captain', 'Captain', 'admin')").run();
console.log('\nDeleted old users');

// Get column names
const cols = tableInfo.map(c => c.name);

// Build insert query dynamically
const placeholders = cols.map(() => '?').join(', ');
const insertSql = `INSERT INTO users (${cols.join(', ')}) VALUES (${placeholders})`;

// Build values
const values = cols.map(col => {
  if (col === 'id') return 1;
  if (col === 'username') return 'Captain';
  if (col === 'display_name') return 'Captain';
  if (col === 'role') return 'admin';
  if (col === 'password_hash') return passwordHash;
  if (col === 'workspace_id') return 1;
  if (col === 'created_at' || col === 'updated_at') return Math.floor(Date.now() / 1000);
  if (col === 'is_approved') return 1;
  if (col === 'provider') return 'local';
  if (col === 'provider_user_id') return 'captain';
  if (col === 'email') return 'captain@void.trading';
  return null;
});

console.log('Insert SQL:', insertSql);
console.log('Values:', values);

db.prepare(insertSql).run(...values);
console.log('Created Captain user');

// Verify
const verify = db.prepare('SELECT id, username, role, password_hash FROM users').all();
console.log('\nUpdated users:');
for (const u of verify) {
  console.log(`  ID=${u.id}, user=${u.username}, role=${u.role}`);
  console.log(`  Hash: ${u.password_hash.slice(0, 50)}...`);
}

db.close();
console.log('\n=== Done ===');
