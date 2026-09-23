const Database = require('better-sqlite3');
const db = new Database('.data/mission-control.db');

// Check MCP-related tables
const mcpLog = db.prepare('SELECT COUNT(*) as count FROM mcp_call_log').get();
console.log('MCP call log entries: ' + mcpLog.count);

// Check if MCP server is registered anywhere
const settings = db.prepare("SELECT key, value FROM settings WHERE key LIKE '%mcp%'").all();
console.log('\nMCP settings:');
settings.forEach(s => console.log(`  ${s.key}: ${s.value}`));

// Check skills table for MCP-related skills
const mcpSkills = db.prepare("SELECT name FROM skills WHERE name LIKE '%mcp%'").all();
console.log('\nMCP skills:');
mcpSkills.forEach(s => console.log(`  ${s.name}`));

// Check agent_api_keys for MCP-related scopes
const mcpKeys = db.prepare("SELECT agent_id, scopes FROM agent_api_keys WHERE scopes LIKE '%mcp%'").all();
console.log('\nAgent keys with MCP scopes:');
mcpKeys.forEach(k => console.log(`  Agent ${k.agent_id}: ${k.scopes}`));

db.close();
