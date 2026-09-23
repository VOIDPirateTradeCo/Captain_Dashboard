# Fleet Memory Pusher — runs on each remote PC (PINKCADY, STEALTHATTACK)
# Pushes this machine's Hermes memory files + conversation FTS export to MC on SQUIDSTATION.
# Schedule: Task Scheduler, every 6h. Runs hidden via pythonw.
#
# Config via env or defaults below:
#   MC_URL       — Mission Control base URL (default http://100.83.247.14:3100)
#   AGENT_NAME   — this agent's fleet name (default: miss-pink on PINKCADY, sir-azure on STEALTHATTACK)
#   HERMES_DIR   — Hermes data dir (default %LOCALAPPDATA%\hermes)

param(
    [string]$McUrl = "http://100.83.247.14:3100",
    [string]$AgentName = "miss-pink",
    [string]$HermesDir = "$env:LOCALAPPDATA\hermes",
    [string]$ApiKey = ""
)

# API key: from param, or from local MC_API_KEY env, or from the key file
# written next to the Hermes dir during deploy, or from the vault secrets file
if (-not $ApiKey) {
    $ApiKey = $env:MC_API_KEY
}
if (-not $ApiKey) {
    $keyFile = "$HermesDir\mc-api-key.txt"
    if (Test-Path $keyFile) { $ApiKey = (Get-Content $keyFile -First 1).Trim() }
}
if (-not $ApiKey) {
    $vaultSecrets = "C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Obsidian_Vault\03_Business_Operations\_Hub\_KEY_VAULT\secrets.env"
    if (Test-Path $vaultSecrets) {
        $line = Select-String -Path $vaultSecrets -Pattern "^MC_API_KEY=" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($line) { $ApiKey = $line.Line -replace "^MC_API_KEY=", "" }
    }
}
if (-not $ApiKey) { Write-Log "FATAL: no MC API key found (param, env MC_API_KEY, key file, or vault secrets.env)"; exit 1 }

$headers = @{ "x-api-key" = $ApiKey }

$ErrorActionPreference = "Continue"
$log = "$HermesDir\logs\fleet-push.log"
New-Item -ItemType Directory -Force -Path (Split-Path $log) | Out-Null

function Write-Log($msg) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $log -Value "$ts [$AgentName] $msg"
}

Write-Log "=== fleet push start ==="

# 1. Push MEMORY.md + USER.md via MC ingest (multipart POST to /api/fleet-memory/ingest)
$memFiles = @(
    @{ Local = "$HermesDir\memories\MEMORY.md"; Remote = "MEMORY.md" },
    @{ Local = "$HermesDir\memories\USER.md"; Remote = "USER.md" }
)

foreach ($f in $memFiles) {
    if (Test-Path $f.Local) {
        try {
            # MC ingest endpoint accepts raw file body with ?agent= &file= query params
            $bytes = [System.IO.File]::ReadAllBytes($f.Local)
            $uri = "$McUrl/api/fleet-memory/ingest?agent=$AgentName&file=$($f.Remote)"
            $resp = Invoke-WebRequest -Uri $uri -Method Post -Body $bytes -ContentType "text/markdown" -Headers $headers -UseBasicParsing -TimeoutSec 30
            Write-Log "pushed $($f.Remote): HTTP $($resp.StatusCode)"
        } catch {
            Write-Log "FAILED push $($f.Remote): $($_.Exception.Message)"
        }
    } else {
        Write-Log "skip $($f.Remote): not found"
    }
}

# 2. Export conversation FTS snapshot (last 90 days) to a portable SQLite, push it
try {
    $py = "$HermesDir\hermes-agent\.hermes-runtime\python\cpython-3.11-windows-x86_64-none\python.exe"
    if (-not (Test-Path $py)) { $py = "python" }
    $exportDb = "$env:TEMP\mc-conv-$AgentName.db"
    $code = @"
import sqlite3, os, time
# Delete stale export first: IF NOT EXISTS + OR REPLACE would keep old rows forever
export_path = r'$exportDb'
if os.path.exists(export_path):
    os.remove(export_path)
src = sqlite3.connect(r'$HermesDir\state.db')
dst = sqlite3.connect(export_path)
dst.execute('CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY, session_id TEXT, role TEXT, content TEXT, timestamp REAL)')
dst.execute('CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, title TEXT, display_name TEXT, started_at REAL)')
# 30-day window keeps the export under MC's ingest limits (90d blew past 200MB for large corpora)
# Only user + assistant messages: tool outputs are ~80% of bulk and not useful for conversation search
cutoff = time.time() - 30*86400
rows = src.execute('SELECT id, session_id, role, content, timestamp FROM messages WHERE timestamp >= ? AND role IN (\'user\', \'assistant\') AND content IS NOT NULL AND length(content) > 0', (cutoff,)).fetchall()
dst.executemany('INSERT OR REPLACE INTO messages VALUES (?,?,?,?,?)', rows)
sess = src.execute('SELECT id, title, display_name, started_at FROM sessions WHERE started_at >= ?', (cutoff,)).fetchall()
dst.executemany('INSERT OR REPLACE INTO sessions VALUES (?,?,?,?)', sess)
dst.commit()
# Build FTS index so MC's /api/conversations can search this export directly
dst.execute('CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(content, content=messages, content_rowid=id)')
dst.execute('INSERT INTO messages_fts(messages_fts) VALUES(\'rebuild\')')
dst.commit()
dst.execute('VACUUM')
print(f'exported {len(rows)} messages, {len(sess)} sessions')
"@
    & $py -c $code
    if (Test-Path $exportDb) {
        # Gzip the export: SQLite text compresses ~8x, keeps POST well under limits
        $gzPath = "$exportDb.gz"
        $inStream = [System.IO.File]::OpenRead($exportDb)
        $outStream = [System.IO.File]::Create($gzPath)
        $gzStream = New-Object System.IO.Compression.GZipStream($outStream, [System.IO.Compression.CompressionLevel]::Fastest)
        $inStream.CopyTo($gzStream)
        $gzStream.Close(); $outStream.Close(); $inStream.Close()
        $bytes = [System.IO.File]::ReadAllBytes($gzPath)
        Write-Log "export gzipped: $((Get-Item $gzPath).Length) bytes (from $((Get-Item $exportDb).Length))"
        $uri = "$McUrl/api/fleet-memory/ingest-conversations?agent=$AgentName"
        $resp = Invoke-WebRequest -Uri $uri -Method Post -Body $bytes -ContentType "application/gzip" -Headers $headers -UseBasicParsing -TimeoutSec 600
        Write-Log "pushed conversations export: HTTP $($resp.StatusCode)"
        Remove-Item $exportDb, $gzPath -Force -ErrorAction SilentlyContinue
    }
} catch {
    Write-Log "FAILED conversation export: $($_.Exception.Message)"
}

Write-Log "=== fleet push done ==="
