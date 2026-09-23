const Database = require('better-sqlite3');
const db = new Database('.data/mission-control.db');

// Check all database tables and their sizes
const tables = db.prepare(`
  SELECT name, 
         (SELECT COUNT(*) FROM pragma_table_info(name)) as columns
  FROM sqlite_master 
  WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'memory_%'
  ORDER BY name
`).all();

console.log('Tables:');
tables.forEach(t => console.log(`  ${t.name}: ${t.columns} columns`));

// Check db file size
const fs = require('fs');
const stats = fs.statSync('.data/mission-control.db');
console.log(`\nDB size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

// Check data directory layout
const items = fs.readdirSync('.data');
console.log('\n.data directory contents:');
items.forEach(i => {
  const stat = fs.statSync(`.data/${i}`);
  console.log(`  ${i} (${stat.isDirectory() ? 'dir' : 'file'})`);
});

db.close();
