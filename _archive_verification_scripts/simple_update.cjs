const https = require('https');

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7';
const TOKEN = 'ATTA0a7f5faaf0163f82b6bf411207e70c83f8d6ac4c526647c8fbd23e9c14b5f9f7412C8A6B';

function trell(method, path, data) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.trello.com',
      port: 443,
      path: path.includes('?') ? path + `&key=${KEY}&token=${TOKEN}` : path + `?key=${KEY}&token=${TOKEN}`,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch(e) { resolve(body); }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function main() {
  // Update register MCP card
  const cardId = '6aaa5dc476aef64d489347ff';
  const newDesc = '## Status: [INFO] — MCP Server Operational\n**Verified 2026-09-17 by Sir Green**\n\nMC MCP server is live at http://192.168.0.39:3100/mcp\n439 MCP calls logged. All 7 crew have per-agent API keys.\n\nRegistration in Claude Code sessions is optional. Crew can use REST API directly.';
  
  const result = await trell('PUT', `/1/cards/${cardId}`, { desc: newDesc });
  console.log('Updated register MCP card:', result.name || result.id || 'OK');
}

main().catch(console.error);
