import https from 'node:https';

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7';
const TOKEN = 'ATTA74d859c8715f3a7ed75198d2a6e2dfa7515f0a6cc84b7df07b4e44c8553620f7BE26472F';
const CARDS = [
  {
    id: '6a996067c9ed9905f75d0e20',
    name: 'headscale',
    text: `Headscale ship onboarding - verified master state
- Master container: Up 46m on 0.0.0.0:8080/3478/udp
- VOID namespace: created
- Preauth key: reusable, expires 2027-09-03
Ship commands for Sir Azure:
- powershell.exe -File bootstrap-stealthattack.ps1 -McApiKey YOUR_KEY
- Or run install-headscale-client.bat, then tailscale up --authkey YOUR_PREAUTH
Verify in card output: HEADSCALE_PREAUTH + tailscale ip -4
Next master check: ensure ship appears in headscale nodes list -n VOID`,
  },
  {
    id: '6a996068a8497554381be364',
    name: 'netbird',
    text: `NetBird ship onboarding
- Master container: netbird_mgmt Up
- Activation completed by captain: https://login.netbird.io/activate?user_code=HQCZ-HSZF
Ship commands for Miss Pink:
1. powershell.exe -File bootstrap-pinkcady.ps1 -McApiKey YOUR_KEY
2. Install NetBird client, netbird up
3. verify-mesh.bat
Evidence needed: netbird status + ping 192.168.0.39 from ship`,
  },
  {
    id: '6a9960692a5680f6b1527b51',
    name: 'netmaker',
    text: `Netmaker tertiary fallback
- Master container: running on 0.0.0.0:8082
- Fleet issue: profile creation blocked on fleet machines
Decision: do not block primary mesh on Netmaker. Use only if Headscale/NetBird both fail.`,
  },
];

function request({ path, method, body }) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request(
      {
        hostname: 'api.trello.com',
        path: `/1/cards${path}?key=${KEY}&token=${TOKEN}`,
        method,
        headers: {
          Accept: 'application/json',
          ...(data ? { 'Content-Type': 'application/json' } : {}),
        },
      },
      res => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
          catch { resolve({ status: res.statusCode, body: raw }); }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  for (const card of CARDS) {
    const res = await request({
      path: `/${card.id}/actions/comments`,
      method: 'POST',
      body: { text: card.text },
    });
    console.log(`${card.name}: ${res.status} ${res.body.id ? 'OK id=' + res.body.id : JSON.stringify(res.body).slice(0, 200)}`);
  }
})();
