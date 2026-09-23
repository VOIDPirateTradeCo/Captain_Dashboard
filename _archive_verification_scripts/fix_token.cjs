const Database = require('better-sqlite3');
const db = new Database('.data/mission-control.db');

// Get current gateway token
const gw = db.prepare('SELECT * FROM gateways WHERE id = 1').get();
console.log('MC DB token:', gw.token ? gw.token.substring(0,16) + '...' : 'NULL');
console.log('MC DB host:', gw.host, 'port:', gw.port);

// Update token to match openclaw.json
const result = db.prepare('UPDATE gateways SET token = ?, updated_at = ? WHERE id = 1').run('c034e47bf135a7e4c40a05c1b518f7f9b2c397d14b170fb7', Math.floor(Date.now()/1000));
console.log('Updated', result.changes, 'gateway tokens');
