const Database = require('better-sqlite3');
const db = new Database('./.data/mission-control.db');
try {
  const now = Math.floor(Date.now() / 1000);
  
  // Insert missing agents
  const agents = [
    { name: 'sir-cobalt', role: 'agent', caps: ['code', 'review', 'research', 'ops'], framework: 'claude' },
    { name: 'sir-green', role: 'Captains AI Assistant — Sir Green', caps: ['code', 'review', 'ops', 'dashboard'], framework: 'hermes' },
  ];
  
  for (const a of agents) {
    const existing = db.prepare("SELECT id FROM agents WHERE name = ?").get(a.name);
    if (existing) {
      console.log(`${a.name}: already exists (id=${existing.id})`);
      continue;
    }
    
    const result = db.prepare(`
      INSERT INTO agents (name, role, status, last_seen, updated_at, created_at, config, workspace_id)
      VALUES (?, ?, 'online', ?, ?, ?, ?, 1)
    `).run(a.name, a.role, now, now, now, JSON.stringify({ capabilities: a.caps, framework: a.framework }));
    console.log(`${a.name}: inserted (id=${result.lastInsertRowid})`);
  }
  
  // Verify
  const rows = db.prepare("SELECT id, name, status FROM agents WHERE name IN ('sir-cobalt', 'sir-green', 'sir-azure', 'miss-pink')").all();
  console.log('\nVerified:');
  rows.forEach(r => console.log(' ', r.id, r.name, r.status));
} catch(e) {
  console.error('DB error:', e.message);
}
