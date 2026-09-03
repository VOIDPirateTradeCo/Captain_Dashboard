import { readFileSync, writeFileSync } from 'node:fs'

const path = 'C:/Users/kidsm/Documents/My Docs/VOID Pirate Trading Co/Captain_Dashboard/mission-control/src/lib/agent-templates.ts'
const text = readFileSync(path, 'utf8')

const normalized = text.replace(
  /tokenBudget:\s*\{\s*maxContextWindow:\s*(\d+),\s*preferFree:\s*(true|false),\s*paidEscalation:\s*(true|false),\s*hardStopPaid:\s*(true|false),\s*freeModelsFirst:\s*\[([^\]]*)\],\s*fallbackModels:\s*\[([^\]]*)\],\s*\}/g,
  (match, maxContext, preferFree, paidEscalationBool, hardStopPaid, freeModelsFirst, fallbackModels) => {
    const max = Number(maxContext)
    const prefer = preferFree === 'true'
    const paidBool = paidEscalationBool === 'true'
    const hardStop = hardStopPaid === 'true'
    const free = freeModelsFirst.trim() ? freeModelsFirst.split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean) : []
    const fallback = fallbackModels.trim() ? fallbackModels.split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean) : ['openai/codex-mini-latest', 'ollama/qwen2.5-coder:14b']
    const mode = hardStop ? 'hardStopPaid' : paidBool ? 'paidEscalation' : prefer ? 'preferFree' : 'fallbackModels'
    const paidArray = paidBool ? ['anthropic/claude-sonnet-4-20250514'] : []
    return [
      'tokenBudget: {',
      `  mode: '${mode}',`,
      `  maxContextWindow: ${max},`,
      `  contextWindowHardCap: ${max},`,
      `  preferFree: ${preferFree},`,
      `  paidEscalation: ${JSON.stringify(paidArray)},`,
      `  hardStopPaid: ${hardStopPaid},`,
      `  freeModels: ${JSON.stringify(free)},`,
      `  freeModelsFirst: ${JSON.stringify(free)},`,
      `  fallbackModels: ${JSON.stringify(fallback)},`,
      '},'
    ].join('\n')
  }
)

if (normalized === text) {
  console.log('NO_CHANGES')
} else {
  writeFileSync(path, normalized)
  console.log('PATCHED')
}
