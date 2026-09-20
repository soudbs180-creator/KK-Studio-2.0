$ErrorActionPreference = "Stop"
$legacy = "D:\kk-studio"
$archive = "D:\KK-Studio-legacy-archive-20260909"
if ((Resolve-Path $legacy).Path -ne $legacy) { throw "legacy target mismatch" }
if (Test-Path -LiteralPath $archive) { throw "archive target already exists" }
New-Item -ItemType Directory -Path $archive | Out-Null
$failures = @()
Get-ChildItem -LiteralPath $legacy -Force | ForEach-Object {
  try { Move-Item -LiteralPath $_.FullName -Destination $archive -Force -ErrorAction Stop }
  catch { $failures += [pscustomobject]@{ Path = $_.FullName; Error = $_.Exception.Message } }
}
if ($failures.Count -eq 0) {
  Remove-Item -LiteralPath $legacy -Force
}
[pscustomobject]@{
  Archive = Test-Path $archive
  LegacyExists = Test-Path $legacy
  Remaining = @(Get-ChildItem -LiteralPath $legacy -Force -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName)
  Failures = $failures
} | ConvertTo-Json -Depth 5
