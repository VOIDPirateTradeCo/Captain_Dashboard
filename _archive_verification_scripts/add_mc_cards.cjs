const https = require('https');
const KEY = 'edb3c4349df2946a8114baadfc9e2ad7';
const TOKEN = 'ATTA0a7f5faaf0163f82b6bf411207e70c83f8d6ac4c526647c8fbd23e9c14b5f9f7412C8A6B';
const BOARD = '6a595669b8f8f99c93392f4f';

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const qs = `?key=${KEY}&token=${TOKEN}`;
    const req = https.request({ hostname: 'api.trello.com', path: path + qs, method,
      headers: body ? { 'Content-Type': 'application/json', 'Content-Length': JSON.stringify(body).length } : {}
    }, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d)); });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  // Find Cluster 1B cards
  const cards = await req('GET', `/1/boards/${BOARD}/cards`);
  const open = JSON.parse(cards).filter(c => !c.closed);
  
  const targets = open.filter(c => 
    c.name.toLowerCase().includes('hermes_gateway_url') ||
    c.name.toLowerCase().includes('openclaw home') ||
    c.name.toLowerCase().includes('auto-sync') ||
    c.name.toLowerCase().includes('agent auto-sync') ||
    c.name.toLowerCase().includes('openclaw state') ||
    (c.name.toLowerCase().includes('openclaw') && c.name.toLowerCase().includes('.env'))
  );
  
  console.log('Cluster 1B cards:', targets.length);
  for (const c of targets) console.log(`  - ${c.name} (${c.id})`);
})();
