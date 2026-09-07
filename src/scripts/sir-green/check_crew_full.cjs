const Database = require('better-sqlite3');
const db = new Database('./.data/mission-control.db');
try {
  // Check all crew agents with all fields
  const rows = db.prepare("SELECT id, name, status, hidden, workspace_id, last_seen FROM agents WHERE name IN ('sir-green', 'sir-cobalt', 'sir-azure', 'miss-pink', 'captain', 'sir-violet', 'mr-blue')").all();
  console.log('Crew agents:');
  rows.forEach(r => {
    console.log('  id=' + r.id + ' ' + r.name + ' status=' + r.status + ' hidden=' + r.hidden + ' ws=' + r.workspace_id + ' last_seen=' + r.last_seen);
  });
  console.log('\nTotal crew: ' + rows.length);
  
  // Count by status
  const online = rows.filter(r => r.status === 'online').length;
  console.log('Online: ' + online);
} catch(e) {
  console.error('DB error:', e.message);
}
