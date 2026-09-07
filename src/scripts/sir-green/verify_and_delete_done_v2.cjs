const https = require('https');
const { URL } = require('url');

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7';
const TOKEN = 'ATTA74d859c8715f3a7ed75198d2a6e2dfa7515f0a6cc84b7df07b4e44c8553620f7BE26472F';
const BASE = 'https://api.trello.com/1';

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
        try { resolve({ status: res.statusCode, data: JSON.parse(Buffer.concat(chunks).toString('utf8')) }); }
        catch (e) { resolve({ status: res.statusCode, data: [] }); }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('Fetching all done cards...');
  const result = await trelloGet(`/lists/${DONE_LIST}/cards`, { limit: '1000', fields: 'id,name' });
  const cards = result.data;
  console.log(`Found ${cards.length} done cards`);

  const prefixes = ['[BUG]', '[GAP]', '[API]', '[LIB]', '[DOCKER]', '[SCRIPT]', '[PANEL]', '[STORE]', '[PERF]', '[CI]', '[SECURITY]', '[ADAPTER]', '[OPS]', '[MESH', '[P0]', '[P1]', '[SIR GREEN]', '[FLEET]', '[MASTER]', '[AUTH]', '[PINKCADY]', '[STEALTHATTACK]', '[NETBIRD]', '[HEADSCALE]', '[NETMAKER]', '[VERIFY]', '[TOOLING]', '[EPIC]', '[RUNBOOK]', '[DOC]', '[AUDIT]', '[BHP]'];
  
  const audit = cards.filter(c => c.name && prefixes.some(p => c.name.includes(p)));
  console.log(`Audit-prefix cards: ${audit.length}`);

  let withEvidence = 0;
  let withoutEvidence = 0;
  let deleted = 0;
  let errors = 0;

  // Process in batches of 5
  for (let i = 0; i < audit.length; i += 5) {
    const batch = audit.slice(i, i + 5);
    
    const promises = batch.map(async (card) => {
      try {
        const commentsResult = await trelloGet(`/cards/${card.id}/actions`, { filter: 'commentCard' });
        const comments = commentsResult.data || [];
        
        const hasEvidence = comments.some(c => {
          if (!c.data || !c.data.text) return false;
          const text = c.data.text;
          return (
            text.includes('[EVIDENCE') ||
            text.includes('VERIFIED') ||
            text.includes('Evidence:') ||
            text.includes('REVIEWED:') ||
            text.includes('PASS') ||
            text.includes('FAIL') ||
            text.includes('Result:') ||
            text.includes('Action:') ||
            text.includes('✅') ||
            text.includes('❌') ||
            text.includes('Fixed') ||
            text.includes('Resolved') ||
            text.includes('Tested') ||
            text.includes('Confirmed') ||
            text.length > 100
          );
        });

        if (hasEvidence) {
          withEvidence++;
          await trelloDelete(`/cards/${card.id}`);
          deleted++;
          return { card: card.name.slice(0,40), action: 'DELETED' };
        } else {
          withoutEvidence++;
          return { card: card.name.slice(0,40), action: 'SKIPPED' };
        }
      } catch (e) {
        errors++;
        return { card: card.name.slice(0,40), action: 'ERROR: ' + e.message };
      }
    });

    const results = await Promise.all(promises);
    
    if (i % 50 === 0) {
      console.log(`Progress: ${i}/${audit.length} | Deleted: ${deleted} | Skipped: ${withoutEvidence} | Errors: ${errors}`);
    }
    
    await sleep(300);
  }

  console.log(`\n=== FINAL RESULTS ===`);
  console.log(`With evidence (deleted): ${deleted}`);
  console.log(`Without evidence (skipped): ${withoutEvidence}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total audit cards: ${audit.length}`);
}

main().catch(e => console.error('FATAL:', e.message));
