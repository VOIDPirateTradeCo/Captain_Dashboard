const Database = require('better-sqlite3');
const db = new Database('.data/mission-control.db');

const columns = db.pragma('table_info(agents)');
console.log('Agents table columns:');
columns.forEach(c => console.log(`  ${c.name} (${c.type})`));

const count = db.prepare('SELECT COUNT(*) as count FROM agents').get();
console.log('\nTotal agents: ' + count.count);

if (count.count > 0) {
  const agents = db.prepare('SELECT id, name, role, status FROM agents').all();
  agents.forEach(a => console.log(`  ${a.id}: ${a.name} (${a.role}) - ${a.status}`));
}
db.close();
