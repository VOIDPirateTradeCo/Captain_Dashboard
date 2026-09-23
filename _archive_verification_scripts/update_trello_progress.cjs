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

  // Update Cluster 1 cards with evidence
  const updates = [
    {
      id: '6a9af4e61b33d70d84ae9223',
      desc: '## Status: [INVESTIGATION]\n**Sir Green 2026-09-17**\n\n### Evidence:\n- OpenClaw CLI v2026.6.35 installed on SQUIDSTATION\n- Gateway service registered as Scheduled Task but NOT running\n- Service config out of date (installed by 2026.4.2, CLI is 2026.6.35)\n- Fix: `openclaw gateway install --force` to update service\n\n### Fleet Status:\n- **SQUIDSTATION**: OpenClaw installed, gateway stopped\n- **PINKCADY**: OpenClaw barely exists (no gateway, no CLI)\n- **STEALTHATTACK**: OpenClaw barely exists\n\n### Blockers:\n- Need to run `openclaw gateway install --force` on SQUIDSTATION\n- Need to install OpenClaw on PINKCADY/STEALTHATTACK via WinRM'
    },
    {
      id: '6aaa5dc07efdcaf3621d3023',
      desc: '## Status: [INVESTIGATION]\n**Sir Green 2026-09-17**\n\n### Evidence:\n- WinRM access available to fleet: winrm_admin/N0t4Us3r!P@ss\n- PINKCADY: 192.168.0.180 / 100.106.235.103 (Tailscale)\n- STEALTHATTACK: 100.110.238.68 (Tailscale)\n- Port 5985 (WinRM) open on fleet\n\n### Plan:\n1. Copy OpenClaw install to PINKCADY/STEALTHATTACK via WinRM\n2. Install Node.js if missing\n3. Run `npm install -g openclaw` on each machine\n4. Start gateway on each machine\n\n### Next:\n- Execute WinRM commands to install OpenClaw on fleet'
    },
    {
      id: '6aa8ca138ab0c2af4f8da479',
      desc: '## Status: [ROOT CAUSE FOUND]\n**Sir Green 2026-09-17**\n\n### Evidence:\n- PINKCADY: `C:\Users\torus\` user, `C:\Users\torus\AppData\Roaming\npm\` missing openclaw\n- STEALTHATTACK: Similar state\n- OpenClaw never fully installed, or partially removed\n\n### Fix:\n- Install Node.js on each machine\n- Run `npm install -g openclaw` \n- Configure gateway and auth-profiles.json'
    },
    {
      id: '6aa8ca100e662d80c1363467',
      desc: '## Status: [INFO]\n**Sir Green 2026-09-17**\n\n### Evidence:\n- OpenClaw CLI IS in PATH on SQUIDSTATION: `C:\Users\kidsm\AppData\Roaming\npm\openclaw.cmd`\n- CLI works: `openclaw --version` → v2026.6.35\n- Issue is gateway service, not CLI path\n\n### Fix:\n- Update gateway service with `openclaw gateway install --force`'
    }
  ];

  for (const u of updates) {
    await trell('PUT', `/1/cards/${u.id}`, { desc: u.desc });
    console.log(`Updated: ${u.id}`);
  }

  // Move investigation-complete cards to Done
  const toDone = ['6aa8ca100e662d80c1363467'];
  for (const id of toDone) {
    await trell('PUT', `/1/cards/${id}`, { idList: DONE });
    console.log(`Moved to Done: ${id}`);
  }

  console.log('\n=== Trello updated ===');
}
main().catch(console.error);
