param([Parameter(Mandatory=$true)][string]$ProductName)
$ErrorActionPreference = 'Stop'
$entries = @()
foreach ($hive in @([Microsoft.Win32.RegistryHive]::CurrentUser, [Microsoft.Win32.RegistryHive]::LocalMachine)) {
  foreach ($view in @([Microsoft.Win32.RegistryView]::Registry32, [Microsoft.Win32.RegistryView]::Registry64)) {
    $registry = [Microsoft.Win32.RegistryKey]::OpenBaseKey($hive, $view)
    try {
      $uninstall = $registry.OpenSubKey('Software\Microsoft\Windows\CurrentVersion\Uninstall')
      if ($null -ne $uninstall) {
        try {
          foreach ($keyName in $uninstall.GetSubKeyNames()) {
            $key = $uninstall.OpenSubKey($keyName)
            if ($null -eq $key) { continue }
            try {
              if ($keyName -eq $ProductName -or $key.GetValue('DisplayName') -eq $ProductName) {
                $entries += [PSCustomObject]@{
                  kind = 'uninstall'
                  hive = $hive.ToString()
                  view = $view.ToString()
                  location = $key.GetValue('InstallLocation')
                  version = $key.GetValue('DisplayVersion')
                }
              }
            } finally { $key.Dispose() }
          }
        } finally { $uninstall.Dispose() }
      }
      $settingsKey = $registry.OpenSubKey("Software\kkstudio\$ProductName")
      if ($null -ne $settingsKey) {
        try {
          $entries += [PSCustomObject]@{
            kind = 'settings'
            hive = $hive.ToString()
            view = $view.ToString()
            location = $settingsKey.GetValue('')
          }
        } finally { $settingsKey.Dispose() }
      }
    } finally { $registry.Dispose() }
  }
}
foreach ($process in @(Get-Process -Name 'kk-studio' -ErrorAction SilentlyContinue)) {
  $entries += [PSCustomObject]@{kind = 'process'; pid = $process.Id}
}
ConvertTo-Json -InputObject @($entries) -Compress
