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
  
  // Security audit card
  await req('POST', '/1/cards/6a9e29736c4d1022713a6b40/actions/comments', { text: `## [GREEN] VERIFIED — ${now}
MC runs HTTP on LAN (:3100) with no HTTPS termination — MC_COOKIE_SECURE=0 and MC_ENABLE_HSTS=0 are correct for this deployment. All debug/admin endpoints require auth.` });

  // API_KEY leak card  
  await req('POST', '/1/cards/6aa7fe8eb6e768884239fe33/actions/comments', { text: `## [GREEN] VERIFIED — ${now}
/api/health returns only \`{status:"ok", db:"ok", ts}\` — no API keys or sensitive data leaked. All other debug endpoints require authentication.` });

  console.log('Security cards updated');
})().catch(e => console.error(e.message));
