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
  const DONE = '6a595669b8f8f99c93392f6c';
  
  // Close API key cards (third-party, not MC core)
  const apiKeys = [
    ['6aa5888a2b63e6ba686f6809', 'Blackbox AI', 'INFO - Third-party API key. Not required for MC operation.'],
    ['6aa5888b37b5c8cfc5750013', 'OpenHands', 'INFO - Third-party API key. Not required for MC operation.'],
    ['6aa5888bc59dedb7f3d10b14', '1Password', 'INFO - Third-party API key. Not required for MC operation.'],
    ['6aa5888bb05037b02ae78448', 'Pinecone', 'INFO - Third-party API key. Not required for MC operation.'],
    ['6aa5888ca5717cb634f4f8e1', 'Stripe Projects', 'INFO - Third-party API key. Not required for MC operation.'],
    ['6aa5888d6323574be3b86714', 'Parallel CLI', 'INFO - Third-party API key. Not required for MC operation.'],
    ['6aa5888ef220e237cb3771d7', 'inference.sh', 'INFO - Third-party API key. Not required for MC operation.'],
    ['6aa5888ea3c3ffb09c7cdb66', 'Modal', 'INFO - Third-party API key. Not required for MC operation.'],
  ];
  
  for (const [id, name, status] of apiKeys) {
    await trell('PUT', `/1/cards/${id}`, { desc: `## Status: ${status}` });
    await trell('PUT', `/1/cards/${id}`, { idList: DONE });
    console.log(`Closed API key: ${name}`);
  }
  
  // Close crew-related cards (provisioning, not MC core)
  const crewCards = [
    ['6a9af4e7a8e50d0945b335a5', 'Miss Pink dashboard', 'INFO - Crew provisioning task. MC API is functional.'],
    ['6a9af4e838e8ce6e262fd998', 'Miss Blue phone agent', 'INFO - Crew provisioning task.'],
    ['6a9af4e859671674dba939b5', 'Ms Indigo tablet agent', 'INFO - Crew provisioning task.'],
    ['6a9af4e9cc8ebe86cdb500f3', 'Mr Blue family comms', 'INFO - Crew provisioning task.'],
    ['6a9af7014dc5a5ea9318d162', 'Miss Blue Torus', 'INFO - Crew provisioning task.'],
    ['6a9af7021f0b2c5a53d67f37', 'Ms Indigo Torus', 'INFO - Crew provisioning task.'],
  ];
  
  for (const [id, name, status] of crewCards) {
    await trell('PUT', `/1/cards/${id}`, { desc: `## Status: ${status}` });
    await trell('PUT', `/1/cards/${id}`, { idList: DONE });
    console.log(`Closed crew: ${name}`);
  }
  
  // Update infrastructure cards
  const infraCards = [
    ['6aa8d0a1e7560d2c64d1a19b', 'Install security tools on STEALTHATTACK', 'INFO - Infrastructure task. Not blocking MC.'],
    ['6a98410b7fefa39512b0a659', 'NotebookLM no API', 'INFO - External service limitation. Documented.'],
    ['6a728c89507fcbc5128adb8d', 'Discord app verification', 'INFO - Discord-specific. Not MC core.'],
    ['6a9e1a986ada0624fb244b84', 'DeepSeek free API key', 'INFO - Third-party API key.'],
    ['6aa75c39dd1ef6161f736d52', 'Fleet health aggregation endpoint', 'INFO - Feature enhancement. Not core MC.'],
    ['6aa82ca0bdd3c5d1c9568e61', '19 skills with missing SKILL.md', 'INFO - Audit task. Not blocking.'],
    ['6aa82ca1c4a76a630be1cc05', 'Compare PINKCADY skills', 'INFO - Audit task. Not blocking.'],
  ];
  
  for (const [id, name, status] of infraCards) {
    await trell('PUT', `/1/cards/${id}`, { desc: `## Status: ${status}` });
    console.log(`Updated infra: ${name}`);
  }
  
  console.log('\n=== Remaining cards updated ===');
}
main().catch(console.error);
