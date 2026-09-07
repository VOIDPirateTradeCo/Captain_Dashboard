const https = require('https');
const { URL } = require('url');

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7';
const TOKEN = 'ATTA74d859c8715f3a7ed75198d2a6e2dfa7515f0a6cc84b7df07b4e44c8553620f7BE26472F';
const BASE = 'https://api.trello.com/1';
const DONE_LIST = '6a595669b8f8f99c93392f6c';

function trelloGet(path) {
  return new Promise((resolve, reject) => {
    const u = new URL(BASE + path);
    u.searchParams.set('key', KEY);
    u.searchParams.set('token', TOKEN);
    u.searchParams.set('limit', '1000');
    u.searchParams.set('fields', 'id,name');
    https.get(u.toString(), res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(Buffer.concat(chunks).toString('utf8')) });
        } catch (e) {
          resolve({ status: res.statusCode, data: [] });
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('Fetching all done cards...');
  const result = await trelloGet(`/lists/${DONE_LIST}/cards`);
  const cards = result.data;
  console.log(`Found ${cards.length} done cards`);
  
  // For now, just output the IDs we need to check
  // We'll need to fetch comments for each to verify evidence
  console.log('\nFirst 20 cards:');
  for (const c of cards.slice(0, 20)) {
    console.log('  ' + c.id + ': ' + c.name.slice(0, 70));
  }
}

main().catch(e => console.error('FATAL:', e.message));
