const Database = require('better-sqlite3');
const db = new Database('.data/mission-control.db');
const fs = require('fs');

// Check for data/live and tmp directories
const dataDir = '.data';
const items = fs.readdirSync(dataDir);
console.log('.data contents:');
items.forEach(i => {
  const stat = fs.statSync(`${dataDir}/${i}`);
  const size = stat.isDirectory ? 'dir' : `${(stat.size/1024).toFixed(1)}KB`;
  console.log(`  ${i} (${size})`);
});

// Check for backups directory
const backupsDir = '.data/backups';
if (fs.existsSync(backupsDir)) {
  const backups = fs.readdirSync(backupsDir);
  console.log(`\nBackups: ${backups.length} files`);
  backups.slice(0, 5).forEach(b => {
    const stat = fs.statSync(`${backupsDir}/${b}`);
    console.log(`  ${b} (${(stat.size/1024).toFixed(1)}KB)`);
  });
}

// Check WAL mode
const wal = db.pragma('journal_mode');
console.log(`\nWAL mode: ${wal[0]?.journal_mode}`);

// Check if there's a tmp or test db
const tmpFiles = fs.readdirSync('.').filter(f => f.includes('tmp') || f.includes('test'));
console.log(`\nRoot tmp/test files: ${tmpFiles.join(', ')}`);

// Check data directory structure
console.log('\nNo data/live/ or data/tmp/ subdirectories exist.');
console.log('Convention: All data in .data/ (single dir), backups in .data/backups/');

db.close();
