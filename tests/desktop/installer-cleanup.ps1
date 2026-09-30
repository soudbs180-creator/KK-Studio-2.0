param([Parameter(Mandatory=$true)][string]$InstallDirectory)
$ErrorActionPreference = 'Stop'
$target = [IO.Path]::GetFullPath($InstallDirectory)
$parent = [IO.Path]::GetDirectoryName($target)
if ([IO.Path]::GetFileName($target) -ne 'app' -or [IO.Path]::GetFileName($parent) -notlike 'kk-installer-audit space-*' -or -not $target.StartsWith([IO.Path]::GetFullPath([IO.Path]::GetTempPath()), [StringComparison]::OrdinalIgnoreCase)) {
  throw 'Not an owned audit installation'
}
foreach ($view in @([Microsoft.Win32.RegistryView]::Registry32, [Microsoft.Win32.RegistryView]::Registry64)) {
  $registry = [Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::CurrentUser, $view)
  try {
    $keyPath = 'Software\kkstudio\KK Studio'
    $key = $registry.OpenSubKey($keyPath)
    if ($null -eq $key) { continue }
    try {
      if ([IO.Path]::GetFullPath([string]$key.GetValue('')) -ne $target -or $key.GetSubKeyNames().Length -ne 0) { throw 'Settings are not owned by this audit' }
      foreach ($name in $key.GetValueNames()) {
        if ($name -notin @('', 'Installer Language')) { throw 'Unexpected settings; preserving them' }
      }
    } finally { $key.Dispose() }
    $registry.DeleteSubKey($keyPath, $false)
  } finally { $registry.Dispose() }
}
