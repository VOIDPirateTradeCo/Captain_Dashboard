const Database = require('better-sqlite3');
const db = new Database('.data/mission-control.db');

const settings = db.prepare("SELECT key, value FROM settings WHERE key LIKE '%api_key%' OR key LIKE '%auth%' OR key LIKE '%secret%'").all();
console.log('Auth/API settings:');
settings.forEach(s => {
  const val = s.value ? s.value.substring(0, 30) + '...' : 'null';
  console.log(`  ${s.key}: ${val}`);
});

db.close();
