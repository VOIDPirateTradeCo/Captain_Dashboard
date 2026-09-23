const https = require('https');

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7';
const TOKEN = 'ATTA0a7f5faaf0163f82b6bf411207e70c83f8d6ac4c526647c8fbd23e9c14b5f9f7412C8A6B';
const BOARD = '6a595669b8f8f99c93392f4f';

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
  // Get all open cards
  const cards = await trell('GET', `/1/boards/${BOARD}/cards?fields=name,id,idList,desc,labels&filter=open`);
  
  // Filter MC-related P1/P2 cards
  const mcCards = [];
  for (const c of cards) {
    const name = c.name.toLowerCase();
    const labels = (c.labels || []).map(l => l.name);
    
    // Skip Crownless Fortune / tr3asure
    if (name.includes('crownless') || name.includes('cf-')) continue;
    if (name.includes('tr3asure') || name.includes('treasure')) continue;
    if (labels.includes('Crownless')) continue;
    if (labels.includes('tr3asure')) continue;
    
    // Must be MC-related
    const isMC = name.includes('mission') || name.includes('[mc]') || name.includes('mc ') || 
                 name.includes('dashboard') || name.includes('mcp') || name.includes('agent') ||
                 name.includes('api key') || name.includes('lan') || name.includes('register') ||
                 name.includes('rollout') || name.includes('import') || name.includes('cutover') ||
                 name.includes('sunset') || name.includes('skills') || name.includes('install') ||
                 name.includes('heartbeat') || name.includes('nssm') || name.includes('windows') ||
                 name.includes('firewall') || name.includes('windows service');
    
    const isP1 = labels.includes('P1') || labels.includes('P1 - High');
    const isP2 = labels.includes('P2') || labels.includes('P2 - Medium');
    const isAction = name.includes('[action]');
    const isTask = name.includes('[tasks]');
    const isDone = labels.includes('Done');
    
    if (isMC && (isP1 || isP2 || isAction || isTask) && !isDone) {
      mcCards.push({ id: c.id, name: c.name, labels });
    }
  }
  
  console.log(`MC P1/P2/Action cards remaining (${mcCards.length}):`);
  for (const c of mcCards) {
    console.log(`  [${c.labels.join(', ')}] ${c.name.substring(0, 60)}`);
  }
}

main().catch(console.error);
