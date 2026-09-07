const Database = require('better-sqlite3');
const db = new Database('./.data/mission-control.db');
try {
  // Full verification
  console.log('=== DB SOURCE OF TRUTH ===');
  const rows = db.prepare("SELECT id, name, status, last_seen, hidden, workspace_id FROM agents WHERE name IN ('sir-green', 'sir-cobalt', 'sir-azure', 'miss-pink', 'captain', 'sir-violet', 'mr-blue')").all();
  const now = Math.floor(Date.now() / 1000);
  rows.forEach(r => {
    const age = now - r.last_seen;
    console.log(`id=${r.id} ${r.name}: status=${r.status}, last_seen=${r.last_seen} (${age}s ago), hidden=${r.hidden}, ws=${r.workspace_id}`);
  });
  console.log('\nTotal crew: ' + rows.length);
  console.log('Online: ' + rows.filter(r => r.status === 'online').length);
} catch(e) {
  console.error('DB error:', e.message);
}
