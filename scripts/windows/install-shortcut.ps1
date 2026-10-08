param([switch]$Desktop)

$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$source = Join-Path $PSScriptRoot 'desktop-launcher.cs'
$shortcutSource = Join-Path $PSScriptRoot 'unicode-shortcut.cs'
$icon = Join-Path $projectRoot 'src-tauri\icons\icon.ico'
$executable = Join-Path $projectRoot 'KK Studio Launcher.exe'
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path -LiteralPath $compiler)) {
    $compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe'
}
foreach ($required in @($compiler, $source, $shortcutSource, $icon, (Join-Path $projectRoot 'start-kk-studio.bat'))) {
    if (-not (Test-Path -LiteralPath $required)) { throw "Required launcher input is missing: $required" }
}

$staging = Join-Path $projectRoot '.tmp\launcher'
[IO.Directory]::CreateDirectory($staging) | Out-Null
$candidate = Join-Path $staging (([Guid]::NewGuid().ToString()) + '.exe')
& $compiler /nologo /codepage:65001 /target:winexe /r:System.Windows.Forms.dll /r:System.Drawing.dll "/win32icon:$icon" "/out:$candidate" $source
if ($LASTEXITCODE -ne 0) { throw 'The GUI launcher could not be compiled. Existing shortcuts were preserved.' }
if ([IO.File]::Exists($executable)) { [IO.File]::Replace($candidate, $executable, [NullString]::Value) }
else { [IO.File]::Move($candidate, $executable) }

if (-not ('KKUnicodeShortcut' -as [Type])) { Add-Type -TypeDefinition ([IO.File]::ReadAllText($shortcutSource)) }
$directories = @($projectRoot)
if ($Desktop) { $directories += [Environment]::GetFolderPath('Desktop') }
$before = foreach ($directory in $directories) {
    $link = Join-Path $directory '启动 KK Studio.lnk'
    if (Test-Path -LiteralPath $link) {
        [KKUnicodeShortcut]::Read($link)
    }
}
if ($before) { $before | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $staging ('shortcuts-before-' + [DateTime]::Now.ToString('yyyyMMdd-HHmmss-fff') + '.json')) -Encoding UTF8 }
foreach ($directory in $directories) {
    [KKUnicodeShortcut]::Write((Join-Path $directory '启动 KK Studio.lnk'), $executable, $projectRoot, '启动 KK Studio')
}
Write-Output "KK Studio launcher and shortcuts are ready: $executable"
