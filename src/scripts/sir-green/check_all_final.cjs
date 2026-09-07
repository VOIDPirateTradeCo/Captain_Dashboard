const Database = require('better-sqlite3');
const db = new Database('./.data/mission-control.db');
try {
  const rows = db.prepare("SELECT id, name, status FROM agents ORDER BY id").all();
  console.log('All agents:');
  rows.forEach(r => console.log(' ', r.id, r.name, r.status));
} catch(e) {
  console.error('DB error:', e.message);
}
