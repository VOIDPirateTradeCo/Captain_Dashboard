const fs = require('fs');

// Read current openclaw.json for token
const ocJson = JSON.parse(fs.readFileSync('C:/Users/kidsm/.openclaw/openclaw.json', 'utf8'));
console.log('Token:', ocJson.gateway.auth.token);
console.log('Port:', ocJson.gateway.port);

// Read MC .env
const env = fs.readFileSync('.env', 'utf8');
const hasGateway = env.includes('HERMES_GATEWAY_URL');
console.log('MC .env has HERMES_GATEWAY_URL:', hasGateway);

// Add HERMES_GATEWAY_URL to MC .env if not present
if (!hasGateway) {
  const line = `\n# Gateway connection (OpenClaw)\nHERMES_GATEWAY_URL=ws://127.0.0.1:18789\n`;
  fs.appendFileSync('.env', line);
  console.log('Added HERMES_GATEWAY_URL to .env');
} else {
  console.log('Already configured');
}
