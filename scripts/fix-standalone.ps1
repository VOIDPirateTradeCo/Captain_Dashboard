# fix-standalone.ps1 — run after every `pnpm build`
# 1. Patches .next/standalone/server.js: chdir to project root
#    (Next emits chdir(__dirname) which breaks distDir resolution)
# 2. Copies @swc/helpers into standalone node_modules
#    (Next's output tracing misses it; runtime require fails without it)

$mcDir = "C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Captain_Dashboard\mission-control"
$serverJs = "$mcDir\.next\standalone\server.js"

if (-not (Test-Path $serverJs)) { Write-Host "FATAL: server.js not found - run pnpm build first"; exit 1 }

# 1. Patch server.js
$q = [char]39  # single quote
$code = Get-Content $serverJs -Raw
$orig = $code
$code = $code.Replace('const dir = path.join(__dirname)', "const dir = path.join(__dirname, $q..$q, $q..$q)")
$code = $code.Replace('process.chdir(__dirname)', 'process.chdir(dir)')
if ($code -ne $orig) {
    Set-Content -Path $serverJs -Value $code -NoNewline
    Write-Host "server.js: chdir patch applied"
} else {
    Write-Host "server.js: already patched (or pattern changed)"
}

# 2. Copy @swc/helpers from pnpm store
$pnpmDir = Get-ChildItem "$mcDir\node_modules\.pnpm" -Directory -Filter "@swc+helpers@*" | Select-Object -First 1
if ($pnpmDir) {
    $src = Join-Path $pnpmDir.FullName "node_modules\@swc\helpers"
    $dst = "$mcDir\.next\standalone\node_modules\@swc\helpers"
    if (Test-Path $dst) {
        Write-Host "@swc/helpers: already present"
    } else {
        New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
        robocopy $src $dst /E /NFL /NDL /NJH /NJS /NP | Out-Null
        if ($LASTEXITCODE -lt 8) { Write-Host "@swc/helpers: copied" } else { Write-Host "@swc/helpers: robocopy FAILED ($LASTEXITCODE)"; exit 1 }
    }
} else {
    Write-Host "WARN: @swc+helpers not found in pnpm store"
}

Write-Host "fix-standalone: done"
