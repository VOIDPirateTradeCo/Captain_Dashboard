const Database = require('better-sqlite3');
const db = new Database('./.data/mission-control.db');
try {
  // Check agent_api_keys table
  const rows = db.prepare("SELECT * FROM agent_api_keys").all();
  console.log('Agent API keys:', rows.length);
  rows.forEach(r => console.log(' ', r.id, r.name, r.key_hash ? r.key_hash.slice(0,20) + '...' : 'no hash'));
} catch(e) {
  console.error('DB error:', e.message);
}
