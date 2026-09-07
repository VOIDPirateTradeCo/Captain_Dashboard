const Database = require('better-sqlite3');
const db = new Database('./.data/mission-control.db');
try {
  const now = Math.floor(Date.now() / 1000);
  
  // Update original rows instead of having duplicates
  const updates = [
    { id: 5, name: 'sir-cobalt', status: 'online', caps: ['code', 'review', 'research', 'ops'], framework: 'claude' },
    { id: 3, name: 'sir-green', status: 'online', caps: ['code', 'review', 'ops', 'dashboard'], framework: 'hermes' },
  ];
  
  for (const u of updates) {
    const result = db.prepare(
      `UPDATE agents SET status = ?, last_seen = ?, updated_at = ?, last_activity = 'Heartbeat check', config = ? WHERE id = ?`
    ).run(u.status, now, now, JSON.stringify({ capabilities: u.caps, framework: u.framework }), u.id);
    console.log(`id=${u.id} ${u.name}: ${result.changes} rows updated`);
  }
  
  // Delete duplicate new rows
  const del = db.prepare("DELETE FROM agents WHERE id IN (32, 33)").run();
  console.log(`Deleted ${del.changes} duplicate rows`);
  
  // Verify
  const rows = db.prepare("SELECT id, name, status FROM agents WHERE name IN ('sir-cobalt', 'sir-green', 'sir-azure', 'miss-pink')").all();
  console.log('\nFinal state:');
  rows.forEach(r => console.log(' ', r.id, r.name, r.status));
} catch(e) {
  console.error('DB error:', e.message);
}
