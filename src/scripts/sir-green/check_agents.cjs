const Database = require('better-sqlite3');
const db = new Database('./.data/mission-control.db');
try {
  const rows = db.prepare("SELECT id, name, status, last_seen FROM agents WHERE name LIKE '%stealth%' OR name LIKE '%attack%' OR name LIKE '%azure%' OR name LIKE '%pink%'").all();
  console.log('Matching agents:');
  rows.forEach(r => console.log(' ', r.id, r.name, r.status, new Date(r.last_seen * 1000).toISOString()));
} catch(e) {
  console.error('DB error:', e.message);
}
