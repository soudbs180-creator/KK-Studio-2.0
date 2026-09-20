$ErrorActionPreference = 'Stop'
$legacy = 'D:\kk-studio'
$check = 'D:\kk-studio-r2-index-check'
$archive = 'D:\KK-Studio-legacy-archive-20260909'
$dataBackup = 'D:\KK-Studio-user-data-backup-20260909\data'
$evidenceDir = Join-Path (Get-Location) 'docs\evidence\release-2026-09-09'
New-Item -ItemType Directory -Path $evidenceDir -Force | Out-Null
$archiveItems = @(Get-ChildItem -LiteralPath $archive -Force -ErrorAction SilentlyContinue)
$backupFiles = @(Get-ChildItem -LiteralPath $dataBackup -Recurse -File -ErrorAction SilentlyContinue)
$artifacts = @(
  (Join-Path (Get-Location) 'src-tauri\target\release\kk-studio.exe'),
  (Join-Path (Get-Location) 'src-tauri\target\release\bundle\msi\KK Studio_2.0.0_x64_zh-CN.msi'),
  (Join-Path (Get-Location) 'src-tauri\target\release\bundle\nsis\KK Studio_2.0.0_x64-setup.exe')
)
$result = [ordered]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString('o')
  active = (Get-Location).Path
  legacyRoot = [ordered]@{
    path = $legacy
    exists = Test-Path -LiteralPath $legacy
    childCount = @(Get-ChildItem -LiteralPath $legacy -Force -ErrorAction SilentlyContinue).Count
    removal = 'blocked-by-open-working-directory'
  }
  disposableCheck = [ordered]@{
    path = $check
    exists = Test-Path -LiteralPath $check
    expectedTarget = 'D:\kk-studio\node_modules'
  }
  rollbackArchive = [ordered]@{
    path = $archive
    exists = Test-Path -LiteralPath $archive
    topLevelCount = $archiveItems.Count
  }
  userDataBackup = [ordered]@{
    path = (Split-Path -Parent $dataBackup)
    exists = Test-Path -LiteralPath $dataBackup
    fileCount = $backupFiles.Count
  }
  clientArtifacts = @($artifacts | ForEach-Object {
    $file = Get-Item -LiteralPath $_ -ErrorAction SilentlyContinue
    [ordered]@{ path = $_; exists = $null -ne $file; length = if ($file) { $file.Length } else { $null } }
  })
  cleanup = [ordered]@{
    childrenMoved = $archiveItems.Count -gt 0 -and @(Get-ChildItem -LiteralPath $legacy -Force -ErrorAction SilentlyContinue).Count -eq 0
    disposableCheckRemoved = -not (Test-Path -LiteralPath $check)
    userDataDeleted = $false
    rollbackCommand = "Move-Item -LiteralPath '$archive' -Destination '$legacy'"
  }
}
$result | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $evidenceDir 'cleanup-result.json') -Encoding utf8
$result | ConvertTo-Json -Depth 8
