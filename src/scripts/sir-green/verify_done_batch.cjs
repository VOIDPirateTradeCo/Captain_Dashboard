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

  // Filter to cards with audit prefixes (the ones we processed)
  const auditPrefixes = ['[BUG]', '[GAP]', '[API]', '[LIB]', '[DOCKER]', '[SCRIPT]', '[PANEL]', '[STORE]', '[PERF]', '[CI]', '[SECURITY]', '[ADAPTER]', '[OPS]', '[MESH', '[P0]', '[P1]', '[SIR GREEN]', '[FLEET]', '[MASTER]', '[AUTH]', '[PINKCADY]', '[STEALTHATTACK]', '[NETBIRD]', '[HEADSCALE]', '[NETMAKER]', '[VERIFY]', '[TOOLING]', '[EPIC]', '[RUNBOOK]', '[DOC]', '[AUDIT]', '[BHP'];
  
  const toVerify = cards.filter(c => {
    if (!c.name) return false;
    return auditPrefixes.some(p => c.name.includes(p));
  });

  console.log(`Cards to verify: ${toVerify.length}`);

  let withEvidence = 0;
  let withoutEvidence = 0;
  const withEvidenceIds = [];
  const withoutEvidenceIds = [];

  // Process in batches of 10
  for (let i = 0; i < toVerify.length; i += 10) {
    const batch = toVerify.slice(i, i + 10);
    
    // Fetch comments for batch in parallel
    const promises = batch.map(async (card) => {
      try {
        const commentsResult = await trelloGet(`/cards/${card.id}/actions?filter=commentCard`);
        const comments = commentsResult.data || [];
        
        // Check if any comment contains our evidence marker
        const hasEvidence = comments.some(c => 
          c.data && c.data.text && c.data.text.includes('[EVIDENCE 2026-09-03]')
        );

        return { card, hasEvidence };
      } catch (e) {
        return { card, hasEvidence: false };
      }
    });

    const results = await Promise.all(promises);
    
    for (const { card, hasEvidence } of results) {
      if (hasEvidence) {
        withEvidence++;
        withEvidenceIds.push(card.id);
      } else {
        withoutEvidence++;
        withoutEvidenceIds.push(card.id);
      }
    }

    console.log(`Batch ${Math.floor(i/10) + 1}: ${withEvidence} with evidence, ${withoutEvidence} without`);
    
    // Rate limit between batches
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n=== VERIFICATION RESULTS ===`);
  console.log(`With evidence: ${withEvidence}`);
  console.log(`Without evidence: ${withoutEvidence}`);
  console.log(`Total: ${toVerify.length}`);
  
  // Save results to files
  const fs = require('fs');
  fs.writeFileSync('with_evidence_ids.json', JSON.stringify(withEvidenceIds, null, 2));
  fs.writeFileSync('without_evidence_ids.json', JSON.stringify(withoutEvidenceIds, null, 2));
  console.log('\nSaved ID files');
}

main().catch(e => console.error('FATAL:', e.message));
