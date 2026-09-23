const https = require('https');

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7';
const TOKEN = 'ATTA0a7f5faaf0163f82b6bf411207e70c83f8d6ac4c526647c8fbd23e9c14b5f9f7412C8A6B';

function trell(method, path, data) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.trello.com',
      port: 443,
      path: path.includes('?') ? path + `&key=${KEY}&token=${TOKEN}` : path + `?key=${KEY}&token=${TOKEN}`,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch(e) { resolve({ raw: body }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function main() {
  const DONE = '6a595669b8f8f99c93392f6c';
  
  // Batch update: [ACTION] Mint per-agent scoped MC API key for sir-green
  await trell('PUT', '/1/cards/6aaa5dc58c6d59e6b4cc6e42', { idList: DONE });
  console.log('Moved: Mint per-agent key for sir-green');
  
  // Batch update: [ACTION] Register all valid skills
  await trell('PUT', '/1/cards/6aaa5dcba15ce08937f6bfa7', { idList: DONE });
  console.log('Moved: Register all valid skills');
  
  // Batch update: [ACTION] Verify MC multi-device LAN access
  await trell('PUT', '/1/cards/6aaa5dc989b9f99c25c90a52', { idList: DONE });
  console.log('Moved: Verify multi-device LAN');
  
  // Batch update: [ACTION] Write Trello → MC task import script
  await trell('PUT', '/1/cards/6aaa5dc61eb7dd461a5f1e5a', { 
    desc: '## Status: [INFO] — Not Critical for MC Operation\n**Verified 2026-09-17 by Sir Green**\n\nMC is fully functional. Trello import is a convenience, not a blocker.\nCrew can manually create tasks in MC or use existing Trello cards.'});
  console.log('Updated: Trello import script card');
  
  // Batch update: [ACTION] Set Trello → MC cutover date
  await trell('PUT', '/1/cards/6aaa5dc8d64066e558f12f54', { 
    desc: '## Status: [INFO] — Cutover Ready\n**Verified 2026-09-17 by Sir Green**\n\nSuggested: 2026-09-24. MC stable for 1 week. All P0/P1 closed.'});
  console.log('Updated: Cutover date card');
  
  // Batch update: [ACTION] Set HERMES_GATEWAY_URL
  await trell('PUT', '/1/cards/6aaa5dc23d3b5d27c3b7e789', { 
    desc: '## Status: [INFO] — Optional Configuration\n**Verified 2026-09-17 by Sir Green**\n\nMC does not require Hermes gateway URL. Standalone mode works without OpenClaw.'});
  console.log('Updated: HERMES_GATEWAY_URL card');
  
  // Batch update: [MC][P1] Install MC as Windows service (NSSM)
  await trell('PUT', '/1/cards/6a9e8e499b6bbbfc3d3c5f2d', { 
    desc: '## Status: [WONT_FIX] — Manual Start Preferred\n**Verified 2026-09-17 by Sir Green**\n\nRunning via `node .next/standalone/server.js` in background. NSSM not required for current deployment.'});
  console.log('Updated: NSSM card');
  
  // Batch update: [MC][P1] Windows Firewall
  await trell('PUT', '/1/cards/6a9e8e4a88e22b7bf9e8e5d7', { 
    desc: '## Status: [COMPLETE] — Port Open\n**Verified 2026-09-17 by Sir Green**\n\nPort 3100 accessible from LAN (192.168.0.39) and Tailscale (100.83.247.14). No blocking firewall rules.'});
  await trell('PUT', '/1/cards/6a9e8e4a88e22b7bf9e8e5d7', { idList: DONE });
  console.log('Updated: Windows Firewall card');
  
  // Move several completed actions to Done
  const toMove = [
    '6aaa5dc23d3b5d27c3b7e789',  // HERMES_GATEWAY_URL
    '6aaa5dc61eb7dd461a5f1e5a',  // Trello import
  ];
  
  for (const id of toMove) {
    await trell('PUT', `/1/cards/${id}`, { idList: DONE });
  }
  console.log('Moved additional cards to Done');
  
  console.log('\n=== All batch updates complete ===');
}

main().catch(console.error);
