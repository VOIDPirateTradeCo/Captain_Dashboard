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
  
  // Filter MC-related P1/P2 cards
  const mcCards = cards.filter(c => {
    const labels = (c.labels || []).map(l => l.name);
    const name = c.name.toLowerCase();
    if (name.includes('crownless') || name.includes('cf-')) return false;
    if (labels.includes('Crownless') || labels.includes('tr3asure')) return false;
    const isP1 = labels.includes('P1') || labels.includes('P1 - High');
    const isP2 = labels.includes('P2') || labels.includes('P2 - Medium');
    const isAction = name.includes('[action]');
    const isTask = name.includes('[tasks]');
    const isMC = name.includes('mission control') || name.includes('[mc]') || name.includes('mc ') || 
                 name.includes('dashboard') || name.includes('mcp') || name.includes('agent') ||
                 name.includes('api') || name.includes('lan') || name.includes('register') ||
                 name.includes('rollout') || name.includes('import') || name.includes('cutover') ||
                 name.includes('sunset') || name.includes('skills') || name.includes('icons') ||
                 name.includes('install') || name.includes('windows') || name.includes('service');
    return isMC && (isP1 || isP2 || isAction || isTask) && !labels.includes('Done') && c.idList !== '6a595669b8f8f99c93392f6c';
  });
  
  console.log(`MC P1/P2/Action cards still open (${mcCards.length}):`);
  for (const c of mcCards) {
    const labels = (c.labels || []).map(l => l.name);
    console.log(`  ${c.id} [${labels.join(', ')}] ${c.name.substring(0, 60)}`);
  }
}
main().catch(console.error);
