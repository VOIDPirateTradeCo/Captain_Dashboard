const Database = require('better-sqlite3');
const db = new Database('./.data/mission-control.db');
try {
  // Final DB verification - source of truth
  const rows = db.prepare("SELECT id, name, status, last_seen, updated_at FROM agents WHERE name IN ('sir-green', 'sir-cobalt', 'sir-azure', 'miss-pink')").all();
  const now = Math.floor(Date.now() / 1000);
  console.log('=== DB SOURCE OF TRUTH ===');
  rows.forEach(r => {
    const age = now - r.last_seen;
    console.log(`id=${r.id} ${r.name}: status=${r.status}, last_seen=${r.last_seen} (${age}s ago)`);
  });
  
  // Count online
  const online = rows.filter(r => r.status === 'online').length;
  console.log(`\nOnline: ${online}/4`);
} catch(e) {
  console.error('DB error:', e.message);
}
