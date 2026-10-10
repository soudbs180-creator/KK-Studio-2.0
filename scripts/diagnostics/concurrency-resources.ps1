param([int]$RootPid, [string]$OutputFile)
$ErrorActionPreference = 'Stop'
$clock = [System.Diagnostics.Stopwatch]::StartNew()
while (Get-Process -Id $RootPid -ErrorAction SilentlyContinue) {
    $began = $clock.ElapsedMilliseconds
    try {
        $all = @(Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId)
        $ids = [System.Collections.Generic.HashSet[int]]::new()
        [void]$ids.Add($RootPid)
        do {
            $added = $false
            foreach ($item in $all) {
                if ($ids.Contains([int]$item.ParentProcessId) -and $ids.Add([int]$item.ProcessId)) { $added = $true }
            }
        } while ($added)
        $processes = @()
        foreach ($item in $all) {
            if ($ids.Contains([int]$item.ProcessId)) {
                $proc = Get-Process -Id $item.ProcessId -ErrorAction SilentlyContinue
                if ($proc) {
                    $processes += @{pid=$proc.Id; parentPid=[int]$item.ParentProcessId; name=$proc.ProcessName; startedAt=$proc.StartTime.ToUniversalTime().ToString('o'); workingSetBytes=$proc.WorkingSet64; cpuTimeSeconds=$proc.TotalProcessorTime.TotalSeconds}
                }
            }
        }
        $os = Get-CimInstance Win32_OperatingSystem
        $cpu = Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor -Filter "Name='_Total'"
        $record = @{capturedAt=[DateTime]::UtcNow.ToString('o'); rootPid=$RootPid; processes=@($processes); freePhysicalMemoryBytes=[long]$os.FreePhysicalMemory*1024; totalVisibleMemoryBytes=[long]$os.TotalVisibleMemorySize*1024; systemCpuPercent=[int]$cpu.PercentProcessorTime; sampleDurationMs=$clock.ElapsedMilliseconds-$began}
    } catch {
        $record = @{capturedAt=[DateTime]::UtcNow.ToString('o'); rootPid=$RootPid; error=$_.Exception.Message; processes=@(); sampleDurationMs=$clock.ElapsedMilliseconds-$began}
    }
    [System.IO.File]::AppendAllText($OutputFile, ($record | ConvertTo-Json -Depth 6 -Compress) + "`n", [System.Text.UTF8Encoding]::new($false))
    Start-Sleep -Milliseconds 1000
}
