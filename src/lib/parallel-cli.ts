import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface ParallelCliParams {
  mode: 'search' | 'extract' | 'research'
  query: string
  urls?: string[]
  depth?: 'quick' | 'standard' | 'deep'
}

export async function runParallelCli(params: ParallelCliParams): Promise<unknown> {
  const { mode, query, urls, depth = 'standard' } = params

  // If parallel-cli (belt) is not installed, return a graceful response
  try {
    await execAsync('where belt 2>nul || which belt 2>/dev/null')
  } catch {
    return {
      status: 'unavailable',
      reason: 'parallel-cli (belt) not installed on this host',
      install: 'curl -fsSL https://cli.inference.sh | sh',
    }
  }

  const args = [mode, `"${query}"`]
  if (urls?.length) args.push('--urls', urls.join(','))
  if (depth !== 'standard') args.push('--depth', depth)

  try {
    const { stdout } = await execAsync(`belt ${args.join(' ')}`, { timeout: 30000 })
    return { status: 'ok', output: stdout }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`parallel-cli ${mode} failed: ${message}`, { cause: err })
  }
}
