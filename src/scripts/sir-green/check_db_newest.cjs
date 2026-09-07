const Database = require('better-sqlite3');
const db = new Database('./.data/mission-control.db');
try {
  // Check all agents with created_at
  const rows = db.prepare("SELECT id, name, status, created_at FROM agents ORDER BY created_at DESC").all();
  console.log('All agents (newest first):');
  rows.forEach(r => console.log(' ', r.id, r.name, r.status, new Date(r.created_at * 1000).toISOString()));
} catch(e) {
  console.error('DB error:', e.message);
}
