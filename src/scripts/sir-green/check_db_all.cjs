const Database = require('better-sqlite3');
const db = new Database('./.data/mission-control.db');
try {
  const rows = db.prepare("SELECT id, name, status, last_seen FROM agents ORDER BY name").all();
  console.log('All agents in DB:');
  rows.forEach(r => {
    const name = r.name.padEnd(20);
    const status = r.status.padEnd(8);
    console.log('  id=' + r.id + ' ' + name + ' status=' + status + ' last_seen=' + r.last_seen);
  });
  console.log('\nTotal: ' + rows.length);
} catch(e) {
  console.error('DB error:', e.message);
}
