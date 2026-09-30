param(
    [Parameter(Mandatory = $true)][int]$AppProcessId,
    [Parameter(Mandatory = $true)][ValidateSet('accept', 'cancel')][string]$Answer
)
$ErrorActionPreference = 'Stop'
# Windows PowerShell reads BOM-less scripts as ANSI; construct labels explicitly.
$buttonLabel = if ($Answer -eq 'accept') { ([char]0x786e).ToString() + [char]0x8ba4 } else { ([char]0x53d6).ToString() + [char]0x6d88 }
Add-Type @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
public static class OwnedDialog {
    public delegate bool Callback(IntPtr hwnd, IntPtr data);
    [DllImport("user32.dll")] static extern bool EnumWindows(Callback cb, IntPtr data);
    [DllImport("user32.dll")] static extern bool EnumChildWindows(IntPtr hwnd, Callback cb, IntPtr data);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint pid);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetWindowText(IntPtr hwnd, StringBuilder text, int count);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetClassName(IntPtr hwnd, StringBuilder text, int count);
    [DllImport("user32.dll")] static extern IntPtr SendMessage(IntPtr hwnd, uint msg, IntPtr w, IntPtr l);
    public static List<string> Observed = new List<string>();
    public static bool Click(HashSet<int> ids, string label) {
        bool clicked = false;
        Observed.Clear();
        Callback button = (hwnd, data) => {
            uint pid; GetWindowThreadProcessId(hwnd, out pid);
            if (!ids.Contains((int)pid)) return true;
            var text = new StringBuilder(300); var cls = new StringBuilder(80);
            GetWindowText(hwnd, text, text.Capacity); GetClassName(hwnd, cls, cls.Capacity);
            Observed.Add(cls + ":" + text);
            if (cls.ToString() == "Button" && text.ToString().Replace("&", "") == label) {
                SendMessage(hwnd, 0x00F5, IntPtr.Zero, IntPtr.Zero);
                clicked = true; return false;
            }
            return true;
        };
        EnumWindows((hwnd, data) => {
            uint pid; GetWindowThreadProcessId(hwnd, out pid);
            if (ids.Contains((int)pid)) {
                button(hwnd, data); EnumChildWindows(hwnd, button, data);
            }
            return !clicked;
        }, IntPtr.Zero);
        return clicked;
    }
}
'@
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
$root = [System.Windows.Automation.AutomationElement]::RootElement
$ownedIds = [System.Collections.Generic.HashSet[int]]::new()
[void]$ownedIds.Add($AppProcessId)
$processes = Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId
do {
    $changed = $false
    foreach ($process in $processes) {
        if ($ownedIds.Contains([int]$process.ParentProcessId) -and $ownedIds.Add([int]$process.ProcessId)) { $changed = $true }
    }
} while ($changed)
$dialogTitle = [System.Windows.Automation.PropertyCondition]::new(
    [System.Windows.Automation.AutomationElement]::NameProperty, 'KK Studio')
$deadline = [DateTime]::UtcNow.AddSeconds(12)
while ([DateTime]::UtcNow -lt $deadline) {
    if ([OwnedDialog]::Click($ownedIds, $buttonLabel)) { Write-Output "Owned native dialog: $Answer"; exit 0 }
    $windows = @($root.FindAll([System.Windows.Automation.TreeScope]::Children, [System.Windows.Automation.Condition]::TrueCondition) | Where-Object { $ownedIds.Contains($_.Current.ProcessId) })
    foreach ($window in $windows) {
        if (-not $ownedIds.Contains($window.Current.ProcessId)) { continue }
        $buttonName = [System.Windows.Automation.PropertyCondition]::new(
            [System.Windows.Automation.AutomationElement]::NameProperty, $buttonLabel)
        $button = $window.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $buttonName)
        if ($null -ne $button -and $button.Current.ControlType -eq [System.Windows.Automation.ControlType]::Button) {
            $pattern = $button.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
            $pattern.Invoke()
            Write-Output "Owned native dialog: $Answer"
            exit 0
        }
    }
    Start-Sleep -Milliseconds 100
}
$observed = @($windows | ForEach-Object {
    $buttons = $_.FindAll([System.Windows.Automation.TreeScope]::Descendants,
        [System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::ControlTypeProperty,
            [System.Windows.Automation.ControlType]::Button))
    "pid=$($_.Current.ProcessId) $($_.Current.ClassName): $($_.Current.Name); buttons: " + (@($buttons | ForEach-Object { $_.Current.Name }) -join ',')
}) -join '; '
throw "Owned native confirmation button was not found: $Answer; $observed; Win32: $([OwnedDialog]::Observed -join '; ')"
