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
  // Get all lists
  const lists = await trellRequest('GET', `/1/boards/${BOARD}/lists?fields=name,closed`);
  const doneList = lists.find(l => l.name.toLowerCase() === 'done');
  console.log('Done list:', doneList ? doneList.id : 'NOT FOUND');

  // Get all open cards
  const cards = await trellRequest('GET', `/1/boards/${BOARD}/cards?fields=name,id,idList,desc,labels&filter=open`);
  console.log('Total open cards:', cards.length);

  // Find remaining MC P1/P2 action cards
  const mcCards = cards.filter(c => {
    const labels = c.labels ? c.labels.map(l => l.name) : [];
    const name = c.name.toLowerCase();
    const isP1 = labels.includes('P1') || labels.includes('P1 - High');
    const isP2 = labels.includes('P2') || labels.includes('P2 - Medium');
    const isMC = name.includes('mission') || name.includes('mc ') || name.includes('mcp') || 
                 name.includes('rollout') || name.includes('import') || name.includes('cutover') ||
                 name.includes('sunset') || name.includes('register') || name.includes('api');
    return (isP1 || isP2) && isMC;
  });

  console.log('\nMC P1/P2 cards found:', mcCards.length);
  mcCards.forEach(c => {
    const labels = c.labels ? c.labels.map(l => l.name) : [];
    console.log(`  [${labels.join(', ')}] ${c.name.substring(0, 60)}`);
  });

  // Find specific cards to update
  const toUpdate = {};
  mcCards.forEach(c => {
    const name = c.name.toLowerCase();
    if (name.includes('rollout') || name.includes('mcp server')) toUpdate.rollout = c;
    if (name.includes('import') || name.includes('trello')) toUpdate.import = c;
    if (name.includes('register') && name.includes('mcp')) toUpdate.registerMcp = c;
    if (name.includes('multi-device') || name.includes('lan access')) toUpdate.lan = c;
    if (name.includes('cutover') || name.includes('sunset')) toUpdate.cutover = c;
  });

  console.log('\nCards to update:');
  for (const [key, c] of Object.entries(toUpdate)) {
    console.log(`  ${key}: ${c.name.substring(0, 50)} (ID: ${c.id})`);
  }

  return { doneList, toUpdate };
}

main().catch(console.error);
