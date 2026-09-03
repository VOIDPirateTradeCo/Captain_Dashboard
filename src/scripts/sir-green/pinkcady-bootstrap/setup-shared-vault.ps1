# setup-shared-vault.ps1
# Run this on PINKCADY to create Torus Coffee shared vault directories
$ErrorActionPreference = 'Stop'
$base = Join-Path $PWD 'PINKCADY_Shared'
$dirs = @(
  'vault/skills',
  'vault/memory',
  'vault/hive-mind',
  'vault/security'
)
foreach ($d in $dirs) {
  $path = Join-Path $base $d
  if (-not (Test-Path $path)) {
    New-Item -ItemType Directory -Path $path -Force | Out-Null
    Write-Host "CREATED: $path"
  } else {
    Write-Host "EXISTS: $path"
  }
}
Write-Host '---'
Write-Host 'PINKCADY shared vault layout ready.'
Write-Host 'Next: mount these into Docker or map SMB share.'
