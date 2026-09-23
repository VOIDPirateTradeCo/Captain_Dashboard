# Evidence Template — Agent SDK Install

Copy this template, fill in your outputs, and paste as a comment on your Trello card.

```
## My Install Evidence

### Machine: [PINKCADY or STEALTHATTACK]
### Agent ID: [miss-pink or sir-azure]

### 1. Python Version
```
[Paste: python --version]
```

### 2. SDK Install
```
[Paste: pip install -e sdk/]
```

### 3. Registration Test
```
[Paste: python -c "from agents.sdk import Agent; a = Agent('[your-id]','[Your Name]','http://192.168.0.39:3100','d5136b530f878123aba1d321c6972888b5181f7f13d0afa58d55c732f0bf989f'); print('Register:', a.register([...]))"]
```
Expected: `Register: True`

### 4. Heartbeat Test
```
[Paste: python -c "from agents.sdk import Agent; a = Agent('[your-id]','[Your Name]','http://192.168.0.39:3100','d5136b530f878123aba1d321c6972888b5181f7f13d0afa58d55c732f0bf989f'); print('Heartbeat:', a.heartbeat('online'))"]
```
Expected: `Heartbeat: True`

### 5. Questions / Blockers
[List any problems — Sir Green reads these]
```
