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

  // Update "Provide 7 free API keys" card with summary
  await req('POST', '/1/cards/6aa06b3bbf5eb9ed440fc757/actions/comments', { text: `## [GREEN] RESEARCH COMPLETE — ${now}
### Free API Key Providers Found:

| Provider | Free? | URL |
|---|---|---|
| HuggingFace | ✅ Already have | hf_REDACTED |
| DeepSeek | ✅ Limited credits | https://platform.deepseek.com/api_keys |
| Groq | ✅ 14,400 req/day | https://console.groq.com/keys |
| Mistral | ✅ Limited credits | https://admin.mistral.ai/organization/api-keys |
| Cohere | ✅ Trial key | https://dashboard.cohere.com/api-keys |
| OpenRouter | ✅ Some free models | https://openrouter.ai/keys |
| Together AI | ❌ Paid only | Skip |
| Anthropic | ❌ Paid only | Skip |

### Recommended priority:
1. **HuggingFace** — already configured ✓
2. **Groq** — generous free tier
3. **DeepSeek** — good free credits
4. **Mistral** — limited free tier
5. **Cohere** — trial key

Captain to provide keys from above URLs.` });

  console.log('Captain key card updated');
})().catch(e => console.error(e.message));
