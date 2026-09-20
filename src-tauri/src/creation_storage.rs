use serde::Serialize;
use serde_json::Value;
use std::fs::{self, File, OpenOptions};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;

#[cfg(test)]
#[path = "creation_storage_tests.rs"]
mod tests;
#[path = "creation_validation.rs"]
mod validation;

#[derive(Debug, Serialize)]
pub struct ReadResult {
    pub status: String,
    pub snapshot: Option<Value>,
}

pub struct SnapshotRepository {
    path: PathBuf,
    lock: Mutex<()>,
}

struct Stored {
    value: Value,
    raw: Vec<u8>,
}
struct Current {
    stored: Option<Stored>,
    recovered: bool,
    corrupt_main: Option<Vec<u8>>,
}
fn io_error(error: impl std::fmt::Display) -> String {
    format!("io: 项目快照文件操作失败：{error}")
}
fn read_bytes(path: &Path) -> Result<Option<Vec<u8>>, String> {
    match fs::read(path) {
        Ok(raw) => Ok(Some(raw)),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(io_error(error)),
    }
}
fn decode(raw: Vec<u8>) -> Result<Stored, String> {
    let value = serde_json::from_slice(&raw)
        .map_err(|_| "corrupt: 项目快照不是有效的 JSON，已保留原文件".to_string())?;
    validation::validate(&value)?;
    Ok(Stored { value, raw })
}

impl SnapshotRepository {
    pub fn new(path: PathBuf) -> Self {
        Self {
            path,
            lock: Mutex::new(()),
        }
    }

    /// Serialize reads and writes across desktop processes without stale lock files.
    fn file_lock(&self) -> Result<File, String> {
        let mut options = OpenOptions::new();
        options.read(true).write(true).create(true);
        #[cfg(windows)]
        {
            use std::os::windows::fs::OpenOptionsExt;
            options.share_mode(0);
        }
        let file = options
            .open(self.path.with_extension("json.lock"))
            .map_err(io_error)?;
        #[cfg(unix)]
        {
            use std::os::fd::AsRawFd;
            extern "C" {
                fn flock(
                    fd: std::os::raw::c_int,
                    operation: std::os::raw::c_int,
                ) -> std::os::raw::c_int;
            }
            // LOCK_EX | LOCK_NB; the OS releases the advisory lock on close/crash.
            if unsafe { flock(file.as_raw_fd(), 2 | 4) } != 0 {
                return Err(io_error(io::Error::last_os_error()));
            }
        }
        Ok(file)
    }

    fn current(&self) -> Result<Current, String> {
        let main_raw = read_bytes(&self.path)?;
        let mut corrupt_main = None;
        if let Some(raw) = main_raw {
            match decode(raw.clone()) {
                Ok(stored) => {
                    return Ok(Current {
                        stored: Some(stored),
                        recovered: false,
                        corrupt_main: None,
                    })
                }
                Err(error) if error.starts_with("corrupt:") => corrupt_main = Some(raw),
                Err(error) => return Err(error),
            }
        }
        if let Some(raw) = read_bytes(&self.path.with_extension("json.bak"))? {
            let stored = decode(raw)?;
            return Ok(Current {
                stored: Some(stored),
                recovered: true,
                corrupt_main,
            });
        }
        if corrupt_main.is_some() {
            return Err("corrupt: 主项目快照损坏且没有有效备份，已保留原文件".to_string());
        }
        Ok(Current {
            stored: None,
            recovered: false,
            corrupt_main: None,
        })
    }

    pub fn read(&self) -> Result<ReadResult, String> {
        let _guard = self.lock.lock().map_err(|_| io_error("项目快照锁不可用"))?;
        let _file_lock = self.file_lock()?;
        let current = self.current()?;
        Ok(ReadResult {
            status: if current.recovered {
                "recovered"
            } else if current.stored.is_some() {
                "loaded"
            } else {
                "missing"
            }
            .to_string(),
            snapshot: current.stored.map(|stored| stored.value),
        })
    }

    pub fn write(&self, snapshot: Value, expected_revision: Option<u64>) -> Result<(), String> {
        validation::validate(&snapshot)?;
        let _guard = self.lock.lock().map_err(|_| io_error("项目快照锁不可用"))?;
        let _file_lock = self.file_lock()?;
        let current = self.current()?;
        let revision = current
            .stored
            .as_ref()
            .and_then(|stored| stored.value["revision"].as_u64());
        if revision != expected_revision {
            return Err("conflict: 项目已在其他窗口修改，请重新读取；内存草稿已保留".to_string());
        }
        if let Some(stored) = &current.stored {
            if stored.value == snapshot {
                return Ok(());
            }
            if snapshot["revision"].as_u64() <= revision {
                return Err("conflict: 新快照 revision 必须递增".to_string());
            }
        }
        let raw = serde_json::to_vec_pretty(&snapshot).map_err(io_error)?;
        let temp = durable_temp(&self.path, &raw)?;
        let result = (|| {
            if let Some(raw) = &current.corrupt_main {
                self.archive("corrupt", raw)?;
            }
            if let Some(stored) = &current.stored {
                let has_legacy_canvas =
                    stored.value["projects"].as_array().is_some_and(|projects| {
                        projects
                            .iter()
                            .any(|project| project.get("canvas").is_none())
                    });
                if has_legacy_canvas {
                    self.archive("pre-canvas-v1", &stored.raw)?;
                }
                if !current.recovered {
                    let backup = self.path.with_extension("json.bak");
                    if let Some(previous) = read_bytes(&backup)? {
                        if let Err(error) = decode(previous.clone()) {
                            if error.starts_with("unsupported:") {
                                return Err(error);
                            }
                            self.archive("corrupt-backup", &previous)?;
                        }
                    }
                    atomic_write(&backup, &stored.raw)?;
                }
            }
            #[cfg(test)]
            tests::fail_at("before-commit")?;
            fs::rename(&temp, &self.path).map_err(io_error)?;
            sync_parent(&self.path)
        })();
        if result.is_err() {
            let _ = fs::remove_file(&temp);
        }
        result
    }

    fn archive(&self, label: &str, raw: &[u8]) -> Result<(), String> {
        let path = unique_path(&self.path, label);
        let temp = durable_temp(&path, raw)?;
        if let Err(error) = fs::rename(&temp, &path)
            .map_err(io_error)
            .and_then(|_| sync_parent(&path))
        {
            let _ = fs::remove_file(temp);
            return Err(error);
        }
        Ok(())
    }
}

/// Validates a snapshot without reading or mutating a repository. Package
/// preflight uses the same schema as the durable snapshot writer.
pub fn validate_snapshot_value(snapshot: &Value) -> Result<(), String> {
    validation::validate(snapshot)
}

fn unique_path(path: &Path, label: &str) -> PathBuf {
    static NEXT: AtomicU64 = AtomicU64::new(0);
    let nonce = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    path.with_extension(format!(
        "json.{label}.{}.{nonce}.{}",
        std::process::id(),
        NEXT.fetch_add(1, Ordering::Relaxed)
    ))
}
fn durable_temp(path: &Path, raw: &[u8]) -> Result<PathBuf, String> {
    let temp = unique_path(path, "tmp");
    let result = (|| {
        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temp)
            .map_err(io_error)?;
        file.write_all(raw).map_err(io_error)?;
        #[cfg(test)]
        tests::fail_at("before-sync")?;
        file.sync_all().map_err(io_error)?;
        Ok(())
    })();
    if let Err(error) = result {
        let _ = fs::remove_file(&temp);
        return Err(error);
    }
    Ok(temp)
}
fn atomic_write(path: &Path, raw: &[u8]) -> Result<(), String> {
    let temp = durable_temp(path, raw)?;
    if let Err(error) = fs::rename(&temp, path)
        .map_err(io_error)
        .and_then(|_| sync_parent(path))
    {
        let _ = fs::remove_file(temp);
        return Err(error);
    }
    Ok(())
}
fn sync_parent(path: &Path) -> Result<(), String> {
    // Windows cannot open directories through std File for sync_all. Replacement
    // payloads have already been flushed through the temporary file handle.
    #[cfg(unix)]
    File::open(path.parent().ok_or_else(|| io_error("缺少父目录"))?)
        .and_then(|file| file.sync_all())
        .map_err(io_error)?;
    #[cfg(not(unix))]
    let _ = path;
    Ok(())
}
