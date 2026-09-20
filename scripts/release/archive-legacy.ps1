$ErrorActionPreference = "Stop"
$legacy = "D:\kk-studio"
$active = "D:\kk-studio-next"
$check = "D:\kk-studio-r2-index-check"
$archive = "D:\KK-Studio-legacy-archive-20260909"
$dataBackup = "D:\KK-Studio-user-data-backup-20260909"
if ((Resolve-Path $legacy).Path -ne $legacy) { throw "legacy target mismatch" }
if ((Resolve-Path $active).Path -ne $active) { throw "active target mismatch" }
if (Test-Path -LiteralPath $archive) { throw "archive target already exists" }
if (Test-Path -LiteralPath $dataBackup) { throw "data backup target already exists" }
New-Item -ItemType Directory -Path $dataBackup | Out-Null
Copy-Item -LiteralPath "$legacy\data" -Destination $dataBackup -Recurse -Force
$manifest = [ordered]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  active = $active
  legacy = $legacy
  archive = $archive
  dataBackup = $dataBackup
  check = $check
  authorization = "用户明确要求清理之前版本；历史实现与用户数据先备份后归档"
  recovery = "Move-Item -LiteralPath '$archive' -Destination '$legacy'"
  dataFiles = @(Get-ChildItem "$dataBackup\data" -Recurse -File | ForEach-Object {
    [ordered]@{ path = $_.FullName.Substring($dataBackup.Length + 1); length = $_.Length; sha256 = (Get-FileHash $_.FullName -Algorithm SHA256).Hash }
  })
}
$evidenceDir = Join-Path $active "docs\evidence\release-2026-09-09"
New-Item -ItemType Directory -Path $evidenceDir -Force | Out-Null
$manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $evidenceDir "legacy-cleanup-manifest.json") -Encoding UTF8
Move-Item -LiteralPath $legacy -Destination $archive
if (Test-Path -LiteralPath $check) {
  if ((Get-Item -LiteralPath $check).FullName -ne $check) { throw "check target mismatch" }
  Remove-Item -LiteralPath $check -Recurse -Force
}
[pscustomobject]@{
  Archive = Test-Path $archive
  LegacyExists = Test-Path $legacy
  DataBackup = Test-Path $dataBackup
  CheckExists = Test-Path $check
  Evidence = Test-Path (Join-Path $evidenceDir "legacy-cleanup-manifest.json")
} | Format-List
