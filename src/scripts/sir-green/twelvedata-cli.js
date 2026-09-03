#!/usr/bin/env node
'use strict'

/**
 * CLI for Twelve Data integration in Mission Control.
 *
 * Usage:
 *   node twelvedata-cli.js quote --symbol BTC/USD
 *   node twelvedata-cli.js price --symbol AAPL
 *   node twelvedata-cli.js time-series --symbol EUR/USD --interval 5min
 *
 * All calls go through the local MC API route when possible,
 * falling back to direct Twelve Data if the local route is unavailable.
 */

const http = require('http')
const https = require('https')
const url = require('url')

const args = process.argv.slice(2)
if (args.length < 2) {
  console.error('Usage: node twelvedata-cli.js <command> --symbol <symbol> [--interval <interval>] [--exchange <exchange>]')
  console.error('Commands: quote, price, time-series')
  process.exit(1)
}

const command = args[0]
const params = {}
for (let i = 1; i < args.length; i++) {
  const arg = args[i]
  if (arg.startsWith('--') && i + 1 < args.length) {
    params[arg.slice(2)] = args[i + 1]
    i++
  }
}

if (!params.symbol) {
  console.error('Missing --symbol')
  process.exit(1)
}

const API_KEY = process.env.TWELVEDATA_API_KEY || (() => {
  try {
    const vaultPath = 'C:\\Users\\kidsm\\Documents\\My Docs\\VOID Pirate Trading Co\\Obsidian_Vault\\03_Business_Operations\\_Hub\\_KEY_VAULT\\secrets.env'
    const vault = require('fs').readFileSync(vaultPath, 'utf8')
    const match = vault.match(/^TWELVEDATA_API_KEY=(.+)$/m)
    return match ? match[1].trim() : ''
  } catch {
    return ''
  }
})()
const BASE = 'https://api.twelvedata.com'
const LOCAL_BASE = 'http://localhost:3000'

function request(target) {
  return new Promise((resolve, reject) => {
    const parsed = url.parse(target)
    const transport = parsed.protocol === 'https:' ? https : http
    const req = transport.request(target, { method: 'GET', timeout: 8000 }, res => {
      const chunks = []
      res.on('data', d => chunks.push(d))
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8')
        resolve({ status: res.statusCode, body })
      })
    })
    req.on('error', reject)
    req.on('timeout', () => reject(new Error('Request timed out')))
    req.end()
  })
}

async function localCall() {
  const qs = new URLSearchParams({
    symbol: params.symbol,
    type: command === 'time-series' ? 'time_series' : command,
    interval: params.interval || '1min',
    apikey: API_KEY,
    format: 'JSON',
  })
  if (params.exchange) qs.set('exchange', params.exchange)

  const target = `${LOCAL_BASE}/api/void-market?${qs.toString()}`
  const res = await request(target)
  if (res.status === 200) {
    return res.body
  }
  throw new Error(`Local MC route returned ${res.status}: ${res.body.slice(0, 200)}`)
}

async function directCall() {
  const qs = new URLSearchParams({
    symbol: params.symbol,
    interval: params.interval || '1min',
    apikey: API_KEY,
    format: 'JSON',
  })
  if (params.exchange) qs.set('exchange', params.exchange)
  const target = `${BASE}/${command}?${qs.toString()}`
  const res = await request(target)
  return res.body
}

async function main() {
  try {
    const data = await localCall()
    console.log('SOURCE=local')
    console.log(data)
  } catch (localErr) {
    console.warn(`Local route failed: ${localErr.message}`)
    try {
      const data = await directCall()
      console.log('SOURCE=direct')
      console.log(data)
    } catch (directErr) {
      console.error(`Direct Twelve Data call failed: ${directErr.message}`)
      process.exit(1)
    }
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
