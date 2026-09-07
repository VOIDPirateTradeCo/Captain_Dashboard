const Database = require('better-sqlite3');
const db = new Database('./.data/mission-control.db');
try {
  const now = Math.floor(Date.now() / 1000);
  
  // Update existing agents to online
  const agents = [
    { name: 'sir-azure', caps: ['code', 'review', 'art', 'gpu'], host: 'STEALTHATTACK' },
    { name: 'miss-pink', caps: ['commander', 'torus', 'coordination'], host: 'PINKCADY' },
  ];
  
  for (const a of agents) {
    const result = db.prepare(
      `UPDATE agents SET status = 'online', last_seen = ?, updated_at = ?, last_activity = 'Heartbeat check' WHERE name = ?`
    ).run(now, now, a.name);
    console.log(`${a.name}: ${result.changes} rows updated`);
  }
  
  // Verify
  const rows = db.prepare("SELECT id, name, status, last_seen FROM agents WHERE name IN ('sir-azure', 'miss-pink')").all();
  console.log('\nUpdated agents:');
  rows.forEach(r => console.log(' ', r.id, r.name, r.status, new Date(r.last_seen * 1000).toISOString()));
} catch(e) {
  console.error('DB error:', e.message);
}
