import win32cred, urllib.parse, http.client, json, ssl

def cred(target):
  c = win32cred.CredRead(target, 1)
  return c['CredentialBlob'].decode('utf-16le', errors='ignore').replace('\x00', '')

key = cred('TRELLO_KEY@VOID_Pirate_Secrets')
token = cred('TRELLO_TOKEN@VOID_Pirate_Secrets')
board_id = '6a70a3157d0db4214ac3f9a3'
ctx = ssl.create_default_context()

def trello(path, method='GET', body=None):
  qs = 'key=' + urllib.parse.quote(key) + '&token=' + urllib.parse.quote(token)
  url = urllib.parse.urlparse('https://api.trello.com' + path)
  conn = http.client.HTTPSConnection(url.hostname, context=ctx)
  body_data = json.dumps(body).encode() if body else None
  headers = {'Content-Type': 'application/json'}
  if body_data:
    headers['Content-Length'] = str(len(body_data))
  conn.request(method, url.path + '?' + qs, body=body_data, headers=headers)
  r = conn.getresponse()
  data = r.read().decode()
  conn.close()
  return r.status, data

# fetch lists and labels
lists = json.loads(trello('/1/boards/' + board_id + '/lists?fields=id,name')[1])
labels = json.loads(trello('/1/boards/' + board_id + '/labels?fields=id,name')[1])
labels_map = {l['name'].lower(): l['id'] for l in labels}

inbox = next(l for l in lists if l['name'] == "Miss Pink's Inbox")
p2 = next(l for l in lists if l['name'] == 'P2 - Med High')
p1 = next(l for l in lists if l['name'] == 'P0 - Alert / Critical / Do Now')

miss_pink_label = labels_map['miss-pink']
mission_control_label = labels_map['mission control']

cards = [
  {
    'name': 'Clone Captain_Dashboard and build Mission Control on PINKCADY',
    'desc': 'Steps:\n1. Open PowerShell on PINKCADY\n2. `git clone git@github.com:VOIDPirateTradeCo/Captain_Dashboard.git`\n3. `cd Captain_Dashboard/mission-control`\n4. `npm install`\n5. `npx next build --webpack`\n6. Fix any TypeScript errors\n7. Commit locally if push fails (SQUIDSTATION push may be blocked)\n\nNote: If SSH fails, use HTTPS: `https://github.com/VOIDPirateTradeCo/Captain_Dashboard.git`',
    'idList': p2['id'],
    'idLabels': [miss_pink_label, mission_control_label]
  },
  {
    'name': 'Create PINKCADY .env pointing to master SQUIDSTATION Mission Control',
    'desc': 'On PINKCADY, create `Captain_Dashboard/mission-control/.env` with:\n\n```env\nNEXT_PUBLIC_MC_API_URL=https://192.168.0.39:3100\nMISSION_CONTROL_API_KEY=<ask captain for shared crew key>\n```\n\nAlso edit `docker-compose.crew.yml`:\n- Change all `MC_BASE` or `localhost:3100` references to `https://192.168.0.39:3100`\n- Keep PINKCADY local runtime on `localhost:3000`\n\nCommit changes locally.',
    'idList': p2['id'],
    'idLabels': [miss_pink_label, mission_control_label]
  },
  {
    'name': 'Create Torus Coffee shared vault directories on PINKCADY',
    'desc': 'Create these directories for Torus Coffee Company data:\n\n1. `PINKCADY_Shared/vault/skills` — Torus Coffee reusable skills\n2. `PINKCADY_Shared/vault/memory` — Miss Pink conversation memory\n3. `PINKCADY_Shared/vault/hive-mind` — Fleet hive state sync\n4. `PINKCADY_Shared/vault/security` — Torus Coffee credentials only\n\nIf using Docker, mount each as read-write for Miss Pink.\nIf using SMB, map `\\192.168.0.39\Backups\MissionControl\PINKCADY_Shared` to `PINKCADY_Shared`.\n\nDo NOT store secrets in git.',
    'idList': inbox['id'],
    'idLabels': [miss_pink_label, mission_control_label]
  },
  {
    'name': 'Register miss-pink agent with master Mission Control on SQUIDSTATION',
    'desc': 'From PINKCADY, run:\n\n```bash\ncurl -sS -X POST https://192.168.0.39:3100/api/agents/register \\\n  -H "Content-Type: application/json" \\\n  -H "x-api-key: $MISSION_CONTROL_API_KEY" \\\n  -d \'{\n    "agentId": "miss-pink",\n    "name": "Miss Pink",\n    "framework": "hermes",\n    "metadata": {\n      "host": "PINKCADY",\n      "scope": "torus-coffee"\n    }\n  }\'\n```\n\nThen verify on master dashboard: `https://192.168.0.39:3100/agents`\n\nExpected: Miss Pink appears in the agent list with status online.',
    'idList': p1['id'],
    'idLabels': [miss_pink_label, mission_control_label]
  },
  {
    'name': 'Configure Torus Coffee agents and free-tier model cascade on PINKCADY',
    'desc': 'Edit `mission-control/src/lib/agent-templates.ts` or agent configs to add Torus Coffee scoped agents:\n\n1. Create agent templates for Torus Coffee scope\n2. Set `tokenBudget.mode = "preferFree"` or `"hardStopPaid"` to avoid charges\n3. Set `paidEscalation` only to Claude Sonnet 4 (already paid)\n4. Set `contextWindowHardCap` to 100000 or 128000\n5. Ensure `tools.deny` includes `["group:automation", "group:runtime", "group:fs"]`\n6. Set `agents.defaults.sandbox.mode = "all"`\n7. Set `tools.profile = "coding"`\n\nRebuild after changes: `npx next build --webpack`',
    'idList': p2['id'],
    'idLabels': [miss_pink_label, mission_control_label]
  },
  {
    'name': 'Verify Miss Pink heartbeat and task feed from master Mission Control',
    'desc': '1. Start Mission Control dev server on PINKCADY: `npx next dev --hostname 127.0.0.1 --port 3000`\n2. Send heartbeat every 5 minutes:\n```bash\ncurl -sS -X POST https://192.168.0.39:3100/api/adapters \\\n  -H "Content-Type: application/json" \\\n  -H "x-api-key: $MISSION_CONTROL_API_KEY" \\\n  -d \'{"framework":"generic","action":"heartbeat","payload":{"agentId":"miss-pink","status":"online"}}\'\n```\n3. Check master dashboard shows Miss Pink online\n4. Check Torus Coffee scoped tasks appear in task feed\n5. Capture proof screenshots and post as comment on this card',
    'idList': p2['id'],
    'idLabels': [miss_pink_label, mission_control_label]
  }
]

for card in cards:
  s, d = trello('/1/cards', 'POST', card)
  print(card['name'][:60], '->', s)
