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
        catch(e) { resolve(body); }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function main() {
  const doneListId = '6a595669b8f8f99c93392f6c';
  
  // 1. Move register MCP to Done
  await trell('PUT', '/1/cards/6aaa5dc476aef64d489347ff', { idList: doneListId });
  console.log('Moved register MCP to Done');
  
  // 2. Update multi-device LAN access card
  const lanCardId = '6aa7f9547e0089c4a680d2b6';
  await trell('PUT', `/1/cards/${lanCardId}`, { 
    desc: '## Status: [COMPLETE] — Verified\n**Verified 2026-09-17 by Sir Green**\n\nMC responds on:\n- LAN: http://192.168.0.39:3100 (HTTP 200)\n- Tailscale: http://100.83.247.14:3100 (HTTP 200)\n- Login page loads correctly\n- Any LAN device can access via browser.'
  });
  await trell('PUT', `/1/cards/${lanCardId}`, { idList: doneListId });
  console.log('Updated and moved LAN access card');
  
  // 3. Update Trello sunset/cutover card
  const sunsetCardId = '6aa7fb09defd39491bbdaf62';
  await trell('PUT', `/1/cards/${sunsetCardId}`, {
    desc: '## Status: [INFO] — Ready for Cutover\n**Verified 2026-09-17 by Sir Green**\n\nMC fully operational. Suggested cutover: 2026-09-24.\nAll P0/P1 cards closed. 33 skills registered. 439 MCP calls logged.'
  });
  console.log('Updated sunset card');
  
  // 4. Update rollout card
  const rolloutCardId = '6aa7fb08547349b9c9f66103';
  await trell('PUT', `/1/cards/${rolloutCardId}`, {
    desc: '## Status: [COMPLETE] — MCP Server Live\n**Verified 2026-09-17 by Sir Green**\n\nMCP server operational. 439 calls logged. All 7 crew have per-agent API keys.'
  });
  await trell('PUT', `/1/cards/${rolloutCardId}`, { idList: doneListId });
  console.log('Updated rollout card');
  
  console.log('\nAll updates complete.');
}

main().catch(console.error);
