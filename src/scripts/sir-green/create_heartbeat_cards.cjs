const https = require('https');
const { URL } = require('url');

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7';
const TOKEN = 'ATTA74d859c8715f3a7ed75198d2a6e2dfa7515f0a6cc84b7df07b4e44c8553620f7BE26472F';
const BASE = 'https://api.trello.com/1';

function trelloPost(path, data) {
  return new Promise((resolve, reject) => {
    const u = new URL(BASE + path);
    u.searchParams.set('key', KEY);
    u.searchParams.set('token', TOKEN);
    const body = JSON.stringify(data);
    const req = https.request(u.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(Buffer.concat(chunks).toString('utf8')) }); }
        catch (e) { resolve({ status: res.statusCode, data: null }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const agents = ['sir-azure', 'miss-pink', 'captain', 'sir-violet', 'mr-blue'];
  
  for (const agent of agents) {
    const result = await trelloPost('/cards', {
      idList: '6a73abbf275aa5c96ab03e67',
      name: `[P1] Install heartbeat daemon for ${agent}`,
      desc: `Install heartbeat daemon for ${agent} so they stay online in MC.\n\nCommands:\n- Create Windows Scheduled Task\n- Test heartbeat`,
      labels: ['sir-green', 'P1']
    });
    console.log(`${agent}: ${result.status} ${result.data ? result.data.id : 'error'}`);
  }
}

main().catch(e => console.error('FATAL:', e.message));
