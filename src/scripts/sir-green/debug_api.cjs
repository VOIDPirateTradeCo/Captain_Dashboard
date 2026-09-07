const Database = require('better-sqlite3');
const db = new Database('./.data/mission-control.db');
try {
  // Check the API/agents/route.ts GET logic
  // The API queries agents from DB with hidden=0 and workspace_id=1
  // The crew agents are in DB with correct status, so the issue is likely caching
  
  // Let me check if the API is reading from a different DB connection
  const rows = db.prepare("SELECT id, name, status, last_seen, hidden, workspace_id FROM agents WHERE name = 'sir-green'").all();
  console.log('sir-green rows:');
  rows.forEach(r => console.log('  id=' + r.id + ' status=' + r.status + ' hidden=' + r.hidden + ' ws=' + r.workspace_id + ' last_seen=' + r.last_seen));
} catch(e) {
  console.error('DB error:', e.message);
}
