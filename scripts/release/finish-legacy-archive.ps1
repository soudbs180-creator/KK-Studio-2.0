$ErrorActionPreference = "Stop"
$legacy = "D:\kk-studio"
$archive = "D:\KK-Studio-legacy-archive-20260909"
$check = "D:\kk-studio-r2-index-check"
if ((Resolve-Path $legacy).Path -ne $legacy) { throw "legacy target mismatch" }
if (Test-Path -LiteralPath $archive) { throw "archive already exists" }
Move-Item -LiteralPath $legacy -Destination $archive
if (Test-Path -LiteralPath $check) {
  if ((Get-Item -LiteralPath $check).FullName -ne $check) { throw "check target mismatch" }
  Remove-Item -LiteralPath $check -Recurse -Force
}
[pscustomobject]@{
  Archive = Test-Path $archive
  LegacyExists = Test-Path $legacy
  CheckExists = Test-Path $check
  DataBackup = Test-Path "D:\KK-Studio-user-data-backup-20260909\data"
} | Format-List
