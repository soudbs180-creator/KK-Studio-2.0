$ErrorActionPreference = 'Stop'
$source = Get-Content -LiteralPath (Join-Path $PSScriptRoot '../../.github/scripts/invoke-native-taskhost.ps1') -Raw
$identityLine = '$identity = [Security.Principal.WindowsIdentity]::GetCurrent()'
$elevatedLine = '$elevated = ([Security.Principal.WindowsPrincipal]::new($identity)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)'
if (-not $source.Contains($identityLine) -or -not $source.Contains($elevatedLine)) { throw 'Identity fixture hooks no longer match the real wrapper.' }
# Substitute only token inspection. Keep the actual runner guards, policy
# ownership, invocation, errors and cleanup control flow; all effects below
# are in-memory commands. Never invoke this wrapper against the local registry.
$source = $source.Replace($identityLine, '$identity = @{ User = @{ Value = $script:Fixture.Sid } }').Replace($elevatedLine, '$elevated = $script:Fixture.Elevated')

function Test-NativePolicy {
    param($Case)
    $script:Fixture = $Case
    $script:Policies = @{}
    $script:Subkeys = @{}
    $script:Writes = 0
    $script:Removes = 0
    $script:Children = 0
    $script:ArgumentsPath = 'HKLM:\SOFTWARE\Policies\Microsoft\Edge\WebView2\AdditionalBrowserArguments'
    $script:ProfilePath = 'HKLM:\SOFTWARE\Policies\Microsoft\Edge\WebView2\UserDataFolder'
    $script:ParentPath = 'HKLM:\SOFTWARE\Policies\Microsoft\Edge'
    if ($Case.ExistingEmptyKeys) {
        $script:Policies[$script:ArgumentsPath] = @{}
        $script:Policies[$script:ProfilePath] = @{}
    }
    if ($Case.ExistingName) { $script:Policies[$script:ProfilePath] = @{ $Case.ExistingName = $Case.ExistingValue } }
    if ($Case.ExistingSubkey) {
        $script:Policies[$script:ProfilePath] = @{}
        $script:Subkeys[$script:ProfilePath] = 'preserve-child-key'
    }
    if ($Case.ExistingParent) { $script:Policies[$script:ParentPath] = @{ 'existing-parent-value' = 'preserve-parent' } }
    $saved = @{}
    foreach ($name in @('GITHUB_ACTIONS', 'RUNNER_ENVIRONMENT', 'RUNNER_TEMP', 'KK_TASKHOST_PROFILE', 'KK_TASKHOST_ELEVATED')) {
        $saved[$name] = [Environment]::GetEnvironmentVariable($name)
    }
    $env:GITHUB_ACTIONS = $Case.Actions
    $env:RUNNER_ENVIRONMENT = $Case.Runner
    $env:RUNNER_TEMP = $Case.Temp
    $env:KK_TASKHOST_PROFILE = 'prior-profile'
    $env:KK_TASKHOST_ELEVATED = 'prior-elevation'
    function Test-Path {
        param($LiteralPath, $PathType)
        if ($PathType -eq 'Container') { return $script:Fixture.TempExists }
        if ($LiteralPath.StartsWith('HKLM:')) { return $script:Policies.ContainsKey($LiteralPath) }
        return $script:Fixture.ProfileExists
    }
    function New-Item {
        param($Path, [switch]$Force, $ErrorAction)
        if ($script:Fixture.CreateRace -and $Path -eq $script:ProfilePath) {
            $script:Policies[$Path] = @{ 'other-app.exe' = 'preserve-create-race' }
        }
        if ($script:Policies.ContainsKey($Path) -and -not $Force) { throw 'Fixture concurrent registry key already exists.' }
        # Registry provider -Force replaces the key and its values/children.
        # It is deliberately not mocked as the filesystem ensure-directory behavior.
        $script:Policies[$Path] = @{}
        $script:Subkeys.Remove($Path)
        if ($script:Fixture.ValueAfterCreate -and $Path -eq $script:ProfilePath) { $script:Policies[$Path]['other-app.exe'] = 'preserve-late-value' }
    }
    function Get-ItemProperty {
        param($LiteralPath)
        if (-not $script:Policies.ContainsKey($LiteralPath)) { throw 'Fixture policy key missing.' }
        # The real Registry provider can return an item with no properties
        # for an empty key. Do not invent PSPath to hide strict-mode failures.
        $properties = @{}
        if ($script:Policies[$LiteralPath].Count) { $properties['PSPath'] = $LiteralPath }
        foreach ($name in $script:Policies[$LiteralPath].Keys) { $properties[$name] = $script:Policies[$LiteralPath][$name] }
        return [pscustomobject]$properties
    }
    function New-ItemProperty {
        param($LiteralPath, $Name, $Value, $PropertyType)
        if ($Name -ne 'kk-studio.exe' -or $PropertyType -ne 'String') { throw 'Unexpected policy write contract.' }
        if ($script:Fixture.FailSecondWrite -and $script:Writes -eq 1) { throw 'Fixture second write failed.' }
        if ($script:Policies[$LiteralPath].ContainsKey($Name)) { throw 'Existing value must never be overwritten.' }
        $script:Policies[$LiteralPath][$Name] = $Value
        $script:Writes++
    }
    function Get-ItemPropertyValue {
        param($LiteralPath, $Name)
        if ($script:Fixture.ReadbackMismatch -and $script:Children -eq 0) { return 'fixture-readback-mismatch' }
        return $script:Policies[$LiteralPath][$Name]
    }
    function Remove-ItemProperty {
        param($LiteralPath, $Name)
        if ($script:Fixture.CleanupFails) { throw 'Fixture cleanup failed.' }
        $script:Policies[$LiteralPath].Remove($Name)
        $script:Removes++
    }
    function npm.cmd {
        if (($args -join ' ') -ne 'run client:taskhost:test') { throw 'Unexpected lifecycle command.' }
        $script:Children++
        if ($env:KK_TASKHOST_ELEVATED -ne $script:Fixture.Elevated.ToString().ToLowerInvariant()) { throw 'Elevation receipt missing.' }
        if (-not $env:KK_TASKHOST_PROFILE.StartsWith('C:\isolated-fixture\kk-taskhost-profile-')) { throw 'Profile is outside the runner temporary directory.' }
        if ($script:Fixture.Elevated -and $script:Policies[$script:ProfilePath]['kk-studio.exe'] -cne $env:KK_TASKHOST_PROFILE) { throw 'Harness and WebView2 must use the same profile.' }
        if ($script:Fixture.AddSibling) { $script:Policies[$script:ProfilePath]['other-app.exe'] = 'preserve-sibling' }
        if ($script:Fixture.ChangeOwned) { $script:Policies[$script:ProfilePath]['kk-studio.exe'] = 'concurrent-owner' }
        if ($script:Fixture.RemoveOwned) {
            $script:Policies[$script:ArgumentsPath].Remove('kk-studio.exe')
            $script:Policies[$script:ProfilePath].Remove('kk-studio.exe')
        }
        $global:LASTEXITCODE = $script:Fixture.ChildExit
        if ($script:Fixture.ChildThrows) { throw 'Fixture child failed.' }
    }
    $failure = $null
    try { & ([scriptblock]::Create($source)) | Out-Null }
    catch { $failure = $_.Exception.Message }
    finally {
        $restored = $env:KK_TASKHOST_PROFILE -eq 'prior-profile' -and $env:KK_TASKHOST_ELEVATED -eq 'prior-elevation'
        foreach ($name in $saved.Keys) { [Environment]::SetEnvironmentVariable($name, $saved[$name]) }
    }
    if ([bool]$failure -ne $Case.Fails -or $script:Writes -ne $Case.Writes -or $script:Removes -ne $Case.Removes -or $script:Children -ne $Case.Children -or -not $restored) {
        throw "$($Case.Name): failure=$failure writes=$script:Writes removes=$script:Removes children=$script:Children environmentRestored=$restored"
    }
    if ($Case.ExistingName -and $script:Policies[$script:ProfilePath][$Case.ExistingName] -cne $Case.ExistingValue) { throw 'Existing policy was changed.' }
    if ($Case.AddSibling -and $script:Policies[$script:ProfilePath]['other-app.exe'] -ne 'preserve-sibling') { throw 'Sibling policy was removed.' }
    if ($Case.ChangeOwned -and $script:Policies[$script:ProfilePath]['kk-studio.exe'] -ne 'concurrent-owner') { throw 'Concurrent policy was removed.' }
    if ($Case.ExistingSubkey -and $script:Subkeys[$script:ProfilePath] -ne 'preserve-child-key') { throw 'Existing child registry key was removed.' }
    if ($Case.CreateRace -and $script:Policies[$script:ProfilePath]['other-app.exe'] -ne 'preserve-create-race') { throw 'Concurrent key/value was removed during creation.' }
    if ($Case.ExistingParent -and $script:Policies[$script:ParentPath]['existing-parent-value'] -ne 'preserve-parent') { throw 'Existing ancestor value was removed.' }
    if ($Case.ValueAfterCreate -and $script:Policies[$script:ProfilePath]['other-app.exe'] -ne 'preserve-late-value') { throw 'Late policy value was removed.' }
    if ($failure -and $failure.Contains('fixture-private-policy-value')) { throw 'An existing policy value leaked into diagnostics.' }
    Write-Output "PASS $($Case.Name)"
}

$defaults = @{
    Actions = 'true'; Runner = 'github-hosted'; Temp = 'C:\isolated-fixture'; TempExists = $true; ProfileExists = $false
    Sid = 'S-1-5-21-fixture'; Elevated = $true; ExistingName = ''; ExistingValue = ''
    FailSecondWrite = $false; ReadbackMismatch = $false; CleanupFails = $false; AddSibling = $false; ChangeOwned = $false; ExistingSubkey = $false; CreateRace = $false; ExistingParent = $false; ValueAfterCreate = $false; ExistingEmptyKeys = $false; RemoveOwned = $false
    ChildExit = 0; ChildThrows = $false; Fails = $false; Writes = 2; Removes = 2; Children = 1
}
$cases = @(
    @{ Name = 'new-empty-registry-key-before-write' },
    @{ Name = 'existing-empty-registry-keys'; ExistingEmptyKeys = $true },
    @{ Name = 'concurrently-removed-owned-values'; RemoveOwned = $true; AddSibling = $true; Removes = 0 },
    @{ Name = 'existing-child-key-preserved'; ExistingSubkey = $true },
    @{ Name = 'pre-create-concurrent-key-preserved'; CreateRace = $true; Fails = $true; Writes = 1; Removes = 1; Children = 0 },
    @{ Name = 'shared-ancestor-values-preserved'; ExistingParent = $true },
    @{ Name = 'post-create-pre-write-values-preserved'; ValueAfterCreate = $true; Fails = $true; Writes = 1; Removes = 1; Children = 0 },
    @{ Name = 'hosted-elevated-own-policy-and-profile' },
    @{ Name = 'local-rejected-before-effects'; Actions = ''; Runner = ''; Fails = $true; Writes = 0; Removes = 0; Children = 0 },
    @{ Name = 'self-hosted-rejected'; Runner = 'self-hosted'; Fails = $true; Writes = 0; Removes = 0; Children = 0 },
    @{ Name = 'missing-runner-temp'; Temp = ''; Fails = $true; Writes = 0; Removes = 0; Children = 0 },
    @{ Name = 'missing-temp-directory'; TempExists = $false; Fails = $true; Writes = 0; Removes = 0; Children = 0 },
    @{ Name = 'system-rejected'; Sid = 'S-1-5-18'; Fails = $true; Writes = 0; Removes = 0; Children = 0 },
    @{ Name = 'existing-profile-rejected'; ProfileExists = $true; Fails = $true; Writes = 0; Removes = 0; Children = 0 },
    @{ Name = 'non-elevated-no-machine-policy'; Elevated = $false; Writes = 0; Removes = 0 },
    @{ Name = 'existing-app-policy-preserved'; ExistingName = 'kk-studio.exe'; ExistingValue = 'fixture-private-policy-value'; Fails = $true; Writes = 0; Removes = 0; Children = 0 },
    @{ Name = 'existing-empty-policy-preserved'; ExistingName = 'kk-studio.exe'; Fails = $true; Writes = 0; Removes = 0; Children = 0 },
    @{ Name = 'existing-wildcard-policy-preserved'; ExistingName = '*'; Fails = $true; Writes = 0; Removes = 0; Children = 0 },
    @{ Name = 'existing-app-id-policy-preserved'; ExistingName = 'fixture.app.id'; Fails = $true; Writes = 0; Removes = 0; Children = 0 },
    @{ Name = 'partial-write-cleaned'; FailSecondWrite = $true; Fails = $true; Writes = 1; Removes = 1; Children = 0 },
    @{ Name = 'readback-mismatch-fails-closed'; ReadbackMismatch = $true; Fails = $true; Writes = 1; Removes = 0; Children = 0 },
    @{ Name = 'child-nonzero-propagated-and-cleaned'; ChildExit = 1; Fails = $true },
    @{ Name = 'child-throw-propagated-and-cleaned'; ChildThrows = $true; Fails = $true },
    @{ Name = 'cleanup-failure-fails-job'; CleanupFails = $true; Fails = $true; Removes = 0 },
    @{ Name = 'new-sibling-preserved'; AddSibling = $true },
    @{ Name = 'concurrent-app-policy-preserved-and-failed'; ChangeOwned = $true; Fails = $true; Removes = 1 }
)
foreach ($overrides in $cases) {
    $case = $defaults.Clone()
    foreach ($name in $overrides.Keys) { $case[$name] = $overrides[$name] }
    Test-NativePolicy $case
}
