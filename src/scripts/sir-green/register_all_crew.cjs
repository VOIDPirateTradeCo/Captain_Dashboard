const Database = require('better-sqlite3');
const db = new Database('./.data/mission-control.db');
try {
  const now = Math.floor(Date.now() / 1000);
  
  // Fix caps for miss-pink and sir-azure
  const fixes = [
    { id: 30, caps: ['commander', 'torus', 'coordination'], framework: 'hermes' },
    { id: 31, caps: ['code', 'review', 'art', 'gpu'], framework: 'claude' },
  ];
  
  for (const f of fixes) {
    const result = db.prepare(
      `UPDATE agents SET config = ?, updated_at = ? WHERE id = ?`
    ).run(JSON.stringify({ capabilities: f.caps, framework: f.framework }), now, f.id);
    console.log(`id=${f.id}: ${result.changes} rows updated`);
  }
  
  // Insert missing crew agents
  const missing = [
    { name: 'captain', role: 'Owner', caps: ['all'], framework: 'generic' },
    { name: 'sir-violet', role: 'agent', caps: ['research', 'intel', 'osint', 'cybersec'], framework: 'hermes' },
    { name: 'mr-blue', role: 'agent', caps: ['comms', 'phone', 'family'], framework: 'codex' },
  ];
  
  for (const m of missing) {
    const existing = db.prepare("SELECT id FROM agents WHERE name = ?").get(m.name);
    if (existing) {
      console.log(`${m.name}: already exists (id=${existing.id})`);
      continue;
    }
    
    const result = db.prepare(`
      INSERT INTO agents (name, role, status, last_seen, updated_at, created_at, config, workspace_id)
      VALUES (?, ?, 'online', ?, ?, ?, ?, 1)
    `).run(m.name, m.role, now, now, now, JSON.stringify({ capabilities: m.caps, framework: m.framework }));
    console.log(`${m.name}: inserted (id=${result.lastInsertRowid})`);
  }
  
  // Verify all crew agents
  const rows = db.prepare("SELECT id, name, status, config FROM agents WHERE name IN ('sir-green', 'sir-cobalt', 'sir-azure', 'miss-pink', 'captain', 'sir-violet', 'mr-blue')").all();
  console.log('\n=== ALL CREW AGENTS ===');
  rows.forEach(r => {
    const cfg = r.config ? JSON.parse(r.config) : {};
    console.log(`id=${r.id} ${r.name}: status=${r.status}, caps=${JSON.stringify(cfg.capabilities || []).slice(0,50)}`);
  });
} catch(e) {
  console.error('DB error:', e.message);
}
