const fs = require('fs')
const path = require('path')
const os = require('os')

const p = path.join(os.homedir(), '.openclaw', 'openclaw.json')
const cfg = JSON.parse(fs.readFileSync(p, 'utf8'))
console.log('tools.deny', cfg.tools?.deny)
console.log('agents.defaults.sandbox.mode', cfg.agents?.defaults?.sandbox?.mode)
