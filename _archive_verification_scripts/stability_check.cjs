const fs = require('fs');
const path = 'C:/Users/kidsm/.openclaw/openclaw.json';

console.log('=== OpenClaw Config Stability Check ===');
console.log('Timestamp:', new Date().toISOString());

// Read and parse config
let raw, cfg;
try {
  raw = fs.readFileSync(path, 'utf8');
  cfg = JSON.parse(raw);
  console.log('✓ JSON valid');
} catch (e) {
  console.log('✗ JSON parse error:', e.message);
  process.exit(1);
}

// Check required fields
const checks = [
  ['meta.lastTouchedVersion', cfg.meta?.lastTouchedVersion],
  ['agents.defaults.model.primary', cfg.agents?.defaults?.model?.primary],
  ['gateway.port', cfg.gateway?.port],
  ['gateway.auth.mode', cfg.gateway?.auth?.mode],
  ['gateway.auth.token', cfg.gateway?.auth?.token?.length > 0],
  ['models.providers', Object.keys(cfg.models?.providers || {}).length > 0],
];

console.log('\n--- Field checks ---');
let pass = 0, fail = 0;
for (const [key, val] of checks) {
  const ok = val !== undefined && val !== null && val !== '';
  console.log(`${ok ? '✓' : '✗'} ${key}: ${typeof val === 'object' ? JSON.stringify(val) : val}`);
  ok ? pass++ : fail++;
}

// Check provider configs
console.log('\n--- Provider checks ---');
const providers = cfg.models?.providers || {};
for (const [name, p] of Object.entries(providers)) {
  const hasKey = p.apiKey?.source === 'env' || (typeof p.apiKey === 'string' && p.apiKey.length > 0);
  const models = p.models?.length || 0;
  console.log(`  ${name}: apiKey=${hasKey ? 'env/ok' : 'MISSING'}, models=${models}`);
}

// Check for secrets in plaintext
console.log('\n--- Secret scan ---');
const secrets = ['vidIQ', 'Authorization', 'Bearer'];
for (const s of secrets) {
  if (raw.includes(s)) {
    console.log(`  ⚠ Found "${s}" in config (may be secret)`);
  }
}

console.log(`\nResult: ${pass} pass, ${fail} fail`);
