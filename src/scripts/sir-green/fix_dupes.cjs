const Database = require('better-sqlite3');
const db = new Database('./.data/mission-control.db');
try {
  // Find all duplicate agent names
  const rows = db.prepare("SELECT name, COUNT(*) as cnt FROM agents GROUP BY name HAVING cnt > 1").all();
  console.log('Duplicate agent names:');
  rows.forEach(r => console.log(`  ${r.name}: ${r.cnt} rows`));
  
  // For each duplicate, keep the one with the highest last_seen
  for (const r of rows) {
    const dupes = db.prepare("SELECT id, name, status, last_seen FROM agents WHERE name = ? ORDER BY last_seen DESC").all(r.name);
    console.log(`\n  ${r.name}:`);
    dupes.forEach(d => console.log(`    id=${d.id} status=${d.status} last_seen=${d.last_seen}`));
    
    // Keep the first one (highest last_seen), delete the rest
    const keep = dupes[0];
    const deleteIds = dupes.slice(1).map(d => d.id);
    console.log(`  Keeping id=${keep.id}, deleting: ${deleteIds.join(', ')}`);
    
    for (const id of deleteIds) {
      db.prepare("DELETE FROM agents WHERE id = ?").run(id);
    }
  }
  
  // Verify
  const final = db.prepare("SELECT id, name, status, last_seen FROM agents WHERE name IN ('sir-green', 'sir-cobalt', 'sir-azure', 'miss-pink', 'captain', 'sir-violet', 'mr-blue')").all();
  console.log('\n=== FINAL CREW AGENTS ===');
  final.forEach(r => console.log(`id=${r.id} ${r.name} status=${r.status} last_seen=${r.last_seen}`));
} catch(e) {
  console.error('DB error:', e.message);
}
