const Database = require('better-sqlite3');
const db = new Database('./.data/mission-control.db');
try {
  // Delete duplicates (wrong case)
  const dupes = db.prepare("SELECT id, name FROM agents WHERE id IN (10, 11)").all();
  console.log('Deleting duplicates:');
  dupes.forEach(r => console.log(' ', r.id, r.name));
  
  const result = db.prepare("DELETE FROM agents WHERE id IN (10, 11)").run();
  console.log('Deleted:', result.changes, 'rows');
  
  // Verify final state
  const rows = db.prepare("SELECT id, name, status FROM agents ORDER BY id").all();
  console.log('\nFinal agents:');
  rows.forEach(r => console.log(' ', r.id, r.name, r.status));
} catch(e) {
  console.error('DB error:', e.message);
}
