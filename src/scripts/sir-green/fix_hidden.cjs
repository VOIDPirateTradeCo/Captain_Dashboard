const Database = require('better-sqlite3');
const db = new Database('./.data/mission-control.db');
try {
  // Fix hidden flag for all crew agents
  const result = db.prepare(
    `UPDATE agents SET hidden = 0 WHERE name IN ('sir-green', 'sir-cobalt', 'sir-azure', 'miss-pink', 'captain', 'sir-violet', 'mr-blue') AND (hidden IS NULL OR hidden != 0)`
  ).run();
  console.log(`Fixed hidden flag: ${result.changes} rows`);
  
  // Verify API will show them
  const rows = db.prepare("SELECT id, name, status, hidden FROM agents WHERE workspace_id = 1 AND hidden = 0 AND name IN ('sir-green', 'sir-cobalt', 'sir-azure', 'miss-pink', 'captain', 'sir-violet', 'mr-blue')").all();
  console.log('\nAgents visible in API:');
  rows.forEach(r => console.log(`  id=${r.id} ${r.name} status=${r.status} hidden=${r.hidden}`));
} catch(e) {
  console.error('DB error:', e.message);
}
