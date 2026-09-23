const Database = require('better-sqlite3');
const crypto = require('crypto');
const fs = require('fs');

const db = new Database('.data/mission-control.db');

// Generate new key
const newKey = crypto.randomBytes(32).toString('hex');
console.log('New API key: ' + newKey);

// Hash it
const newHash = crypto.createHash('sha256').update(newKey).digest('hex');
console.log('New hash: ' + newHash);

// Update settings table
db.prepare("UPDATE settings SET value = ?, updated_at = ? WHERE key = 'security.api_key_hash'").run(newHash, Math.floor(Date.now()/1000));
console.log('Updated settings table');

// Verify
const verify = db.prepare("SELECT value FROM settings WHERE key = 'security.api_key_hash'").get();
console.log('Verified hash: ' + verify.value);

// Update .env file
let envContent = fs.readFileSync('.env', 'utf-8');
const oldKeyMatch = envContent.match(/API_KEY=([^\n]+)/);
if (oldKeyMatch) {
  console.log('Old key in .env: ' + oldKeyMatch[1].substring(0, 20) + '...');
  envContent = envContent.replace(/API_KEY=[^\n]+/, 'API_KEY=' + newKey);
  fs.writeFileSync('.env', envContent);
  console.log('Updated .env');
} else {
  console.log('No API_KEY found in .env');
}

// Also update POS_API_KEY if it's the same
let envContent2 = fs.readFileSync('.env', 'utf-8');
const posKeyMatch = envContent2.match(/POS_API_KEY=([^\n]+)/);
if (posKeyMatch && posKeyMatch[1].trim() === oldKeyMatch[1].trim()) {
  envContent2 = envContent2.replace(/POS_API_KEY=[^\n]+/, 'POS_API_KEY=' + newKey);
  fs.writeFileSync('.env', envContent2);
  console.log('Updated POS_API_KEY (was same as API_KEY)');
}

db.close();
console.log('\nDone. New key: ' + newKey);
