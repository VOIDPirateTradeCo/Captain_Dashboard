const Database = require('better-sqlite3');
const db = new Database('.data/mission-control.db');

// Get global api_keys
const apiKeys = db.prepare('SELECT * FROM api_keys ORDER BY id DESC LIMIT 5').all();
console.log('Global api_keys (most recent 5):');
apiKeys.forEach(k => {
  console.log(`  ID ${k.id}: key=${k.key_prefix || k.key?.substring(0,16)}, global=${k.global}, created=${k.created_at}, scope=${k.scope}`);
});

// Check agent_api_keys table schema
const schema = db.pragma('table_info(agent_api_keys)');
console.log('\nagent_api_keys columns:');
schema.forEach(c => console.log(`  ${c.name} (${c.type})`));

// Check scopes for all keys
const scopes = db.prepare('SELECT scopes, COUNT(*) as cnt FROM agent_api_keys GROUP BY scopes').all();
console.log('\nKey scopes distribution:');
scopes.forEach(s => {
  console.log(`  scopes="${s.scopes}": ${s.cnt} keys`);
});

// Check if agent keys have any scope restrictions
const allAgentKeys = db.prepare('SELECT id, agent_id, scopes, revoked_at FROM agent_api_keys LIMIT 5').all();
console.log('\nSample agent keys:');
allAgentKeys.forEach(k => {
  console.log(`  ID ${k.id}, agent ${k.agent_id}: scopes="${k.scopes}", revoked=${k.revoked_at}`);
});

db.close();
