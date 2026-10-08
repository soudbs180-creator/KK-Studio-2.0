param([switch]$Desktop)

$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$source = Join-Path $PSScriptRoot 'desktop-launcher.cs'
$icon = Join-Path $projectRoot 'src-tauri\icons\icon.ico'
$executable = Join-Path $projectRoot 'KK Studio Launcher.exe'
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path -LiteralPath $compiler)) {
    $compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe'
}
foreach ($required in @($compiler, $source, $icon, (Join-Path $projectRoot 'start-kk-studio.bat'))) {
    if (-not (Test-Path -LiteralPath $required)) { throw "Required launcher input is missing: $required" }
}

$staging = Join-Path $projectRoot '.tmp\launcher'
[IO.Directory]::CreateDirectory($staging) | Out-Null
$candidate = Join-Path $staging (([Guid]::NewGuid().ToString()) + '.exe')
& $compiler /nologo /codepage:65001 /target:winexe /r:System.Windows.Forms.dll /r:System.Drawing.dll "/win32icon:$icon" "/out:$candidate" $source
if ($LASTEXITCODE -ne 0) { throw 'The GUI launcher could not be compiled. Existing shortcuts were preserved.' }
if ([IO.File]::Exists($executable)) { [IO.File]::Replace($candidate, $executable, $null) }
else { [IO.File]::Move($candidate, $executable) }

$shell = New-Object -ComObject WScript.Shell
$directories = @($projectRoot)
if ($Desktop) { $directories += [Environment]::GetFolderPath('Desktop') }
$before = foreach ($directory in $directories) {
    $link = Join-Path $directory '启动 KK Studio.lnk'
    if (Test-Path -LiteralPath $link) {
        $existing = $shell.CreateShortcut($link)
        [pscustomobject]@{ Path = $link; Target = $existing.TargetPath; Arguments = $existing.Arguments; WorkingDirectory = $existing.WorkingDirectory; Icon = $existing.IconLocation; WindowStyle = $existing.WindowStyle }
    }
}
if ($before) { $before | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $staging ('shortcuts-before-' + [DateTime]::Now.ToString('yyyyMMdd-HHmmss-fff') + '.json')) -Encoding UTF8 }
foreach ($directory in $directories) {
    $shortcut = $shell.CreateShortcut((Join-Path $directory '启动 KK Studio.lnk'))
    $shortcut.TargetPath = $executable
    $shortcut.Arguments = ''
    $shortcut.WorkingDirectory = $projectRoot
    $shortcut.IconLocation = "$executable,0"
    $shortcut.WindowStyle = 1
    $shortcut.Description = '启动 KK Studio'
    $shortcut.Save()
}
Write-Output "KK Studio launcher and shortcuts are ready: $executable"
