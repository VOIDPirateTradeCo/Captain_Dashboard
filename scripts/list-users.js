/**
 * Quick user check — lists all users in MC DB
 */
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), '.data', 'mission-control.db');
const db = new Database(dbPath);

const users = db.prepare('SELECT id, username, role, created_at FROM users').all();
console.log(`Total users: ${users.length}`);
users.forEach(u => {
  console.log(`  #${u.id} ${u.username} (${u.role}) — created ${u.created_at}`);
});

db.close();
