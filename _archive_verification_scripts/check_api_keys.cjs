const Database = require('better-sqlite3');
const db = new Database('.data/mission-control.db');

// Check all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
console.log('Tables:');
tables.forEach(t => console.log('  ' + t.name));

// Check agent_api_keys table
const aakColumns = db.pragma('table_info(agent_api_keys)');
if (aakColumns.length > 0) {
  console.log('\nagent_api_keys columns:');
  aakColumns.forEach(c => console.log(`  ${c.name} (${c.type})`));
  
  const aakCount = db.prepare('SELECT COUNT(*) as count FROM agent_api_keys').get();
  console.log(`Total agent_api_keys: ${aakCount.count}`);
  
  const aak = db.prepare('SELECT * FROM agent_api_keys').all();
  aak.forEach(k => console.log(`  Agent ${k.agent_id}: prefix=${k.key_prefix}, created=${k.created_at}`));
}

// Check settings table
const settingsColumns = db.pragma('table_info(settings)');
if (settingsColumns.length > 0) {
  console.log('\nsettings columns:');
  settingsColumns.forEach(c => console.log(`  ${c.name} (${c.type})`));
  
  const apiKeySetting = db.prepare("SELECT * FROM settings WHERE key LIKE '%api_key%'").all();
  console.log('\nAPI key settings:');
  apiKeySetting.forEach(s => console.log(`  ${s.key}: ${s.value ? s.value.substring(0, 30) + '...' : 'null'}`));
}

db.close();
