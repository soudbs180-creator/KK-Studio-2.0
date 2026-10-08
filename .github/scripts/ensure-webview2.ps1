$ErrorActionPreference = 'Stop'

# Edge Stable is not the WebView2 Runtime. Follow Microsoft's Evergreen detection.
# https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution
$runtimeId = '{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}'
$runtimeKeys = @(
    "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\$runtimeId",
    "HKLM:\SOFTWARE\Microsoft\EdgeUpdate\Clients\$runtimeId",
    "HKCU:\Software\Microsoft\EdgeUpdate\Clients\$runtimeId"
)

function Get-WebView2Version {
    foreach ($runtimeKey in $runtimeKeys) {
        $runtimeValue = (Get-ItemProperty -LiteralPath $runtimeKey -Name pv -ErrorAction SilentlyContinue).pv
        $runtimeVersion = $null
        if ([version]::TryParse($runtimeValue, [ref]$runtimeVersion) -and $runtimeVersion -gt [version]'0.0.0.0') {
            return $runtimeVersion.ToString()
        }
    }
    return $null
}

function Test-MicrosoftSigner {
    param($Certificate)
    try {
        $reader = [System.Formats.Asn1.AsnReader]::new(
            [System.ReadOnlyMemory[byte]]::new($Certificate.SubjectName.RawData),
            [System.Formats.Asn1.AsnEncodingRules]::DER
        )
        $name = $reader.ReadSequence()
        $organizations = [System.Collections.Generic.List[string]]::new()
        while ($name.HasData) {
            $attributes = $name.ReadSetOf()
            while ($attributes.HasData) {
                $attribute = $attributes.ReadSequence()
                $oid = $attribute.ReadObjectIdentifier()
                if ($oid -eq '2.5.4.10') {
                    $tag = $attribute.PeekTag()
                    if ($tag.TagClass -ne [System.Formats.Asn1.TagClass]::Universal) { return $false }
                    $organizations.Add($attribute.ReadCharacterString([System.Formats.Asn1.UniversalTagNumber]$tag.TagValue))
                } else {
                    $null = $attribute.ReadEncodedValue()
                }
                $attribute.ThrowIfNotEmpty()
            }
        }
        $reader.ThrowIfNotEmpty()
        return $organizations.Count -eq 1 -and [string]::Equals($organizations[0], 'Microsoft Corporation', [StringComparison]::Ordinal)
    } catch {
        return $false
    }
}

$installedVersion = Get-WebView2Version
Write-Output "WebView2 Runtime before setup: $($installedVersion ?? 'MISSING')"
if (-not $installedVersion) {
    if ($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted' -or -not $env:RUNNER_TEMP) {
        throw 'Missing WebView2 Runtime; automatic installation requires an isolated GitHub-hosted CI runner.'
    }
    $installerPath = Join-Path $env:RUNNER_TEMP ('webview2-' + [guid]::NewGuid().ToString() + '.exe')
    Invoke-WebRequest -Uri 'https://go.microsoft.com/fwlink/p/?LinkId=2124703' -OutFile $installerPath -TimeoutSec 60
    $signature = Get-AuthenticodeSignature -LiteralPath $installerPath
    if ($signature.Status -ne 'Valid' -or -not (Test-MicrosoftSigner $signature.SignerCertificate)) {
        throw 'WebView2 bootstrapper must have a valid Microsoft signature.'
    }
    $installer = Start-Process -FilePath $installerPath -ArgumentList '/silent', '/install' -WindowStyle Hidden -PassThru
    if (-not $installer.WaitForExit(120000)) { throw 'WebView2 installation did not finish within 120 seconds.' }
    if ($installer.ExitCode -ne 0) { throw "WebView2 installation failed: exit $($installer.ExitCode)." }
    $installedVersion = Get-WebView2Version
    if (-not $installedVersion) { throw 'WebView2 installation did not register a valid Evergreen Runtime.' }
}
Write-Output "WebView2 Runtime ready: $installedVersion"
if ($env:GITHUB_ENV) {
    "KK_WEBVIEW2_RUNTIME_VERSION=$installedVersion" | Out-File -LiteralPath $env:GITHUB_ENV -Encoding utf8 -Append
}
