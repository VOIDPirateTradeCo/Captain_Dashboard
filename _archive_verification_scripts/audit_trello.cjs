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
  const cards = await trell('GET', '/1/boards/6a595669b8f8f99c93392f4f/cards?fields=name,id,idList,desc,labels&filter=open');
  const DONE = '6a595669b8f8f99c93392f6c';
  
  // Get lists
  const lists = await trell('GET', '/1/boards/6a595669b8f8f99c93392f4f/lists?fields=name');
  const listMap = {};
  for (const l of lists) listMap[l.id] = l.name;
  
  // Filter MC-related cards still open (not in Done)
  const mcCards = [];
  for (const c of cards) {
    const labels = (c.labels || []).map(l => l.name);
    const name = c.name.toLowerCase();
    
    // Skip done/archived
    if (labels.includes('Done') || c.idList === DONE) continue;
    
    // Skip Crownless Fortune / tr3asure
    if (name.includes('crownless') || name.includes('cf-')) continue;
    if (name.includes('tr3asure') || name.includes('treasure')) continue;
    if (labels.includes('Crownless') || labels.includes('tr3asure')) continue;
    
    // Skip non-MC projects
    if (name.includes('sir-cobalt') && !name.includes('mc') && !name.includes('mission')) continue;
    if (name.includes('cosmos') || name.includes('lore')) continue;
    if (name.includes('future ideas')) continue;
    
    const isP1 = labels.includes('P1') || labels.includes('P1 - High');
    const isP2 = labels.includes('P2') || labels.includes('P2 - Medium');
    const isP3 = labels.includes('P3') || labels.includes('P3 - Low');
    const isAction = name.includes('[action]');
    const isTask = name.includes('[tasks]');
    const isBug = labels.includes('bug') || name.includes('[bug]');
    const isMC = name.includes('mission control') || name.includes('[mc]') || 
                 name.includes('mc ') || name.includes('dashboard') || 
                 name.includes('mcp') || name.includes('agent') ||
                 name.includes('api') || name.includes('lan') || 
                 name.includes('register') || name.includes('rollout') || 
                 name.includes('import') || name.includes('cutover') ||
                 name.includes('sunset') || name.includes('skills') || 
                 name.includes('icons') || name.includes('install') || 
                 name.includes('windows') || name.includes('service') ||
                 name.includes('heartbeat') || name.includes('openclaw') ||
                 name.includes('docker') || name.includes('container') ||
                 name.includes('winrm') || name.includes('fleet') ||
                 name.includes('security') || name.includes('monitor') ||
                 name.includes('captain') || name.includes('crew');
    
    if (isMC && (isP1 || isP2 || isP3 || isAction || isTask || isBug)) {
      mcCards.push(c);
    }
  }
  
  console.log(`MC-related open cards (${mcCards.length}):`);
  for (const c of mcCards) {
    const labels = (c.labels || []).map(l => l.name);
    const listName = listMap[c.idList] || 'Unknown';
    console.log(`  ${c.id} | [${listName}] | ${labels.join(', ')} | ${c.name.substring(0, 60)}`);
  }
}
main().catch(console.error);
