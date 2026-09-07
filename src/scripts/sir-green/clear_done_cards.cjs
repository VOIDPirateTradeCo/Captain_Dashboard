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

  const prefixes = ['[BUG]', '[GAP]', '[API]', '[LIB]', '[DOCKER]', '[SCRIPT]', '[PANEL]', '[STORE]', '[PERF]', '[CI]', '[SECURITY]', '[ADAPTER]', '[OPS]', '[MESH', '[P0]', '[P1]', '[SIR GREEN]', '[FLEET]', '[MASTER]', '[AUTH]', '[PINKCADY]', '[STEALTHATTACK]', '[NETBIRD]', '[HEADSCALE]', '[NETMAKER]', '[VERIFY]', '[TOOLING]', '[EPIC]', '[RUNBOOK]', '[DOC]', '[AUDIT]', '[BHP]'];
  
  // Categorize cards
  const tr3asure = cards.filter(c => c.name && c.name.includes('[tr3asure]'));
  const audit = cards.filter(c => c.name && prefixes.some(p => c.name.includes(p)) && !c.name.includes('[tr3asure]'));
  const other = cards.filter(c => c.name && !prefixes.some(p => c.name.includes(p)) && !c.name.includes('[tr3asure]'));

  console.log(`\nCategories:`);
  console.log(`  tr3asure: ${tr3asure.length}`);
  console.log(`  audit-prefix: ${audit.length}`);
  console.log(`  other: ${other.length}`);

  let deleted = 0;
  let skipped = 0;
  let errors = 0;

  // Process tr3asure cards - delete all
  console.log(`\n--- Deleting ${tr3asure.length} tr3asure cards ---`);
  for (let i = 0; i < tr3asure.length; i++) {
    const card = tr3asure[i];
    try {
      await trelloDelete(`/cards/${card.id}`);
      deleted++;
      if (i % 5 === 0) console.log(`  tr3asure: ${i}/${tr3asure.length}`);
    } catch (e) {
      errors++;
    }
    await sleep(200);
  }
  console.log(`  tr3asure done: ${deleted} deleted`);

  // Process "other" cards - delete those with NO comments
  console.log(`\n--- Processing ${other.length} "other" cards ---`);
  let otherDeleted = 0;
  for (let i = 0; i < other.length; i++) {
    const card = other[i];
    try {
      const commentsResult = await trelloGet(`/cards/${card.id}/actions`, { filter: 'commentCard' });
      const comments = commentsResult.data || [];
      
      if (comments.length === 0) {
        // No comments at all - delete
        await trelloDelete(`/cards/${card.id}`);
        otherDeleted++;
        deleted++;
      } else {
        skipped++;
      }
      
      if (i % 50 === 0) console.log(`  other: ${i}/${other.length} | deleted: ${otherDeleted}`);
    } catch (e) {
      errors++;
    }
    await sleep(250);
  }
  console.log(`  other done: ${otherDeleted} deleted, ${skipped} skipped (has comments)`);

  // Process audit cards - broader evidence search
  console.log(`\n--- Processing ${audit.length} audit-prefix cards ---`);
  let auditDeleted = 0;
  for (let i = 0; i < audit.length; i++) {
    const card = audit[i];
    try {
      const commentsResult = await trelloGet(`/cards/${card.id}/actions`, { filter: 'commentCard' });
      const comments = commentsResult.data || [];
      
      // Broader evidence check
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
          text.length > 100 // Long comment likely has evidence
        );
      });

      if (hasEvidence) {
        await trelloDelete(`/cards/${card.id}`);
        auditDeleted++;
        deleted++;
      } else {
        skipped++;
      }
      
      if (i % 50 === 0) console.log(`  audit: ${i}/${audit.length} | deleted: ${auditDeleted}`);
    } catch (e) {
      errors++;
    }
    await sleep(250);
  }
  console.log(`  audit done: ${auditDeleted} deleted, ${skipped} skipped`);

  console.log(`\n=== FINAL RESULTS ===`);
  console.log(`Total deleted: ${deleted}`);
  console.log(`Total skipped: ${skipped}`);
  console.log(`Total errors: ${errors}`);
}

main().catch(e => console.error('FATAL:', e.message));
