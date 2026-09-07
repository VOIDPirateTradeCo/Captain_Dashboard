const Database = require('better-sqlite3');
const db = new Database('./.data/mission-control.db');
try {
  // Final verification of all crew agents
  const rows = db.prepare("SELECT id, name, status, last_seen, config FROM agents WHERE name IN ('sir-green', 'sir-cobalt', 'sir-azure', 'miss-pink')").all();
  const now = Math.floor(Date.now() / 1000);
  console.log('=== FINAL VERIFICATION ===');
  rows.forEach(r => {
    const cfg = r.config ? JSON.parse(r.config) : {};
    const age = now - r.last_seen;
    console.log(`${r.name}: status=${r.status}, last_seen=${r.last_seen} (${age}s ago), cfg=${JSON.stringify(cfg).slice(0,50)}`);
  });
  
  // Check if any are offline
  const offline = rows.filter(r => r.status !== 'online');
  if (offline.length === 0) {
    console.log('\n✅ ALL 4 CREW AGENTS ONLINE');
  } else {
    console.log('\n❌ Offline agents:');
    offline.forEach(r => console.log(`  ${r.name}: ${r.status}`));
  }
} catch(e) {
  console.error('DB error:', e.message);
}
