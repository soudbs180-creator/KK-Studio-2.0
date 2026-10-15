param([Parameter(Mandatory = $true)][string]$ReceiptPath)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# Elevated WebView2 ignores environment and HKCU overrides. Match the proven
# TaskHost policy boundary, only in the ephemeral GitHub-hosted Windows job.
if ($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted' -or -not $env:RUNNER_TEMP) {
    throw 'Installer CI policy preparation requires the GitHub-hosted runner identity.'
}
if (-not [Environment]::Is64BitProcess -or -not (Test-Path -LiteralPath $env:RUNNER_TEMP -PathType Container)) {
    throw 'Installer CI requires 64-bit PowerShell and the existing runner temporary directory.'
}
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
if ($identity.User.Value -eq "S-1-5-18") { throw "WebView2 cannot run as SYSTEM." }
$elevated = ([Security.Principal.WindowsPrincipal]::new($identity)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
$profile = Join-Path ([IO.Path]::GetFullPath($env:RUNNER_TEMP)) ('kk-installer-profile-' + [guid]::NewGuid().ToString('N'))
if (Test-Path -LiteralPath $profile) { throw 'Installer CI profile must be a fresh run-specific directory.' }
$appName = 'kk-studio.exe'
$policies = @(
    @{ Path = 'HKLM:\SOFTWARE\Policies\Microsoft\Edge\WebView2\AdditionalBrowserArguments'; Value = '--remote-debugging-port=9358 --remote-debugging-address=127.0.0.1 --host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE tauri.localhost, EXCLUDE localhost, EXCLUDE 127.0.0.1' },
    @{ Path = 'HKLM:\SOFTWARE\Policies\Microsoft\Edge\WebView2\UserDataFolder'; Value = $profile }
)
$owned = [Collections.Generic.List[string]]::new()
$savedEnvironment = @{}
foreach ($name in @('KK_INSTALLER_PROFILE', 'KK_INSTALLER_ELEVATED')) {
    $savedEnvironment[$name] = [Environment]::GetEnvironmentVariable($name)
}
$runFailure = $null
$cleanupFailures = [Collections.Generic.List[string]]::new()
try {
    if ($elevated) {
        # Preflight both policy keys. Existing app, wildcard, AppId or empty
        # values belong to another setup and must never be replaced.
        foreach ($policy in $policies) {
            if (Test-Path -LiteralPath $policy.Path) {
                $properties = Get-ItemProperty -LiteralPath $policy.Path
                if (@($properties.PSObject.Properties | Where-Object { $_.Name -notin @('PSPath', 'PSParentPath', 'PSChildName', 'PSDrive', 'PSProvider') }).Count) {
                    throw 'Existing WebView2 policy values must remain untouched, including higher-priority AppId overrides.'
                }
            }
        }
        foreach ($policy in $policies) {
            # Registry New-Item -Force can delete an existing key recursively.
            # Create each absent ancestor without Force and fail on a race.
            $currentPath = 'HKLM:'
            foreach ($segment in $policy.Path.Substring('HKLM:\'.Length).Split('\')) {
                $currentPath += '\' + $segment
                if (-not (Test-Path -LiteralPath $currentPath)) {
                    New-Item -Path $currentPath -ErrorAction Stop | Out-Null
                }
            }
            $properties = Get-ItemProperty -LiteralPath $policy.Path
            if (@($properties.PSObject.Properties | Where-Object { $_.Name -notin @('PSPath', 'PSParentPath', 'PSChildName', 'PSDrive', 'PSProvider') }).Count) {
                throw 'WebView2 policy appeared during preparation; preserve it and fail closed.'
            }
            # A successful write alone establishes ownership for cleanup.
            New-ItemProperty -LiteralPath $policy.Path -Name $appName -Value $policy.Value -PropertyType String | Out-Null
            $owned.Add($policy.Path)
            if ((Get-ItemPropertyValue -LiteralPath $policy.Path -Name $appName) -cne $policy.Value) {
                throw 'Installer CI WebView2 policy readback did not match.'
            }
        }
    }
    $env:KK_INSTALLER_PROFILE = $profile
    $env:KK_INSTALLER_ELEVATED = $elevated.ToString().ToLowerInvariant()
    Write-Output ('Installer host elevated: ' + $env:KK_INSTALLER_ELEVATED + '; app-specific policy: ' + $elevated + '; profile: ' + $profile)
    & npm.cmd run client:installer:test -- $ReceiptPath
    if ($LASTEXITCODE -ne 0) { throw ('Installer lifecycle failed with exit code ' + $LASTEXITCODE) }
} catch {
    $runFailure = $_
} finally {
    foreach ($policyPath in $owned) {
        try {
            $properties = Get-ItemProperty -LiteralPath $policyPath
            if (@($properties.PSObject.Properties | Where-Object { $_.Name -eq $appName }).Count) {
                $expected = ($policies | Where-Object { $_.Path -eq $policyPath }).Value
                if ((Get-ItemPropertyValue -LiteralPath $policyPath -Name $appName) -cne $expected) {
                    throw 'Owned app policy changed; preserve it for inspection.'
                }
                Remove-ItemProperty -LiteralPath $policyPath -Name $appName
            }
            $remaining = Get-ItemProperty -LiteralPath $policyPath
            if (@($remaining.PSObject.Properties | Where-Object { $_.Name -eq $appName }).Count) {
                throw 'Owned app policy was not removed.'
            }
        } catch { $cleanupFailures.Add($_.Exception.Message) }
    }
    foreach ($name in $savedEnvironment.Keys) {
        [Environment]::SetEnvironmentVariable($name, $savedEnvironment[$name])
    }
}
if ($cleanupFailures.Count) { throw ('Installer CI policy cleanup failed: ' + ($cleanupFailures -join '; ')) }
if ($runFailure) { throw $runFailure }
Write-Output 'Installer CI app-specific policies removed; lifecycle passed.'
