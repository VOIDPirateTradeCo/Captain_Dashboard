const Database = require('better-sqlite3');
const db = new Database('./.data/mission-control.db');
try {
  // Check all settings
  const rows = db.prepare("SELECT key, value FROM settings").all();
  console.log('Settings:');
  rows.forEach(r => console.log(' ', r.key, '=', r.value ? r.value.slice(0,30) : 'null'));
} catch(e) {
  console.error('DB error:', e.message);
}
