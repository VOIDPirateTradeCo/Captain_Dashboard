const http = require('http')
const fs = require('fs')
const path = require('path')

const proofsDir = path.resolve('src/scripts/sir-green/proofs')
fs.mkdirSync(proofsDir, { recursive: true })

const cookie = 'mc-session=efe705c69a708c8001533e64bb1d103311f485ada42eb8c79e1ffcc...[truncated]