const Database = require('better-sqlite3');
const db = new Database('./.data/mission-control.db');
try {
  // Check last_seen for all crew agents
  const rows = db.prepare("SELECT id, name, status, last_seen, updated_at FROM agents WHERE name IN ('sir-green', 'sir-cobalt', 'sir-azure', 'miss-pink')").all();
  const now = Math.floor(Date.now() / 1000);
  console.log('Current time:', now);
  console.log('\nCrew agents:');
  rows.forEach(r => {
    const age = now - r.last_seen;
    console.log(`  ${r.name}: status=${r.status}, last_seen=${r.last_seen} (${age}s ago)`);
  });
} catch(e) {
  console.error('DB error:', e.message);
}
