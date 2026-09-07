const Database = require('better-sqlite3');
const db = new Database('./data/mission-control.db');
try {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'security.api_key_hash'").get();
  console.log('API key hash:', row ? row.value.slice(0,20) + '...' : 'not found');
  const row2 = db.prepare("SELECT value FROM settings WHERE key = 'security.api_key'").get();
  console.log('API key (legacy):', row2 ? row2.value.slice(0,20) + '...' : 'not found');
} catch(e) {
  console.error('DB error:', e.message);
}
