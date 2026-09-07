const Database = require('better-sqlite3');
const db = new Database('./.data/mission-control.db');
try {
  const now = Math.floor(Date.now() / 1000);
  
  // Fix ship attribution for all crew agents
  const fixes = [
    { id: 3, ship: 'SQUIDSTATION' },  // sir-green
    { id: 5, ship: 'SQUIDSTATION' },  // sir-cobalt
    { id: 31, ship: 'STEALTHATTACK' }, // sir-azure
    { id: 30, ship: 'PINKCADY' },      // miss-pink
    { id: 34, ship: 'SQUIDSTATION' },  // captain
    { id: 35, ship: 'SQUIDSTATION' },  // sir-violet
    { id: 36, ship: 'SQUIDSTATION' },  // mr-blue
  ];
  
  for (const f of fixes) {
    const existing = db.prepare("SELECT config FROM agents WHERE id = ?").get(f.id);
    if (existing) {
      const cfg = existing.config ? JSON.parse(existing.config) : {};
      cfg.ship = f.ship;
      const result = db.prepare("UPDATE agents SET config = ?, updated_at = ? WHERE id = ?")
        .run(JSON.stringify(cfg), now, f.id);
      console.log(`id=${f.id} ship=${f.ship}: ${result.changes} rows`);
    }
  }
  
  // Verify
  const rows = db.prepare("SELECT id, name, config FROM agents WHERE name IN ('sir-green', 'sir-cobalt', 'sir-azure', 'miss-pink', 'captain', 'sir-violet', 'mr-blue')").all();
  console.log('\nFinal ship attribution:');
  rows.forEach(r => {
    const cfg = r.config ? JSON.parse(r.config) : {};
    console.log(`  ${r.name}: ship=${cfg.ship}`);
  });
} catch(e) {
  console.error('DB error:', e.message);
}
