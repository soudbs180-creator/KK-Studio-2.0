param([int]$ProcessId, [int]$ClientX, [int]$ClientY)
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class TitlebarDragTest {
  [StructLayout(LayoutKind.Sequential)] public struct Point { public int X, Y; }
  [StructLayout(LayoutKind.Sequential)] public struct Rect { public int Left, Top, Right, Bottom; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out Rect r);
  [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr h, ref Point p);
  [DllImport("user32.dll")] public static extern uint GetDpiForWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetCursorPos(out Point p);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extra);
}
'@
$taskWindow = (Get-Process -Id $ProcessId).MainWindowHandle
if ($taskWindow -eq [IntPtr]::Zero) { throw 'Isolated test window missing' }
$taskBefore = New-Object TitlebarDragTest+Rect
$taskAfter = New-Object TitlebarDragTest+Rect
$taskCursor = New-Object TitlebarDragTest+Point
$taskPoint = New-Object TitlebarDragTest+Point
$taskScale = [TitlebarDragTest]::GetDpiForWindow($taskWindow) / 96.0
$taskPoint.X = [int]($ClientX * $taskScale)
$taskPoint.Y = [int]($ClientY * $taskScale)
[TitlebarDragTest]::ClientToScreen($taskWindow, [ref]$taskPoint) | Out-Null
[TitlebarDragTest]::GetWindowRect($taskWindow, [ref]$taskBefore) | Out-Null
[TitlebarDragTest]::GetCursorPos([ref]$taskCursor) | Out-Null
[TitlebarDragTest]::SetForegroundWindow($taskWindow) | Out-Null
try {
  [TitlebarDragTest]::SetCursorPos($taskPoint.X, $taskPoint.Y) | Out-Null
  [TitlebarDragTest]::mouse_event(2, 0, 0, 0, [UIntPtr]::Zero)
  Start-Sleep -Milliseconds 150
  for ($taskStep = 1; $taskStep -le 10; $taskStep++) {
    [TitlebarDragTest]::SetCursorPos($taskPoint.X + $taskStep * 8, $taskPoint.Y + $taskStep * 6) | Out-Null
    Start-Sleep -Milliseconds 35
  }
} finally {
  [TitlebarDragTest]::mouse_event(4, 0, 0, 0, [UIntPtr]::Zero)
  [TitlebarDragTest]::SetCursorPos($taskCursor.X, $taskCursor.Y) | Out-Null
}
Start-Sleep -Milliseconds 150
[TitlebarDragTest]::GetWindowRect($taskWindow, [ref]$taskAfter) | Out-Null
@{ before = @{ x = $taskBefore.Left; y = $taskBefore.Top }; after = @{ x = $taskAfter.Left; y = $taskAfter.Top } } | ConvertTo-Json -Compress
