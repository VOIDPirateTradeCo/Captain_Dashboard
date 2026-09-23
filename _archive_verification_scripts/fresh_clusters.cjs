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
  const lists = await trell('GET', '/1/boards/6a595669b8f8f99c93392f4f/lists?fields=name');
  const listMap = {};
  for (const l of lists) listMap[l.id] = l.name;
  const DONE = '6a595669b8f8f99c93392f6c';

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
      mcCards.push(c);
    }
  }

  // Group by cluster
  const clusters = {
    'OpenClaw Gateway + CLI': [],
    'Crew Provisioning': [],
    'Agent Permissions + API Keys': [],
    'Infrastructure + Docs': [],
    'Bot Templates + Access': [],
    'Other MC': []
  };

  for (const c of mcCards) {
    const name = c.name.toLowerCase();
    const labels = (c.labels || []).map(l => l.name);
    const listName = listMap[c.idList] || 'Unknown';
    const isP1 = labels.includes('P1') || labels.includes('P1 - High');
    const isP2 = labels.includes('P2') || labels.includes('P2 - Medium');
    const isP3 = labels.includes('P3') || labels.includes('P3 - Low');
    const isAction = name.includes('[action]');
    const isBug = labels.includes('bug') || name.includes('[bug]');

    if (name.includes('openclaw') || name.includes('gateway') || name.includes('daemonize') || name.includes('cli')) {
      clusters['OpenClaw Gateway + CLI'].push(c);
    } else if (name.includes('crew') || name.includes('torus') || name.includes('miss ') || name.includes('sir ') || name.includes('captain')) {
      clusters['Crew Provisioning'].push(c);
    } else if (name.includes('permission') || name.includes('key') || name.includes('api key')) {
      clusters['Agent Permissions + API Keys'].push(c);
    } else if (name.includes('docker') || name.includes('security') || name.includes('winrm') || name.includes('doc') || name.includes('fleet')) {
      clusters['Infrastructure + Docs'].push(c);
    } else if (name.includes('bot') || name.includes('template') || name.includes('access')) {
      clusters['Bot Templates + Access'].push(c);
    } else {
      clusters['Other MC'].push(c);
    }
  }

  console.log(`MC-related open cards: ${mcCards.length}\n`);
  for (const [cluster, cards] of Object.entries(clusters)) {
    if (cards.length === 0) continue;
    console.log(`## ${cluster} (${cards.length} cards)`);
    for (const c of cards) {
      const labels = (c.labels || []).map(l => l.name);
      const listName = listMap[c.idList] || 'Unknown';
      const priority = labels.find(l => l.match(/^P[0-4]/)) || (c.name.includes('[ACTION]') ? 'ACTION' : labels.find(l => l.match(/^P[0-4]/)) || '-');
      console.log(`  ${priority} | ${listName} | ${c.name.substring(0, 55)}`);
    }
    console.log('');
  }
}
main().catch(console.error);
