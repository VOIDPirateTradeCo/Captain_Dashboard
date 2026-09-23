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

  // Update all free key cards with research results
  const cardIds = {
    deepseek: '6a9e1a986ada0624fb244b84',
    groq: '6a9e1a93ca04cad83522d12f',
    huggingface: '6a9e1a943d911226dc2d9a5d',
    together: '6a9e1a959a474378f3027f76',
    cohere: '6a9e1a976fa1061fe57da590',
    anthropic: '6a9e1a9343110a8b29f6cc36',
    mistral: '6a9e1a969a474378f30280a0',
    vidiq: '6a9e2971900430851e1e3316'
  };

  // DeepSeek
  await req('POST', `/1/cards/${cardIds.deepseek}/actions/comments`, { text: `## [GREEN] RESEARCH COMPLETE — ${now}
### Signup: https://platform.deepseek.com/api_keys
### Free tier: Yes (limited credits on signup)
### Models: deepseek-chat, deepseek-reasoner
### Status: Captain to sign up and provide key` });

  // Groq
  await req('POST', `/1/cards/${cardIds.groq}/actions/comments`, { text: `## [GREEN] RESEARCH COMPLETE — ${now}
### Signup: https://console.groq.com/keys
### Free tier: Yes (14,400 requests/day)
### Models: gpt-oss-120b, gpt-oss-20b, llama-3.3
### Status: Captain to sign up and provide key` });

  // HuggingFace (already have key)
  await req('POST', `/1/cards/${cardIds.huggingface}/actions/comments`, { text: `## [GREEN] CONFIGURED — ${now}
### Already have key: hf_REDACTED
### Added to openclaw.json as env source
### Working in OpenClaw gateway` });

  // Together AI
  await req('POST', `/1/cards/${cardIds.together}/actions/comments`, { text: `## [GREEN] RESEARCH COMPLETE — ${now}
### URL: https://api.together.xyz/settings/api-keys
### Free tier: No longer offers free trial (paid only)
### Recommendation: Skip — use OpenRouter instead` });

  // Cohere
  await req('POST', `/1/cards/${cardIds.cohere}/actions/comments`, { text: `## [GREEN] RESEARCH COMPLETE — ${now}
### Signup: https://dashboard.cohere.com/api-keys
### Free tier: Yes (trial key with rate limits)
### Models: command-a-03-2025, command-r
### Status: Captain to sign up and provide key` });

  // Anthropic
  await req('POST', `/1/cards/${cardIds.anthropic}/actions/comments`, { text: `## [GREEN] RESEARCH COMPLETE — ${now}
### URL: https://console.anthropic.com/settings/keys
### Free tier: No (pay-per-use only)
### Recommendation: Skip — use free alternatives` });

  // Mistral
  await req('POST', `/1/cards/${cardIds.mistral}/actions/comments`, { text: `## [GREEN] RESEARCH COMPLETE — ${now}
### Signup: https://admin.mistral.ai/organization/api-keys
### Free tier: Yes (limited credits)
### Models: mistral-large, mixtral-8x7b
### Status: Captain to sign up and provide key` });

  console.log('All Cluster 1C cards updated with research');
})().catch(e => console.error(e.message));
