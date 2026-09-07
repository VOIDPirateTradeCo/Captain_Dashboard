const https = require('https');
const { URL } = require('url');

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7';
const TOKEN = 'ATTA74d859c8715f3a7ed75198d2a6e2dfa7515f0a6cc84b7df07b4e44c8553620f7BE26472F';
const BASE = 'https://api.trello.com/1';
const DONE_LIST = '6a595669b8f8f99c93392f6c';

function trelloGet(path, params = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(BASE + path);
    u.searchParams.set('key', KEY);
    u.searchParams.set('token', TOKEN);
    Object.entries(params).forEach(([k,v]) => u.searchParams.set(k, v));
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

function trelloDelete(path) {
  return new Promise((resolve, reject) => {
    const u = new URL(BASE + path);
    u.searchParams.set('key', KEY);
    u.searchParams.set('token', TOKEN);
    const req = https.request(u.toString(), { method: 'DELETE' }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode }));
    });
    req.on('error', reject);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('Fetching all done cards...');
  const result = await trelloGet(`/lists/${DONE_LIST}/cards`, { limit: '1000', fields: 'id,name' });
  const cards = result.data;
  console.log(`Found ${cards.length} done cards`);

  let deleted = 0;
  let errors = 0;

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    try {
      await trelloDelete(`/cards/${card.id}`);
      deleted++;
      if (i % 50 === 0) console.log(`Progress: ${i}/${cards.length} | deleted: ${deleted}`);
    } catch (e) {
      errors++;
      if (errors % 10 === 0) console.log(`Errors: ${errors}`);
    }
    await sleep(200);
  }

  console.log(`\n=== FINAL RESULTS ===`);
  console.log(`Total deleted: ${deleted}`);
  console.log(`Total errors: ${errors}`);
  console.log(`Remaining: ${cards.length - deleted}`);
}

main().catch(e => console.error('FATAL:', e.message));
