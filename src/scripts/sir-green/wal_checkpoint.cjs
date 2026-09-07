const Database = require('better-sqlite3');
const db = new Database('./.data/mission-control.db');
try {
  // Force WAL checkpoint
  db.pragma('wal_checkpoint(TRUNCATE)');
  console.log('WAL checkpoint done');
  
  // Re-read all crew agents
  const rows = db.prepare("SELECT id, name, status, last_seen FROM agents WHERE name IN ('sir-green', 'sir-cobalt', 'sir-azure', 'miss-pink', 'captain', 'sir-violet', 'mr-blue')").all();
  console.log('\nCrew agents after checkpoint:');
  rows.forEach(r => console.log('  id=' + r.id + ' ' + r.name + ' status=' + r.status + ' last_seen=' + r.last_seen));
} catch(e) {
  console.error('DB error:', e.message);
}
