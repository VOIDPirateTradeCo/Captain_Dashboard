const path = require('path')
const fs = require('fs')

// Deploy helper: copy standalone build to a clean directory
const sourceDir = path.join(__dirname, '..', '.next', 'standalone')
const deployDir = path.join(__dirname, '..', '.next', 'standalone')

// Create temp deploy dir
const tmpDir = deployDir + '_tmp'
fs.rmSync(tmpDir, { recursive: true, force: true })
fs.mkdirSync(tmpDir, { recursive: true })

// Copy from build output
// robocopy: handles long paths (>260 chars) that xcopy cannot — the pnpm
// node_modules tree has @swc helper paths deep enough to break xcopy.
// robocopy exit codes 0-7 are success (1 = files copied); 8+ are failures.
const { execSync } = require('child_process')
try {
  execSync(`robocopy "${sourceDir}" "${tmpDir}" /E /NFL /NDL /NJH /NJS /NP`, { stdio: 'inherit' })
} catch (err) {
  if (err.status >= 8) throw err  // 8+ = real failure, 0-7 = success variants
}

// Next's output tracing misses @swc/helpers (required at runtime via
// require("@swc/helpers/_/_interop_require_default") but not statically
// traced). Copy it from the pnpm store into the standalone node_modules.
const swcHelpersSource = fs.readdirSync(path.join(__dirname, '..', 'node_modules', '.pnpm'))
  .find(d => d.startsWith('@swc+helpers@'))
if (swcHelpersSource) {
  const from = path.join(__dirname, '..', 'node_modules', '.pnpm', swcHelpersSource, 'node_modules', '@swc', 'helpers')
  const to = path.join(tmpDir, 'node_modules', '@swc', 'helpers')
  fs.mkdirSync(path.dirname(to), { recursive: true })
  try {
    execSync(`robocopy "${from}" "${to}" /E /NFL /NDL /NJH /NJS /NP`, { stdio: 'inherit' })
  } catch (err) {
    if (err.status >= 8) throw err
  }
  console.log('Copied @swc/helpers into standalone node_modules')
}

// Swap directories
try { fs.rmSync(deployDir + '_old', { recursive: true, force: true }) } catch {}
try { fs.renameSync(deployDir, deployDir + '_old') } catch {}
fs.renameSync(tmpDir, deployDir)

// FIX: server.js chdir(__dirname) sets cwd to .next/standalone/, but Next
// looks for distDir './.next' relative to cwd. Without this fix, the
// server fails with "Could not find a production build in .nextbuild".
// Set dir to project root (two levels up from deployDir).
const serverJs = path.join(deployDir, 'server.js')
let serverCode = fs.readFileSync(serverJs, 'utf8')
serverCode = serverCode.replace(
  /const dir = path\.join\(__dirname\)/,
  "const dir = path.join(__dirname, '..', '..')"
)
serverCode = serverCode.replace(
  /process\.chdir\(__dirname\)/,
  'process.chdir(dir)'
)
fs.writeFileSync(serverJs, serverCode)

console.log('Deploy complete:', deployDir)
