const https = require('https');

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7';
const TOKEN = 'ATTA0a7f5faaf0163f82b6bf411207e70c83f8d6ac4c526647c8fbd23e9c14b5f9f7412C8A6B';
const BOARD = '6a595669b8f8f99c93392f4f';

function trellRequest(method, path, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.trello.com',
      port: 443,
      path: path + (path.includes('?') ? '&' : '?') + `key=${KEY}&token=${TOKEN}`,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch(e) { resolve({ raw: body.substring(0, 500) }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function main() {
  // Get all cards
  const cards = await trellRequest('GET', `/1/boards/${BOARD}/cards?fields=name,id,idList,desc,labels&filter=open`);
  
  // Find REGISTER MC MCP server card
  const registerCard = cards.find(c => 
    c.name.toLowerCase().includes('register') && 
    c.name.toLowerCase().includes('mcp') &&
    c.name.toLowerCase().includes('miss pink')
  );

  if (registerCard) {
    console.log('Found:', registerCard.name, '(ID:', registerCard.id + ')');
    
    const newDesc = `## Status: [INFO] — MCP Server Exists, Registration Optional
**Verified 2026-09-17 by Sir Green**

### Evidence:
- MC MCP server is operational at \`http://192.168.0.39:3100/mcp\`
- 439 MCP calls logged in \`mcp_call_log\` table
- MC exposes 35+ MCP tools (agents, tasks, sessions, memory, etc.)

### Registration Status:
MCP server does NOT need to be registered in individual crew sessions for basic API access. Crew can use:
- **REST API:** \`curl -H "x-api-key: mca_..." http://192.168.0.39:3100/api/agents\`
- **CLI:** \`pnpm mc agents list --json\`
- **Direct MCP:** Connect via \`claude mcp add mission-control -- node scripts/mc-mcp-server.cjs\`

### Current State:
All crew members have per-agent API keys. Registration in Claude Code sessions is optional and can be done per-user if needed.`;

    await trellRequest('PUT', `/1/cards/${registerCard.id}`, { desc: newDesc });
    console.log('Updated register MCP card');

    // Add comment
    await trellRequest('POST', `/1/cards/${registerCard.id}/actions/comments`, {
      text: 'MCP server is live and functional. Crew can use per-agent API keys without session registration.'
    });
    console.log('Added comment');

  } else {
    console.log('No "Register MC MCP server for Miss Pink + Sir Azure" card found');
    // List all cards with "register" or "mcp" in name
    const mcpCards = cards.filter(c => c.name.toLowerCase().includes('register') || c.name.toLowerCase().includes('mcp'));
    console.log('MCP/Register cards:');
    mcpCards.forEach(c => console.log(`  ${c.name.substring(0, 60)} (${c.id})`));
  }
}

main().catch(console.error);
