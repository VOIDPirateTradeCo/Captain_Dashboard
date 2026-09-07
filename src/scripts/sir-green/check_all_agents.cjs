const Database = require('better-sqlite3');
const db = new Database('./.data/mission-control.db');
try {
  const rows = db.prepare("SELECT id, name, status, last_seen, config FROM agents ORDER BY id").all();
  console.log('All agents:');
  rows.forEach(r => {
    const cfg = r.config ? JSON.parse(r.config) : {};
    console.log(`id=${r.id} name="${r.name}" status=${r.status} caps=${JSON.stringify(cfg.capabilities || []).slice(0,40)}`);
  });
  console.log(`\nTotal: ${rows.length}`);
} catch(e) {
  console.error('DB error:', e.message);
}
