$ErrorActionPreference = 'Stop'
$prerequisite = Get-Content -LiteralPath (Join-Path $PSScriptRoot '../../.github/scripts/ensure-webview2.ps1') -Raw

function Test-Prerequisite {
    param($Case)
    $script:Fixture = $Case
    $script:Downloads = 0
    $script:Starts = 0
    $script:InstallationRequested = $false
    $script:EnvironmentReceipt = $null
    $savedEnvironment = @{}
    foreach ($name in @('RUNNER_TEMP', 'GITHUB_ACTIONS', 'RUNNER_ENVIRONMENT', 'GITHUB_ENV')) {
        $savedEnvironment[$name] = [Environment]::GetEnvironmentVariable($name)
    }
    $env:RUNNER_TEMP = 'C:\isolated-fixture'
    $env:GITHUB_ACTIONS = $Case.Actions
    $env:RUNNER_ENVIRONMENT = $Case.Runner
    $env:GITHUB_ENV = 'C:\fixture-env'

    # Shadow all external effects: these cases never read a real registry,
    # download software, run an installer, or write a workflow environment file.
    function Get-ItemProperty {
        param($LiteralPath, $Name, $ErrorAction)
        if ($script:Fixture.Installed -or ($script:InstallationRequested -and $script:Fixture.RegisteredAfter)) {
            return @{ pv = '154.0.4258.62' }
        }
        return @{ pv = $script:Fixture.InvalidVersion }
    }
    function Invoke-WebRequest {
        param($Uri, $OutFile, $TimeoutSec)
        if ($Uri -ne 'https://go.microsoft.com/fwlink/p/?LinkId=2124703' -or $TimeoutSec -ne 60) { throw 'Unexpected download contract.' }
        $script:Downloads++
    }
    function Get-AuthenticodeSignature {
        param($LiteralPath)
        return @{ Status = $script:Fixture.Signature; SignerCertificate = @{ Subject = $script:Fixture.Subject } }
    }
    function Start-Process {
        param($FilePath, $ArgumentList, $WindowStyle, [switch]$PassThru)
        if ($WindowStyle -ne 'Hidden' -or ($ArgumentList -join ' ') -ne '/silent /install') { throw 'Unexpected installer contract.' }
        $script:Starts++
        $script:InstallationRequested = $true
        $process = [pscustomobject]@{ ExitCode = $script:Fixture.ExitCode }
        $process | Add-Member -MemberType ScriptMethod -Name WaitForExit -Value {
            param($Timeout)
            if ($Timeout -ne 120000) { throw 'Unexpected installer timeout.' }
            return $script:Fixture.Finished
        }
        return $process
    }
    function Out-File {
        param([Parameter(ValueFromPipeline)]$InputObject, $LiteralPath, $Encoding, [switch]$Append)
        process { $script:EnvironmentReceipt = $InputObject }
    }
    $failure = $null
    try { & ([scriptblock]::Create($prerequisite)) | Out-Null }
    catch { $failure = $_.Exception.Message }
    finally {
        foreach ($name in $savedEnvironment.Keys) { [Environment]::SetEnvironmentVariable($name, $savedEnvironment[$name]) }
    }
    if ([bool]$failure -ne $Case.Fails -or $script:Downloads -ne $Case.Downloads -or $script:Starts -ne $Case.Starts) {
        throw "$($Case.Name): failure=$failure downloads=$script:Downloads starts=$script:Starts"
    }
    if ($Case.Fails -and $script:EnvironmentReceipt) { throw "$($Case.Name): failed setup must not advertise readiness." }
    if (-not $Case.Fails -and $script:EnvironmentReceipt -ne 'KK_WEBVIEW2_RUNTIME_VERSION=154.0.4258.62') { throw "$($Case.Name): readiness receipt missing." }
    Write-Output "PASS $($Case.Name)"
}

$defaults = @{
    Actions = 'true'; Runner = 'github-hosted'; Installed = $false
    Signature = 'Valid'; Subject = 'CN=Microsoft Corporation, O=Microsoft Corporation, C=US'
    RegisteredAfter = $true; Finished = $true; ExitCode = 0; InvalidVersion = $null
    Fails = $false; Downloads = 1; Starts = 1
}
$cases = @(
    @{ Name = 'installed-local-runtime'; Actions = ''; Runner = ''; Installed = $true; Downloads = 0; Starts = 0 },
    @{ Name = 'missing-local-runtime'; Actions = ''; Runner = ''; Fails = $true; Downloads = 0; Starts = 0 },
    @{ Name = 'missing-self-hosted-runtime'; Runner = 'self-hosted'; Fails = $true; Downloads = 0; Starts = 0 },
    @{ Name = 'missing-runner-identity'; Runner = ''; Fails = $true; Downloads = 0; Starts = 0 },
    @{ Name = 'official-hosted-install' },
    @{ Name = 'zero-version-is-missing'; InvalidVersion = '0.0.0.0' },
    @{ Name = 'invalid-signature'; Signature = 'NotSigned'; Fails = $true; Starts = 0 },
    @{ Name = 'other-publisher'; Subject = 'CN=Example, O=Example'; Fails = $true; Starts = 0 },
    @{ Name = 'publisher-prefix-spoof'; Subject = 'CN=Example, O=Microsoft Corporation Example, C=US'; Fails = $true; Starts = 0 },
    @{ Name = 'publisher-suffix-spoof'; Subject = 'CN=Example, O=Example Microsoft Corporation, C=US'; Fails = $true; Starts = 0 },
    @{ Name = 'install-nonzero'; ExitCode = 1; Fails = $true },
    @{ Name = 'install-timeout'; Finished = $false; Fails = $true },
    @{ Name = 'installed-version-still-missing'; RegisteredAfter = $false; Fails = $true }
)
foreach ($overrides in $cases) {
    $case = $defaults.Clone()
    foreach ($name in $overrides.Keys) { $case[$name] = $overrides[$name] }
    Test-Prerequisite $case
}
