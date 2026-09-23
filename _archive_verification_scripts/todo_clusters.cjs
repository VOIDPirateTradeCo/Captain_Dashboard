const https = require('https');
const KEY = 'edb3c4349df2946a8114baadfc9e2ad7';
const TOKEN = 'ATTA0a7f5faaf0163f82b6bf411207e70c83f8d6ac4c526647c8fbd23e9c14b5f9f7412C8A6B';

function trell(method, path) {
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
    req.end();
  });
}

async function main() {
  const cards = await trell('GET', '/1/boards/6a595669b8f8f99c93392f4f/cards?fields=name,id,idList,desc,labels&filter=open');
  const lists = await trell('GET', '/1/boards/6a595669b8f8f99c93392f4f/lists?fields=name');
  const listMap = {};
  for (const l of lists) listMap[l.id] = l.name;
  const DONE = '6a595669b8f8f99c93392f6c';
  
  // Find "To Do Next" list ID
  const todoList = lists.find(l => l.name === 'To Do Next');
  const TODO_ID = todoList ? todoList.id : null;

  // Filter MC-related cards still open
  const mcCards = [];
  for (const c of cards) {
    const labels = (c.labels || []).map(l => l.name);
    const name = c.name.toLowerCase();
    if (labels.includes('Done') || c.idList === DONE) continue;
    if (name.includes('crownless') || name.includes('cf-')) continue;
    if (name.includes('tr3asure') || name.includes('treasure')) continue;
    if (labels.includes('Crownless') || labels.includes('tr3asure')) continue;

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
                 name.includes('captain') || name.includes('crew') ||
                 name.includes('gateway') || name.includes('permissions') ||
                 name.includes('key') || name.includes('heartbeat');

    if (isMC && (isP1 || isP2 || isP3 || isAction || isTask || isBug)) {
      const listName = listMap[c.idList] || 'Unknown';
      mcCards.push({ ...c, listName });
    }
  }

  // Separate To Do Next cards from others
  const todoCards = mcCards.filter(c => c.idList === TODO_ID);
  const otherCards = mcCards.filter(c => c.idList !== TODO_ID);

  console.log(`MC-related open cards: ${mcCards.length}`);
  console.log(`  - In "To Do Next": ${todoCards.length}`);
  console.log(`  - In other lists: ${otherCards.length}\n`);

  // Cluster To Do Next cards
  console.log('=== TO DO NEXT LIST ===');
  const todoClusters = {
    'OpenClaw Runtime': [],
    'Crew Setup': [],
    'API Keys + Auth': [],
    'Infrastructure': [],
    'MC Core': []
  };

  for (const c of todoCards) {
    const name = c.name.toLowerCase();
    if (name.includes('openclaw') || name.includes('gateway') || name.includes('cli') || name.includes('daemonize')) {
      todoClusters['OpenClaw Runtime'].push(c);
    } else if (name.includes('crew') || name.includes('torus') || name.includes('miss ') || name.includes('sir ') || name.includes('captain')) {
      todoClusters['Crew Setup'].push(c);
    } else if (name.includes('permission') || name.includes('key') || name.includes('api key')) {
      todoClusters['API Keys + Auth'].push(c);
    } else if (name.includes('docker') || name.includes('security') || name.includes('winrm') || name.includes('doc')) {
      todoClusters['Infrastructure'].push(c);
    } else {
      todoClusters['MC Core'].push(c);
    }
  }

  for (const [cluster, cards] of Object.entries(todoClusters)) {
    if (cards.length === 0) continue;
    console.log(`\n${cluster} (${cards.length}):`);
    for (const c of cards) {
      const labels = (c.labels || []).map(l => l.name);
      const priority = labels.find(l => l.match(/^P[0-4]/)) || (c.name.includes('[ACTION]') ? 'ACTION' : '-');
      console.log(`  ${priority} | ${c.name.substring(0, 55)}`);
    }
  }

  // Other MC cards
  console.log('\n\n=== OTHER LISTS ===');
  const otherClusters = {};
  for (const c of otherCards) {
    const listName = c.listName;
    if (!otherClusters[listName]) otherClusters[listName] = [];
    otherClusters[listName].push(c);
  }

  for (const [listName, cards] of Object.entries(otherClusters)) {
    console.log(`\n${listName} (${cards.length}):`);
    for (const c of cards) {
      const labels = (c.labels || []).map(l => l.name);
      const priority = labels.find(l => l.match(/^P[0-4]/)) || (c.name.includes('[ACTION]') ? 'ACTION' : '-');
      console.log(`  ${priority} | ${c.name.substring(0, 55)}`);
    }
  }
}
main().catch(console.error);
