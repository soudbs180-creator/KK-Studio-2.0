use serde::{Deserialize, Serialize};

const MAX_SAFE: u64 = 9_007_199_254_740_991;
const MAX_OUTPUT: usize = 16 * 1024;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HardwareReport {
    version: u8,
    status: &'static str,
    platform: &'static str,
    measured_at_ms: u64,
    cpu: Option<Cpu>,
    memory: Option<Memory>,
    os: Option<Os>,
    gpus: Vec<Gpu>,
    disks: Vec<Disk>,
    errors: Vec<ProbeError>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Cpu {
    name: String,
    logical_cores: u32,
}
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Memory {
    usable_bytes: u64,
    available_bytes: u64,
}
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Os {
    name: String,
    architecture: String,
}
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Gpu {
    name: String,
    dedicated_bytes: Option<u64>,
    free_bytes: Option<u64>,
    driver_version: Option<String>,
    compute_capability: Option<String>,
    compute_backend: Option<&'static str>,
}
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Disk {
    drive: String,
    total_bytes: u64,
    free_bytes: u64,
}
#[derive(Debug, Serialize)]
struct ProbeError {
    probe: &'static str,
    code: &'static str,
}

fn label(value: &str) -> bool {
    !value.trim().is_empty() && value.chars().count() <= 160 && !value.chars().any(char::is_control)
}
fn capacity(total: u64, free: u64) -> bool {
    total > 0 && total <= MAX_SAFE && free <= total
}
fn json<T: serde::de::DeserializeOwned>(output: &str) -> Result<T, &'static str> {
    if output.len() > MAX_OUTPUT {
        return Err("output-limit");
    }
    serde_json::from_str(output.trim_start_matches('\u{feff}')).map_err(|_| "invalid-output")
}
fn parse_cpu(output: &str) -> Result<Cpu, &'static str> {
    let cpu: Cpu = json(output)?;
    if !label(&cpu.name) || !(1..=4096).contains(&cpu.logical_cores) {
        return Err("invalid-output");
    }
    Ok(cpu)
}
fn parse_system(output: &str) -> Result<(Os, Memory), &'static str> {
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct System {
        name: String,
        architecture: String,
        usable_bytes: u64,
        available_bytes: u64,
    }
    let system: System = json(output)?;
    if !label(&system.name) || !capacity(system.usable_bytes, system.available_bytes) {
        return Err("invalid-output");
    }
    Ok((
        Os {
            name: system.name,
            architecture: match system.architecture.as_str() {
                "X64" => "x86_64",
                "Arm64" => "aarch64",
                "X86" => "x86",
                "Arm" => "arm",
                _ => "unknown",
            }
            .into(),
        },
        Memory {
            usable_bytes: system.usable_bytes,
            available_bytes: system.available_bytes,
        },
    ))
}
fn parse_gpus(output: &str) -> Result<Vec<Gpu>, &'static str> {
    #[derive(Deserialize)]
    #[serde(deny_unknown_fields)]
    struct Name {
        name: String,
    }
    let rows: Vec<Name> = json(output)?;
    if rows.len() > 32 || rows.iter().any(|r| !label(&r.name)) {
        return Err("invalid-output");
    }
    Ok(rows
        .into_iter()
        .map(|r| Gpu {
            name: r.name,
            dedicated_bytes: None,
            free_bytes: None,
            driver_version: None,
            compute_capability: None,
            compute_backend: None,
        })
        .collect())
}
fn parse_disks(output: &str) -> Result<Vec<Disk>, &'static str> {
    let rows: Vec<Disk> = json(output)?;
    let mut seen = std::collections::HashSet::new();
    if rows.len() > 26
        || rows.iter().any(|r| {
            let drive = r.drive.as_bytes();
            drive.len() != 2
                || !drive[0].is_ascii_uppercase()
                || drive[1] != b':'
                || !capacity(r.total_bytes, r.free_bytes)
                || !seen.insert(&r.drive)
        })
    {
        return Err("invalid-output");
    }
    Ok(rows)
}
fn parse_nvidia(output: &str) -> Result<Vec<Gpu>, &'static str> {
    if output.len() > MAX_OUTPUT {
        return Err("output-limit");
    }
    let mut rows = vec![];
    for line in output.lines().filter(|line| !line.trim().is_empty()) {
        let columns: Vec<_> = line.rsplitn(5, ',').map(str::trim).collect();
        if columns.len() != 5 || !label(columns[4]) || rows.len() >= 32 {
            return Err("invalid-output");
        }
        let mib = |v: &str| {
            v.parse::<u64>()
                .ok()
                .and_then(|n| n.checked_mul(1024 * 1024))
                .ok_or("invalid-output")
        };
        let total = mib(columns[3])?;
        let free = mib(columns[2])?;
        if !capacity(total, free) {
            return Err("invalid-output");
        }
        let driver_version = reported_version(columns[1], 4, 4)?;
        let compute_capability = reported_version(columns[0], 2, 2)?;
        let compute_backend = compute_capability.as_ref().map(|_| "cuda-reported");
        rows.push(Gpu {
            name: columns[4].into(),
            dedicated_bytes: Some(total),
            free_bytes: Some(free),
            driver_version,
            compute_capability,
            compute_backend,
        });
    }
    if rows.is_empty() {
        return Err("invalid-output");
    }
    Ok(rows)
}

fn reported_version(
    value: &str,
    max_parts: usize,
    max_digits: usize,
) -> Result<Option<String>, &'static str> {
    if matches!(value, "N/A" | "[N/A]" | "[Not Supported]") {
        return Ok(None);
    }
    let parts: Vec<_> = value.split('.').collect();
    if !(2..=max_parts).contains(&parts.len())
        || parts
            .iter()
            .any(|p| p.is_empty() || p.len() > max_digits || !p.bytes().all(|b| b.is_ascii_digit()))
    {
        return Err("invalid-output");
    }
    Ok(Some(value.into()))
}

fn empty_report(status: &'static str, platform: &'static str) -> HardwareReport {
    HardwareReport {
        version: 1,
        status,
        platform,
        measured_at_ms: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis()
            .min(MAX_SAFE as u128) as u64,
        cpu: None,
        memory: None,
        os: None,
        gpus: vec![],
        disks: vec![],
        errors: vec![],
    }
}

#[cfg(any(windows, test))]
const CPU: &str = "$c=@(Get-CimInstance Win32_Processor -Property Name,NumberOfLogicalProcessors -OperationTimeoutSec 2); [pscustomobject]@{name=($c | Select-Object -First 1).Name;logicalCores=[int](($c | Measure-Object NumberOfLogicalProcessors -Sum).Sum)} | ConvertTo-Json -Compress";
#[cfg(any(windows, test))]
const SYSTEM: &str = "$s=Get-CimInstance Win32_OperatingSystem -Property Caption,TotalVisibleMemorySize,FreePhysicalMemory -OperationTimeoutSec 2; $a='unknown'; try {$a=[System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()} catch {$a='unknown'}; [pscustomobject]@{name=$s.Caption;architecture=$a;usableBytes=[uint64]$s.TotalVisibleMemorySize*1024;availableBytes=[uint64]$s.FreePhysicalMemory*1024} | ConvertTo-Json -Compress";
#[cfg(any(windows, test))]
const GPU: &str = "ConvertTo-Json -Compress -InputObject @(Get-CimInstance Win32_VideoController -Property Name -OperationTimeoutSec 2 | ForEach-Object { [pscustomobject]@{name=$_.Name} })";
#[cfg(any(windows, test))]
const DISK: &str = "ConvertTo-Json -Compress -InputObject @(Get-CimInstance Win32_LogicalDisk -Property DeviceID,Size,FreeSpace -Filter 'DriveType=3' -OperationTimeoutSec 2 | ForEach-Object { [pscustomobject]@{drive=$_.DeviceID;totalBytes=[uint64]$_.Size;freeBytes=[uint64]$_.FreeSpace} })";
#[cfg(any(windows, test))]
const NVIDIA: &str = "& \"$env:SystemRoot\\System32\\nvidia-smi.exe\" --query-gpu=name,memory.total,memory.free,driver_version,compute_cap --format=csv,noheader,nounits; if ($LASTEXITCODE -ne 0) { exit 1 }";

#[cfg(any(windows, test))]
fn collect(mut run: impl FnMut(&'static str) -> Result<String, &'static str>) -> HardwareReport {
    let mut report = empty_report("supported", "windows");
    match run(CPU).and_then(|v| parse_cpu(&v)) {
        Ok(value) => report.cpu = Some(value),
        Err(code) => report.errors.push(ProbeError { probe: "cpu", code }),
    }
    match run(SYSTEM).and_then(|v| parse_system(&v)) {
        Ok((os, memory)) => {
            report.os = Some(os);
            report.memory = Some(memory);
        }
        Err(code) => report.errors.push(ProbeError {
            probe: "system",
            code,
        }),
    }
    match run(GPU).and_then(|v| parse_gpus(&v)) {
        Ok(value) => report.gpus = value,
        Err(code) => report.errors.push(ProbeError { probe: "gpu", code }),
    }
    match run(DISK).and_then(|v| parse_disks(&v)) {
        Ok(value) => report.disks = value,
        Err(code) => report.errors.push(ProbeError {
            probe: "disk",
            code,
        }),
    }
    match run(NVIDIA).and_then(|v| parse_nvidia(&v)) {
        Ok(values) => {
            for value in values {
                // Same-name cards must consume separate, still-unfilled CIM slots.
                if let Some(existing) = report.gpus.iter_mut().find(|g| {
                    g.dedicated_bytes.is_none() && g.name.eq_ignore_ascii_case(&value.name)
                }) {
                    *existing = value;
                } else if report.gpus.len() < 32 {
                    report.gpus.push(value);
                }
            }
        }
        Err(code) => report.errors.push(ProbeError {
            probe: "nvidia",
            code,
        }),
    }
    report
}

#[cfg(windows)]
fn run_powershell(
    script: &str,
    timeout: std::time::Duration,
    limit: usize,
) -> Result<String, &'static str> {
    use std::io::{Read, Write};
    use std::os::windows::{io::AsRawHandle, process::CommandExt};
    use std::process::{Command, Stdio};
    use std::time::{Duration, Instant};
    let deadline = Instant::now() + timeout;
    let root = std::path::PathBuf::from(std::env::var_os("SystemRoot").ok_or("unavailable")?);
    if !root.is_absolute() || root.to_string_lossy().starts_with("\\\\") {
        return Err("unavailable");
    }
    let system = root.join("System32");
    let modules = system.join("WindowsPowerShell/v1.0/Modules");
    let executable = system.join("WindowsPowerShell/v1.0/powershell.exe");
    // The literal probe waits on stdin until our Job owns it and all descendants.
    let command = format!("[Console]::In.ReadLine() | Out-Null; $ErrorActionPreference='Stop'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false); {script}");
    let mut child = Command::new(executable)
        .args([
            "-NoLogo",
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            &command,
        ])
        .env("PSModulePath", modules)
        .current_dir(system)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .creation_flags(0x08000000)
        .spawn()
        .map_err(|_| "unavailable")?;
    let job = match crate::agent_process::OwnedJob::assign(child.as_raw_handle()) {
        Ok(job) => job,
        Err(_) => {
            let _ = child.kill();
            let _ = child.wait();
            return Err("unavailable");
        }
    };
    let gate = child.stdin.take().ok_or("unavailable")?.write_all(b"\n");
    if gate.is_err() {
        drop(job);
        let _ = child.kill();
        let _ = child.wait();
        return Err("unavailable");
    }
    let stdout = child.stdout.take().ok_or("unavailable")?;
    let (sender, receiver) = std::sync::mpsc::channel();
    let reader = std::thread::spawn(move || {
        let mut bytes = Vec::new();
        let result = stdout
            .take(limit as u64 + 1)
            .read_to_end(&mut bytes)
            .map(|_| bytes)
            .map_err(|_| "unavailable");
        let _ = sender.send(result);
    });
    let mut output = None;
    let status = loop {
        if let Ok(value) = receiver.try_recv() {
            output = Some(value);
        }
        if output
            .as_ref()
            .is_some_and(|r| r.as_ref().is_ok_and(|b| b.len() > limit))
        {
            break Err("output-limit");
        }
        if Instant::now() >= deadline {
            break Err("timeout");
        }
        match child.try_wait() {
            Ok(Some(status)) => {
                break if status.success() {
                    Ok(())
                } else {
                    Err("unavailable")
                }
            }
            Err(_) => break Err("unavailable"),
            Ok(None) => std::thread::sleep(Duration::from_millis(10)),
        }
    };
    drop(job);
    let _ = child.kill();
    let _ = child.wait();
    reader.join().map_err(|_| "unavailable")?;
    let bytes = output
        .or_else(|| receiver.try_recv().ok())
        .ok_or("unavailable")??;
    if bytes.len() > limit {
        return Err("output-limit");
    }
    status?;
    String::from_utf8(bytes).map_err(|_| "invalid-output")
}

pub fn detect() -> HardwareReport {
    #[cfg(windows)]
    {
        static DETECTION: std::sync::Mutex<()> = std::sync::Mutex::new(());
        let Ok(_guard) = DETECTION.try_lock() else {
            let mut report = empty_report("supported", "windows");
            report.errors.push(ProbeError {
                probe: "system",
                code: "unavailable",
            });
            return report;
        };
        collect(|script| run_powershell(script, std::time::Duration::from_secs(4), MAX_OUTPUT))
    }
    #[cfg(not(windows))]
    {
        let platform = match std::env::consts::OS {
            "linux" => "linux",
            "macos" => "macos",
            _ => "unknown",
        };
        let mut report = empty_report("unsupported", platform);
        report.errors.push(ProbeError {
            probe: "platform",
            code: "unsupported",
        });
        report
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn local_hardware_parses_only_projected_cpu_system_disk_fields() {
        assert_eq!(
            parse_cpu(r#"{"name":"CPU","logicalCores":24}"#)
                .unwrap()
                .logical_cores,
            24
        );
        let (_, memory) = parse_system(
            r#"{"name":"Windows 11","architecture":"X64","usableBytes":68182605824,"availableBytes":42949672960}"#,
        )
        .unwrap();
        assert_eq!(memory.available_bytes, 42_949_672_960);
        assert_eq!(
            parse_disks(r#"[{"drive":"D:","totalBytes":1000,"freeBytes":0}]"#).unwrap()[0]
                .free_bytes,
            0
        );
    }
    #[test]
    fn local_hardware_rejects_noisy_json_private_fields_and_invalid_numbers() {
        assert!(parse_cpu("warning\n{\"name\":\"CPU\",\"logicalCores\":24}").is_err());
        assert!(parse_cpu(r#"{"name":"CPU","logicalCores":24,"serial":"private"}"#).is_err());
        for input in [
            r#"{"name":"CPU","logicalCores":0}"#,
            r#"{"name":"CPU","logicalCores":-1}"#,
            r#"{"name":"CPU","logicalCores":4294967296}"#,
        ] {
            assert!(parse_cpu(input).is_err());
        }
        assert!(parse_system(
            r#"{"name":"Windows","architecture":"X64","usableBytes":9007199254740992,"availableBytes":0}"#
        )
        .is_err());
        assert!(parse_system(
            r#"{"name":"Windows","architecture":"X64","usableBytes":1000,"availableBytes":1001}"#
        )
        .is_err());
        assert!(
            parse_disks(r#"[{"drive":"C:\\private","totalBytes":1000,"freeBytes":1}]"#).is_err()
        );
        assert!(json::<serde_json::Value>(&" ".repeat(MAX_OUTPUT + 1)).is_err());
    }
    #[test]
    fn local_hardware_nvidia_vram_uses_mib_and_preserves_actual_zero() {
        let rows =
            parse_nvidia("NVIDIA GeForce RTX 5080, 16303, 9743, 610.88, 12.0\nNVIDIA second, 8192, 0, 610.88, 8.0\n").unwrap();
        assert_eq!(rows[0].dedicated_bytes, Some(16303 * 1024 * 1024));
        assert_eq!(rows[0].free_bytes, Some(9743 * 1024 * 1024));
        assert_eq!(rows[1].free_bytes, Some(0));
        for invalid in [
            "NVIDIA, 0, 0, 610.88, 12.0",
            "NVIDIA, 10, 11, 610.88, 12.0",
            "NVIDIA, N/A, N/A, 610.88, 12.0",
            "NVIDIA, -1, 0, 610.88, 12.0",
            "NVIDIA, 18446744073709551615, 1, 610.88, 12.0",
            "junk",
            "",
        ] {
            assert!(parse_nvidia(invalid).is_err());
        }
    }
    #[test]
    fn local_hardware_nvidia_driver_compute_are_reported_nullable_and_validated() {
        let rows = parse_nvidia("NVIDIA RTX, 16303, 9743, 610.88, 12.0").unwrap();
        assert_eq!(rows[0].driver_version.as_deref(), Some("610.88"));
        assert_eq!(rows[0].compute_capability.as_deref(), Some("12.0"));
        assert_eq!(rows[0].compute_backend, Some("cuda-reported"));
        let rows = parse_nvidia("NVIDIA RTX, 16303, 9743, N/A, [N/A]").unwrap();
        assert_eq!(rows[0].free_bytes, Some(9743 * 1024 * 1024));
        assert_eq!(rows[0].driver_version, None);
        assert_eq!(rows[0].compute_capability, None);
        assert_eq!(rows[0].compute_backend, None);
        for invalid in [
            "NVIDIA RTX, 16, 8, driver-private, 12.0",
            "NVIDIA RTX, 16, 8, 610.88, 12.0;execute",
        ] {
            assert!(parse_nvidia(invalid).is_err());
        }
    }
    #[test]
    fn local_hardware_collect_preserves_same_name_gpu_rows_in_both_orders() {
        for cim in [
            r#"[{"name":"Intel"},{"name":"Virtual"},{"name":"NVIDIA RTX 5080"},{"name":"NVIDIA RTX 5080"}]"#,
            r#"[{"name":"Intel"},{"name":"Virtual"},{"name":"NVIDIA RTX 5080"}]"#,
        ] {
            for smi in [
                "NVIDIA RTX 5080, 16384, 12288, 610.88, 12.0\nNVIDIA RTX 5080, 16384, 2048, 610.88, 12.0",
                "NVIDIA RTX 5080, 16384, 2048, 610.88, 12.0\nNVIDIA RTX 5080, 16384, 12288, 610.88, 12.0",
            ] {
                let report = collect(|script| match script {
                    CPU => Ok(r#"{"name":"Fixture CPU","logicalCores":24}"#.into()),
                    SYSTEM => Ok(r#"{"name":"Fixture Windows","architecture":"X64","usableBytes":68719476736,"availableBytes":42949672960}"#.into()),
                    DISK => Ok(r#"[{"drive":"D:","totalBytes":1099511627776,"freeBytes":536870912000}]"#.into()),
                    GPU => Ok(cim.into()), NVIDIA => Ok(smi.into()), _ => Err("unavailable"),
                });
                let mut free: Vec<_> = report.gpus.iter().filter_map(|g| g.free_bytes).collect();
                free.sort_unstable();
                assert_eq!(free, [2 * 1024_u64.pow(3), 12 * 1024_u64.pow(3)]);
                assert_eq!(report.gpus.len(), 4);
                assert_eq!(report.gpus[0].name, "Intel");
                assert_eq!(report.gpus[1].name, "Virtual");
                let json = serde_json::to_string(&report).unwrap();
                println!("LOCAL_HW_01_FIXTURE={json}");
            }
        }
    }
    #[test]
    fn local_hardware_partial_failures_leave_unknown_gpu_memory_not_fake_zero() {
        let report = collect(|script| match script {
            CPU => Ok(r#"{"name":"CPU","logicalCores":24}"#.into()),
            GPU => Ok(r#"[{"name":"NVIDIA RTX"}]"#.into()),
            NVIDIA => Err("timeout"),
            _ => Err("unavailable"),
        });
        assert!(report.cpu.is_some());
        assert!(report.memory.is_none());
        assert_eq!(report.gpus[0].dedicated_bytes, None);
        assert_eq!(report.gpus[0].free_bytes, None);
        assert_eq!(report.gpus[0].driver_version, None);
        assert_eq!(report.gpus[0].compute_capability, None);
        assert_eq!(report.errors.len(), 3);
        assert!(!serde_json::to_string(&report).unwrap().contains("private"));
    }
    #[test]
    fn local_hardware_os_architecture_is_not_inferred_from_compiled_binary() {
        let (os, _) = parse_system(
            r#"{"name":"Windows","architecture":"Arm64","usableBytes":1000,"availableBytes":1}"#,
        )
        .unwrap();
        assert_eq!(os.architecture, "aarch64");
    }
    #[cfg(windows)]
    #[test]
    fn local_hardware_probe_timeout_and_output_are_bounded() {
        use std::time::{Duration, Instant};
        let started = Instant::now();
        assert_eq!(
            run_powershell("Start-Sleep -Seconds 10", Duration::from_millis(250), 100),
            Err("timeout")
        );
        assert!(started.elapsed() < Duration::from_secs(3));
        let started = Instant::now();
        assert_eq!(run_powershell("& \"$env:SystemRoot\\System32\\WindowsPowerShell\\v1.0\\powershell.exe\" -NoProfile -NonInteractive -Command 'Start-Sleep -Seconds 10'", Duration::from_millis(700), 100), Err("timeout"));
        assert!(started.elapsed() < Duration::from_secs(3));
        assert_eq!(
            run_powershell("[Console]::Write('x' * 10000)", Duration::from_secs(4), 100),
            Err("output-limit")
        );
        assert_eq!(
            run_powershell("throw 'private-error'", Duration::from_secs(4), 100),
            Err("unavailable")
        );
        let output = run_powershell(
            "[Console]::Write('{\"name\":\"CPU\",\"logicalCores\":24}')",
            Duration::from_secs(4),
            100,
        )
        .unwrap();
        assert_eq!(parse_cpu(&output).unwrap().logical_cores, 24);
    }
    #[cfg(windows)]
    #[test]
    #[ignore = "explicit read-only hardware evidence; no model runtime"]
    fn local_hardware_windows_real_probe() {
        let report = detect();
        println!(
            "LOCAL_HARDWARE_REPORT={}",
            serde_json::to_string(&report).unwrap()
        );
        assert_eq!(report.status, "supported");
        assert!(report.cpu.is_some());
        assert!(report.os.is_some());
        assert!(report.memory.is_some());
        assert!(!report.disks.is_empty());
    }
}
