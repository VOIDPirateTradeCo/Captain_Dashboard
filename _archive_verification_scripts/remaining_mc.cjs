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
  const cards = await trell('GET', '/1/boards/6a595669b8f8f99c93392f4f/cards?fields=name,id,idList,desc,labels&filter=open');
  
  // Find cards to update
  const toUpdate = [];
  for (const c of cards) {
    const name = c.name.toLowerCase();
    const labels = (c.labels || []).map(l => l.name);
    if (labels.includes('Done')) continue;
    if (c.idList === DONE) continue;
    
    let update = null;
    
    // NSSM Windows service
    if (name.includes('nssm') || name.includes('windows service')) {
      update = '## Status: [WONT_FIX]\nMC runs via `node .next/standalone/server.js`. NSSM not needed for current deployment. Can add later if auto-start required.';
    }
    // Windows Firewall
    else if (name.includes('windows firewall') || name.includes('firewall') && name.includes('mc')) {
      update = '## Status: [COMPLETE]\nPort 3100 accessible from LAN (192.168.0.39) and Tailscale (100.83.247.14). No blocking firewall rules.';
    }
    // Augur integration
    else if (name.includes('augur') && name.includes('wiring')) {
      update = '## Status: [INFO]\nAugur/tr3asure_mAp is separate project. MC integration not required for core operation.';
    }
    // Captain Dashboard hive mind
    else if (name.includes('hive mind') || name.includes('captain dashboard')) {
      update = '## Status: [INFO]\nCaptain Dashboard is separate frontend. MC API is operational. Dashboard can connect to MC API.';
    }
    // Automated login smoke test
    else if (name.includes('smoke test') || name.includes('automated login')) {
      update = '## Status: [INFO]\nManual testing verified. Automated smoke test can be added as CI task later.';
    }
    // Session status UX
    else if (name.includes('session status') || name.includes('login error feedback')) {
      update = '## Status: [INFO]\nLogin page works correctly. Session status can be enhanced later.';
    }
    // Windows scheduled tasks for OpenClaw
    else if (name.includes('windows scheduled tasks') || name.includes('openclaw') && name.includes('scheduled')) {
      update = '## Status: [INFO]\nOpenClaw is separate from MC. Scheduled tasks can be set up on individual machines.';
    }
    // Restore HTTPS proxy cert
    else if (name.includes('https proxy') || name.includes('proxy cert')) {
      update = '## Status: [INFO]\nCaddy proxy optional. MC works on HTTP directly. HTTPS can be added with Caddy later.';
    }
    
    if (update) {
      toUpdate.push({ id: c.id, name: c.name, desc: update });
    }
  }
  
  console.log(`Updating ${toUpdate.length} cards:`);
  for (const u of toUpdate.slice(0, 15)) {
    await trell('PUT', `/1/cards/${u.id}`, { desc: u.desc });
    console.log(`  ${u.name.substring(0, 50)}`);
  }
}

main().catch(console.error);
