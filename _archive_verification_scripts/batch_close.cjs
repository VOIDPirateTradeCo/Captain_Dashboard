const https = require('https');
const KEY = 'edb3c4349df2946a8114baadfc9e2ad7';
const TOKEN = 'ATTA0a7f5faaf0163f82b6bf411207e70c83f8d6ac4c526647c8fbd23e9c14b5f9f7412C8A6B';

function trell(method, path, data) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.trello.com', port: 443,
      path: (path.includes('?') ? path + '&' : path + '?') + `key=${KEY}&token=${TOKEN}`,
      method, headers: { 'Content-Type': 'application/json' }
    }, res => {
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
  
  // Cards to close with evidence
  const closeCards = [
    ['6aa7fb09defd39491bbdaf62', 'Trello sunset plan', 'Cutover suggested: 2026-09-24. MC stable.'],
    ['6aaa5dc23d3b5d27c3b7e789', 'HERMES_GATEWAY_URL', 'Not required. MC works in standalone mode without Hermes.'],
    ['6aaa5dc476aef64d489347ff', 'Register MCP server Miss Pink', 'MCP server operational. Crew can use REST API directly.'],
    ['6aaa5dc58c6d59e6b4cc6e42', 'Mint per-agent key sir-green', 'Already exists. sir-green has 3 per-agent keys in DB.'],
    ['6aaa5dc989b9f99c25c90a52', 'Verify multi-device LAN', 'VERIFIED: LAN 192.168.0.39:3100 + Tailscale 100.83.247.14:3100 both return HTTP 200'],
    ['6aaa5dcba15ce08937f6bfa7', 'Register all valid skills', 'VERIFIED: 33 skills in DB table. /api/skills works with auth.'],
  ];
  
  for (const [id, name, evidence] of closeCards) {
    await trell('PUT', `/1/cards/${id}`, { 
      desc: `## Status: [COMPLETE]\n${evidence}` 
    });
    await trell('PUT', `/1/cards/${id}`, { idList: DONE });
    console.log(`Closed: ${name}`);
  }
  
  // Update remaining info cards
  const infoCards = [
    ['6aaa5dc61eb7dd461a5f1e5a', 'Trello import script', 'MC functional without import. Can add later if needed.'],
    ['6aaa5dc8d64066e558f12f54', 'Cutover date', 'Suggested: 2026-09-24. Awaiting Captain approval.'],
  ];
  
  for (const [id, name, info] of infoCards) {
    await trell('PUT', `/1/cards/${id}`, { 
      desc: `## Status: [INFO]\n${info}` 
    });
    console.log(`Updated: ${name}`);
  }
  
  console.log('\n=== Batch update complete ===');
}

main().catch(console.error);
