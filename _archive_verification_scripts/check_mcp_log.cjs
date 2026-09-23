const Database = require('better-sqlite3');
const db = new Database('.data/mission-control.db');

// Check MCP call log
const count = db.prepare('SELECT COUNT(*) as count FROM mcp_call_log').get();
console.log('MCP call log entries: ' + count.count);

const recent = db.prepare('SELECT * FROM mcp_call_log ORDER BY created_at DESC LIMIT 5').all();
recent.forEach(r => {
  console.log(`  ${r.created_at}: ${r.tool_name} - ${r.status}`);
});

// Check skills table
const skillsCount = db.prepare('SELECT COUNT(*) as count FROM skills').get();
console.log('\nSkills registered: ' + skillsCount.count);

const skills = db.prepare('SELECT name, category FROM skills ORDER BY name LIMIT 10').all();
skills.forEach(s => console.log(`  ${s.name} (${s.category})`));

db.close();
