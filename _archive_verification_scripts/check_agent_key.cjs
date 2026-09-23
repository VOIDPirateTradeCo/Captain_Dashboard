const Database = require('better-sqlite3');
const db = new Database('.data/mission-control.db');

// Get agents with their API keys
const agents = db.prepare(`
  SELECT a.id, a.name, a.role, a.status, 
         GROUP_CONCAT(aak.key_prefix, ', ') as keys,
         COUNT(aak.id) as key_count
  FROM agents a 
  LEFT JOIN agent_api_keys aak ON a.id = aak.agent_id
  GROUP BY a.id
`).all();

console.log('Agents with API keys:');
agents.forEach(a => {
  console.log(`  ${a.name}: ${a.key_count} keys [${a.keys}]`);
});

// Check if any keys have been used
const usedKeys = db.prepare(`
  SELECT aak.key_prefix, aak.last_used_at, a.name as agent_name
  FROM agent_api_keys aak
  JOIN agents a ON aak.agent_id = a.id
  WHERE aak.last_used_at IS NOT NULL
  ORDER BY aak.last_used_at DESC
  LIMIT 5
`).all();

console.log('\nRecently used agent keys:');
usedKeys.forEach(k => {
  console.log(`  ${k.agent_name} (${k.key_prefix}): last used ${k.last_used_at}`);
});

db.close();
