param([int]$ProcessId, [int]$SourceX, [int]$SourceY, [int]$TargetX, [int]$TargetY, [switch]$Restore, [int]$CursorX, [int]$CursorY, [long]$PreviousWindow)
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class SidebarDragTest {
  [StructLayout(LayoutKind.Sequential)] public struct Point { public int X, Y; }
  [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr h, ref Point p);
  [DllImport("user32.dll")] public static extern uint GetDpiForWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetCursorPos(out Point p);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr h, int n);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint p);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint a, uint b, bool attach);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extra);
}
'@
[SidebarDragTest]::SetProcessDPIAware() | Out-Null
if ($Restore) {
  [SidebarDragTest]::SetCursorPos($CursorX, $CursorY) | Out-Null
  [SidebarDragTest]::SetForegroundWindow([IntPtr]$PreviousWindow) | Out-Null
  exit
}
$taskWindow = (Get-Process -Id $ProcessId).MainWindowHandle
if ($taskWindow -eq [IntPtr]::Zero) { throw 'Isolated test window missing' }
$taskPreviousWindow = [SidebarDragTest]::GetForegroundWindow()
$taskCursor = New-Object SidebarDragTest+Point
$taskFrom = New-Object SidebarDragTest+Point
$taskTo = New-Object SidebarDragTest+Point
$taskScale = [SidebarDragTest]::GetDpiForWindow($taskWindow) / 96.0
$taskFrom.X = [int]($SourceX * $taskScale)
$taskFrom.Y = [int]($SourceY * $taskScale)
$taskTo.X = [int]($TargetX * $taskScale)
$taskTo.Y = [int]($TargetY * $taskScale)
[SidebarDragTest]::ClientToScreen($taskWindow, [ref]$taskFrom) | Out-Null
[SidebarDragTest]::ClientToScreen($taskWindow, [ref]$taskTo) | Out-Null
[SidebarDragTest]::GetCursorPos([ref]$taskCursor) | Out-Null
[SidebarDragTest]::ShowWindowAsync($taskWindow, 9) | Out-Null
[uint32]$taskForegroundProcessId = 0
$taskForegroundThread = [SidebarDragTest]::GetWindowThreadProcessId($taskPreviousWindow, [ref]$taskForegroundProcessId)
$taskInputThread = [SidebarDragTest]::GetCurrentThreadId()
[SidebarDragTest]::AttachThreadInput($taskInputThread, $taskForegroundThread, $true) | Out-Null
try {
  [SidebarDragTest]::BringWindowToTop($taskWindow) | Out-Null
  [SidebarDragTest]::SetForegroundWindow($taskWindow) | Out-Null
} finally {
  [SidebarDragTest]::AttachThreadInput($taskInputThread, $taskForegroundThread, $false) | Out-Null
}
Start-Sleep -Milliseconds 200
if (![SidebarDragTest]::IsWindowVisible($taskWindow) -or [SidebarDragTest]::GetForegroundWindow() -ne $taskWindow) {
  throw ('Isolated test window must be visible and foreground for native pointer input; visible=' + [SidebarDragTest]::IsWindowVisible($taskWindow) + '; window=' + $taskWindow + '; foreground=' + [SidebarDragTest]::GetForegroundWindow())
}
try {
  [SidebarDragTest]::SetCursorPos($taskFrom.X, $taskFrom.Y) | Out-Null
  [SidebarDragTest]::mouse_event(2, 0, 0, 0, [UIntPtr]::Zero)
  Start-Sleep -Milliseconds 150
  for ($taskStep = 1; $taskStep -le 40; $taskStep++) {
    $taskX = [int]($taskFrom.X + ($taskTo.X - $taskFrom.X) * $taskStep / 40)
    $taskY = [int]($taskFrom.Y + ($taskTo.Y - $taskFrom.Y) * $taskStep / 40)
    [SidebarDragTest]::SetCursorPos($taskX, $taskY) | Out-Null
    Start-Sleep -Milliseconds 25
  }
  Start-Sleep -Milliseconds 150
} finally {
  [SidebarDragTest]::mouse_event(4, 0, 0, 0, [UIntPtr]::Zero)
}
@{ cursorX = $taskCursor.X; cursorY = $taskCursor.Y; previousWindow = $taskPreviousWindow.ToInt64() } | ConvertTo-Json -Compress
