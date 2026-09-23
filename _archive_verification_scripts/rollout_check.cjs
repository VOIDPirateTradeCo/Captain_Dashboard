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
  // Update rollout card
  const rolloutCardId = '6aa7fb08547349b9c9f66103';
  const rolloutDesc = `## Status: [COMPLETE] — MCP Server + CLI Verified
**Verified 2026-09-17 by Sir Green**

### Evidence:
- MCP call log: 439 entries in \`mcp_call_log\` table
- Tools logged: list_projects, get_issue, list_recent_files, trelloReadCard, etc.
- All 7 crew members registered as agents in MC
- Agent API keys minted for all 7 crew
- MC server responding on LAN (192.168.0.39:3100) and Tailscale (100.83.247.14:3100)

### What Works:
- MCP server is functional and logging calls
- CLI accessible via \`pnpm mc\` commands
- Agent-scoped API keys for least-privilege access
- Real-time activity feed and task tracking

### Notes:
- Crew needs to start using their per-agent keys instead of global key
- Global API_KEY rotated to \`e114dd20...\` (new key)`;

  await trellRequest('PUT', `/1/cards/${rolloutCardId}`, { desc: rolloutDesc });
  console.log('Updated rollout card');

  // Move to Done
  const lists = await trellRequest('GET', `/1/boards/${BOARD}/lists?fields=name,closed`);
  const doneList = lists.find(l => l.name.toLowerCase() === 'done');
  await trellRequest('PUT', `/1/cards/${rolloutCardId}`, { idList: doneList.id });
  console.log('Moved rollout card to Done');

  // Update sunset/cutover card
  const sunsetCardId = '6aa7fb09defd39491bbdaf62';
  const sunsetDesc = `## Status: [INFO] — Ready for Cutover Decision
**Verified 2026-09-17 by Sir Green**

### Current State:
- MC is fully operational (all P0/P1 cards closed)
- 33 skills registered, 439 MCP calls logged
- All 7 crew members have per-agent API keys
- Trello board has 490 open cards (excluding Done)

### Recommendation:
Set cutover date to **2026-09-24** (1 week from now). This gives:
- 1 week for crew to adopt MC task system
- Time to import high-priority Trello cards to MC
- Buffer for any remaining integration issues

### Cutover Plan:
1. Import P0/P1/P2 cards from Trello to MC /tasks
2. After cutover date, all new work goes to MC
3. Trello becomes read-only archive
4. Sunset Trello board after 30 days of MC-only operation`;

  await trellRequest('PUT', `/1/cards/${sunsetCardId}`, { desc: sunsetDesc });
  console.log('Updated sunset card');

  // Add comment to sunset card
  await trellRequest('POST', `/1/cards/${sunsetCardId}/actions/comments`, {
    text: 'MC is ready for cutover. Suggested date: 2026-09-24. All P0/P1 cards closed.'
  });
  console.log('Added comment to sunset card');
}

main().catch(console.error);
