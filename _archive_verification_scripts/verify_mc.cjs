const https = require('https');

(async () => {
  // Login
  const loginRes = await fetch('http://127.0.0.1:3100/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'captain', password: 'voidcaptain2026' })
  });
  const cookies = loginRes.headers.get('set-cookie');
  
  // Test gateway health
  const healthRes = await fetch('http://127.0.0.1:3100/api/gateways', {
    headers: { cookie: cookies }
  });
  const health = await healthRes.json();
  console.log('Gateways:', JSON.stringify(health, null, 2));
  
  // Test agents
  const agentsRes = await fetch('http://127.0.0.1:3100/api/agents', {
    headers: { cookie: cookies }
  });
  const agents = await agentsRes.json();
  console.log(`Agents: ${agents.agents?.length || 0} total`);
})();
