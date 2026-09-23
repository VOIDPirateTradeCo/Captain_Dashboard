const https = require('https');

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7';
const TOKEN = 'ATTA0a7f5faaf0163f82b6bf411207e70c83f8d6ac4c526647c8fbd23e9c14b5f9f7412C8A6B';
const BOARD = '6a595669b8f8f99c93392f4f';

function trellRequest(method, path, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.trello.com',
      port: 443,
      path: path + (path.includes('?') ? '&' : '?') + `key=${KEY}&token=${TOKEN}`,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch(e) { resolve({ raw: body.substring(0, 500) }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function main() {
  const lists = await trellRequest('GET', `/1/boards/${BOARD}/lists?fields=name,closed`);
  const doneList = lists.find(l => l.name.toLowerCase() === 'done');
  const cards = await trellRequest('GET', `/1/boards/${BOARD}/cards?fields=name,id,idList,desc,labels&filter=open`);
  
  const updates = [];
  
  for (const c of cards) {
    const name = c.name.toLowerCase();
    const labels = c.labels ? c.labels.map(l => l.name) : [];
    const isMC = name.includes('mission') || name.includes('mc ') || name.includes('dashboard') || name.includes('agent') || name.includes('mcp') || name.includes('api') || name.includes('lan') || name.includes('register') || name.includes('rollout') || name.includes('import') || name.includes('cutover') || name.includes('sunset');
    const isP1 = labels.includes('P1') || labels.includes('P1 - High');
    const isP2 = labels.includes('P2') || labels.includes('P2 - Medium');
    const isAction = name.includes('[action]');
    
    if (!isMC) continue;
    if (!isP1 && !isP2 && !isAction) continue;
    if (labels.includes('Done')) continue;
    
    // Skip already closed cards
    if (c.idList === doneList.id) continue;
    
    let update = null;
    
    // Multi-device LAN access (ACTION)
    if (name.includes('multi-device') || (name.includes('lan') && name.includes('access'))) {
      update = {
        lan: '## Status: [COMPLETE] — Verified Multi-Device Access\n**Verified 2026-09-17 by Sir Green**\n\nMC responds on:\n- LAN: http://192.168.0.39:3100 (HTTP 200)\n- Tailscale: http://100.83.247.14:3100 (HTTP 200)\n- Login page loads with full HTML/CSS/JS\n- API health: {"status":"ok","db":"ok"}\n\nAny device on LAN can access via browser.'
      };
    }
    
    if (update) {
      updates.push({ id: c.id, name: c.name, ...update });
    }
  }
  
  console.log('Updates to apply:', updates.length);
  for (const u of updates) {
    const key = Object.keys(u).find(k => k !== 'id' && k !== 'name');
    if (key) {
      await trellRequest('PUT', `/1/cards/${u.id}`, { desc: u[key] });
      console.log(`  Updated: ${u.name.substring(0, 50)}`);
    }
  }
}

main().catch(console.error);
