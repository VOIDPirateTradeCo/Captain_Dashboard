/**
 * Reset admin password — direct DB update using app's hashPassword()
 * Run: node scripts/reset-admin-password.js [username] [newPassword]
 */
const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const SALT_LENGTH = 16
const KEY_LENGTH = 32
const SCRYPT_COST = 65536
const SCRYPT_MAXMEM = 128 * SCRYPT_COST * 8 * 2

function hashPassword(password) {
  const salt = require('crypto').randomBytes(SALT_LENGTH).toString('hex')
  const hash = require('crypto').scryptSync(password, salt, KEY_LENGTH, { N: SCRYPT_COST, maxmem: SCRYPT_MAXMEM }).toString('hex')
  return `${salt}:${hash.padStart(64, '0')}`
}

const targetUser = process.argv[2] || 'Captain'
const newPassword = process.argv[3] || 'Brewbeard2026!'

const dataDir = process.env.MISSION_CONTROL_DATA_DIR || path.join(process.cwd(), '.data')
const dbPath = path.join(dataDir, 'mission-control.db')

console.log(`Resetting password for: ${targetUser}`)
console.log(`DB: ${dbPath}`)

if (!fs.existsSync(dbPath)) {
  console.error('Database not found:', dbPath)
  process.exit(1)
}

const db = new Database(dbPath)

// Check current state
const before = db.prepare('SELECT id, username, role, password_hash FROM users WHERE username = ?').get(targetUser)
if (!before) {
  console.error(`User '${targetUser}' not found`)
  db.close()
  process.exit(1)
}

console.log(`Before: id=${before.id}, role=${before.role}, hash=${before.password_hash.substring(0, 30)}...`)

// Generate hash using app's exact algorithm
const newHash = hashPassword(newPassword)
console.log(`New hash: ${newHash.substring(0, 30)}...`)

// Update
const result = db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE username = ?').run(newHash, Math.floor(Date.now() / 1000), targetUser)
console.log(`Updated: ${result.changes} rows`)

// Verify
const after = db.prepare('SELECT id, username, role, password_hash FROM users WHERE username = ?').get(targetUser)
console.log(`After: hash=${after.password_hash.substring(0, 30)}...`)

db.close()
console.log('Done.')
