use crate::creation_storage::{atomic_write, durable_temp, sync_parent};
use serde::Serialize;
use serde_json::Value;
use std::fs::{self, File, OpenOptions};
use std::io;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

#[derive(Debug, Serialize)]
pub struct ProviderConfigRead {
    pub status: String,
    pub revision: Option<u64>,
    pub connections: Value,
}

/// Durable, non-secret provider connection metadata for Desktop. Secret
/// material never lives here: the schema only carries opaque credentialRefs
/// into the OS vault, and the writer rejects known secret field names.
pub struct ProviderConfigRepository {
    path: PathBuf,
    lock: Mutex<()>,
}

fn io_error(error: impl std::fmt::Display) -> String {
    format!("io: 供应商配置文件操作失败：{error}")
}
fn read_bytes(path: &Path) -> Result<Option<Vec<u8>>, String> {
    match fs::read(path) {
        Ok(raw) => Ok(Some(raw)),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(io_error(error)),
    }
}

fn is_secret_key(key: &str) -> bool {
    matches!(
        key.to_ascii_lowercase().as_str(),
        "api_key" | "apikey" | "secret" | "token" | "password" | "authorization" | "bearer"
    )
}

fn reject_secret_fields(value: &Value) -> Result<(), String> {
    match value {
        Value::Object(object) => {
            for (key, value) in object {
                if is_secret_key(key) {
                    return Err("unsupported: 供应商配置不能包含秘密字段，请改用系统凭据库".into());
                }
                reject_secret_fields(value)?;
            }
        }
        Value::Array(values) => {
            for value in values {
                reject_secret_fields(value)?;
            }
        }
        _ => {}
    }
    Ok(())
}

/// Reject secret material and malformed shapes before any file is touched.
/// Non-secret connection fields (baseUrl/model/credentialRef) pass unchanged.
fn validate_connections(value: &Value) -> Result<(), String> {
    reject_secret_fields(value)?;
    let entries = value
        .as_array()
        .ok_or("corrupt: 供应商配置 connections 必须是数组".to_string())?;
    for entry in entries {
        let object = entry
            .as_object()
            .ok_or("corrupt: 供应商配置条目必须是对象".to_string())?;
        if object.contains_key("protocol") || object.contains_key("authMode") {
            let field = |key: &str| -> Result<Option<&str>, String> {
                object
                    .get(key)
                    .map(|value| {
                        value
                            .as_str()
                            .ok_or_else(|| format!("corrupt: {key} 必须是字符串"))
                    })
                    .transpose()
            };
            crate::task_host::validate_provider_options(
                field("baseUrl")?.ok_or("corrupt: 缺少接口地址")?,
                field("protocol")?,
                field("authMode")?,
            )?;
        }
        for key in object.keys() {
            if is_secret_key(key) {
                return Err("unsupported: 供应商配置不能包含秘密字段，请改用系统凭据库".to_string());
            }
        }
    }
    Ok(())
}

impl ProviderConfigRepository {
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
            if unsafe { flock(file.as_raw_fd(), 2 | 4) } != 0 {
                return Err(io_error(io::Error::last_os_error()));
            }
        }
        Ok(file)
    }

    fn decode(raw: Vec<u8>) -> Result<(u64, Value), String> {
        let value: Value = serde_json::from_slice(&raw)
            .map_err(|_| "corrupt: 供应商配置不是有效的 JSON，已保留原文件".to_string())?;
        let object = value
            .as_object()
            .ok_or("corrupt: 供应商配置必须是对象，已保留原文件".to_string())?;
        let revision = object
            .get("revision")
            .and_then(|value| value.as_u64())
            .ok_or("corrupt: 供应商配置缺少 revision，已保留原文件".to_string())?;
        let connections = object
            .get("connections")
            .cloned()
            .unwrap_or_else(|| Value::Array(vec![]));
        validate_connections(&connections)?;
        Ok((revision, connections))
    }

    /// Read main, then the backup on a corrupt main. The original corrupt file
    /// is preserved on disk (archiving happens on the next successful write).
    fn current(&self) -> Result<(Option<u64>, Value, Option<Vec<u8>>, bool), String> {
        if let Some(raw) = read_bytes(&self.path)? {
            match Self::decode(raw.clone()) {
                Ok((revision, connections)) => {
                    return Ok((Some(revision), connections, Some(raw), false));
                }
                Err(error) if error.starts_with("corrupt:") => {
                    if let Some(backup) = read_bytes(&self.path.with_extension("json.bak"))? {
                        let (revision, connections) = Self::decode(backup)?;
                        return Ok((Some(revision), connections, Some(raw), true));
                    }
                    return Err(error);
                }
                Err(error) => return Err(error),
            }
        }
        Ok((None, Value::Array(vec![]), None, false))
    }

    pub fn read(&self) -> Result<ProviderConfigRead, String> {
        #[cfg(windows)]
        let _transaction = crate::provider_transaction::ProviderTransactionGuard::acquire()?;
        let _guard = self
            .lock
            .lock()
            .map_err(|_| io_error("供应商配置锁不可用"))?;
        let _file_lock = self.file_lock()?;
        let (revision, connections, _, recovered) = self.current()?;
        Ok(ProviderConfigRead {
            status: if recovered {
                "recovered".to_string()
            } else if revision.is_some() {
                "loaded".to_string()
            } else {
                "missing".to_string()
            },
            revision,
            connections,
        })
    }

    /// A failed first credential save must not establish an authoritative empty
    /// config over legacy browser metadata. Remove only this owned new revision.
    pub fn restore_missing(&self, expected_revision: u64) -> Result<(), String> {
        #[cfg(windows)]
        let _transaction = crate::provider_transaction::ProviderTransactionGuard::acquire()?;
        let _guard = self
            .lock
            .lock()
            .map_err(|_| io_error("供应商配置锁不可用"))?;
        let _file_lock = self.file_lock()?;
        if self.current()?.0 != Some(expected_revision) {
            return Err("conflict: 无法回退其他窗口的供应商配置".into());
        }
        fs::remove_file(&self.path).map_err(io_error)?;
        sync_parent(&self.path)
    }

    /// Durable commit. Returns the new revision; the caller must surface the
    /// error to the UI instead of reporting a fake success.
    pub fn write(&self, connections: Value, expected_revision: Option<u64>) -> Result<u64, String> {
        #[cfg(windows)]
        let _transaction = crate::provider_transaction::ProviderTransactionGuard::acquire()?;
        validate_connections(&connections)?;
        let _guard = self
            .lock
            .lock()
            .map_err(|_| io_error("供应商配置锁不可用"))?;
        let _file_lock = self.file_lock()?;
        let (revision, _, main_raw, recovered) = self.current()?;
        if revision != expected_revision {
            return Err(
                "conflict: 供应商配置已在其他窗口修改，请重新读取；内存数据已保留".to_string(),
            );
        }
        let next_revision = revision.map(|value| value + 1).unwrap_or(1);
        let payload = serde_json::json!({
            "schemaVersion": 1,
            "revision": next_revision,
            "connections": connections,
        });
        let raw = serde_json::to_vec_pretty(&payload).map_err(io_error)?;
        let temp = durable_temp(&self.path, &raw)?;
        let result = (|| {
            if let Some(existing) = main_raw {
                if !recovered {
                    atomic_write(&self.path.with_extension("json.bak"), &existing)?;
                }
            }
            fs::rename(&temp, &self.path).map_err(io_error)?;
            sync_parent(&self.path)
        })();
        if result.is_err() {
            let _ = fs::remove_file(&temp);
        }
        result?;
        Ok(next_revision)
    }
}

#[cfg(test)]
#[path = "provider_config_tests.rs"]
mod tests;
