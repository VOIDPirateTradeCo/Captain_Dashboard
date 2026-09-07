const Database = require('better-sqlite3');
const db = new Database('./.data/mission-control.db');
try {
  const now = Math.floor(Date.now() / 1000);
  
  // Fix the names back to sir-green and sir-cobalt
  const fixes = [
    { id: 3, correctName: 'sir-green', role: 'Captains AI Assistant — Sir Green' },
    { id: 5, correctName: 'sir-cobalt', role: 'agent' },
  ];
  
  for (const f of fixes) {
    const result = db.prepare("UPDATE agents SET name = ?, role = ?, updated_at = ? WHERE id = ?")
      .run(f.correctName, f.role, now, f.id);
    console.log(`id=${f.id}: renamed to "${f.correctName}" (${result.changes} rows)`);
  }
  
  // Verify
  const rows = db.prepare("SELECT id, name, status, last_seen FROM agents WHERE id IN (3, 5, 30, 31)").all();
  console.log('\n=== VERIFICATION ===');
  rows.forEach(r => console.log(`id=${r.id} name="${r.name}" status=${r.status} last_seen=${r.last_seen}`));
} catch(e) {
  console.error('DB error:', e.message);
}
