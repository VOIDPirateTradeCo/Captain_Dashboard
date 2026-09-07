const Database = require('better-sqlite3');
const db = new Database('./.data/mission-control.db');
try {
  // Full audit of all agents
  const rows = db.prepare("SELECT id, name, status, last_seen, created_at, config FROM agents ORDER BY id").all();
  console.log('=== FULL AGENT AUDIT ===');
  rows.forEach(r => {
    const cfg = r.config ? JSON.parse(r.config) : {};
    console.log(`id=${r.id} name="${r.name}" status=${r.status} last_seen=${r.last_seen} cfg=${JSON.stringify(cfg).slice(0,60)}`);
  });
  console.log(`\nTotal: ${rows.length} agents`);
} catch(e) {
  console.error('DB error:', e.message);
}
