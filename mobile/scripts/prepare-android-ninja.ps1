[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$AndroidSdkRoot,
    [Parameter(Mandatory = $true)]
    [string]$NinjaExecutable
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Android's CMake 3.22.1 ships Ninja 1.10.2, which misreads long Windows paths.
# Obtain this pinned binary from the official v1.12.1 ninja-win.zip release:
# https://github.com/ninja-build/ninja/releases/tag/v1.12.1
# ZIP SHA256: F550FEC705B6D6FF58F2DB3C374C2277A37691678D6ABA463ADCBB129108467A
# Only an explicitly selected SDK is changed; preserve its original tool first.
$expectedHash = '68865C3276D449D746CEA5065FDEC2BAF755D7813E161AB04205B0907B2629B8'
$sourcePath = (Resolve-Path -LiteralPath $NinjaExecutable).Path
if ((Get-FileHash -LiteralPath $sourcePath -Algorithm SHA256).Hash -ne $expectedHash) {
    throw 'Ninja binary SHA256 does not match the pinned official Windows 1.12.1 artifact.'
}
$sourceVersion = & $sourcePath --version
if ($LASTEXITCODE -ne 0 -or $sourceVersion.Trim() -ne '1.12.1') {
    throw 'Ninja binary did not report the expected version 1.12.1.'
}

$sdkRoot = (Resolve-Path -LiteralPath $AndroidSdkRoot).Path
$targetPath = Join-Path $sdkRoot 'cmake\3.22.1\bin\ninja.exe'
if (-not (Test-Path -LiteralPath $targetPath -PathType Leaf)) {
    throw 'The selected Android SDK must already contain CMake 3.22.1 and Ninja.'
}
$originalHash = (Get-FileHash -LiteralPath $targetPath -Algorithm SHA256).Hash
$backupPath = $null
if ($originalHash -ne $expectedHash) {
    $backupPath = "$targetPath.original-$originalHash"
    if (Test-Path -LiteralPath $backupPath) {
        if ((Get-FileHash -LiteralPath $backupPath -Algorithm SHA256).Hash -ne $originalHash) {
            throw 'Existing original-tool backup does not match; refusing to overwrite it.'
        }
    } else {
        Copy-Item -LiteralPath $targetPath -Destination $backupPath
    }
    Copy-Item -LiteralPath $sourcePath -Destination $targetPath -Force
}
if ((Get-FileHash -LiteralPath $targetPath -Algorithm SHA256).Hash -ne $expectedHash) {
    throw 'Installed Ninja hash verification failed; the original remains at the reported backup path.'
}

[pscustomobject]@{
    sdkRoot = $sdkRoot
    ninjaPath = $targetPath
    ninjaVersion = $sourceVersion.Trim()
    ninjaSha256 = $expectedHash
    previousSha256 = $originalHash
    originalBackupPath = $backupPath
    alreadyPrepared = ($originalHash -eq $expectedHash)
    source = 'https://github.com/ninja-build/ninja/releases/tag/v1.12.1'
} | ConvertTo-Json
