const https = require('https');
const KEY = 'edb3c4349df2946a8114baadfc9e2ad7';
const TOKEN = 'ATTA0a7f5faaf0163f82b6bf411207e70c83f8d6ac4c526647c8fbd23e9c14b5f9f7412C8A6B';

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const qs = `?key=${KEY}&token=${TOKEN}`;
    const req = https.request({ hostname: 'api.trello.com', path: path + qs, method,
      headers: body ? { 'Content-Type': 'application/json', 'Content-Length': JSON.stringify(body).length } : {}
    }, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d)); });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  const now = new Date().toISOString();
  
  // HERMES_GATEWAY_URL card (6aaa5dbcfe8d2c058f2d01f8)
  await req('POST', '/1/cards/6aaa5dbcfe8d2c058f2d01f8/actions/comments', { text: `## [GREEN] Config Applied — ${now}
### Added to .env:
- \`HERMES_GATEWAY_URL=ws://127.0.0.1:18789\`
- \`OPENCLAW_HOME=C:\Users\kidsm\.openclaw\`
- \`OPENCLAW_CONFIG_PATH=C:\Users\kidsm\.openclaw\openclaw.json\`

### Next:
- Restart MC to pick up new env
- Verify agents page loads without ENOENT
- Register sir-green agent` });

  // OPENCLAW_HOME card (6aa8435e460b2b777c634eb1)
  await req('POST', '/1/cards/6aa8435e460b2b777c634eb1/actions/comments', { text: `## [GREEN] Done — ${now}
Added to .env:
- \`OPENCLAW_HOME=C:\Users\kidsm\.openclaw\`
- \`OPENCLAW_CONFIG_PATH=C:\Users\kidsm\.openclaw\openclaw.json\`

Server restart required to take effect.` });

  // Auto-sync ENOENT card (6a9da9d844b96df3bf8ac336)
  await req('POST', '/1/cards/6a9da9d844b96df3bf8ac336/actions/comments', { text: `## [GREEN] Root Cause Found — ${now}
### Issue:
MC was looking for openclaw config at \`/nonexistent/.openclaw/openclaw.json\` (WinRM temp user profile path)

### Fix Applied:
- Added \`OPENCLAW_HOME=C:\Users\kidsm\.openclaw\` to .env
- Added \`OPENCLAW_CONFIG_PATH=C:\Users\kidsm\.openclaw\openclaw.json\` to .env

### Next:
- Restart MC and verify agents page no longer shows ENOENT` });

  console.log('All 1B cards updated');
})().catch(e => console.error(e.message));
