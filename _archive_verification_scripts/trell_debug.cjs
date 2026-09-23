const https = require('https');

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7';
const TOKEN = 'ATTA0a7f5faaf0163f82b6bf411207e70c83f8d6ac4c526647c8fbd23e9c14b5f9f7412C8A6B';

function trellRequest(method, path) {
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
    req.end();
  });
}

async function main() {
  // Get board info
  const board = await trellRequest('GET', '/1/boards/6a595669b8f8f99c93392f4f?fields=name,url');
  console.log('Board:', board.name || board.raw);
  
  // Get lists
  const lists = await trellRequest('GET', '/1/boards/6a595669b8f8f99c93392f4f/lists?fields=name,closed');
  console.log('Lists response type:', typeof lists, Array.isArray(lists) ? 'array' : 'not array');
  if (Array.isArray(lists)) {
    console.log('Lists:', lists.map(l => `${l.name} (closed=${l.closed})`).join(', '));
  } else {
    console.log('Lists raw:', JSON.stringify(lists).substring(0, 300));
  }
}

main().catch(console.error);
