//! Metadata and vault writers share a Windows-session mutex or a Unix file lock.
//! Guards stay on their acquiring thread; secrets never enter metadata or receipts.
use crate::provider_config::ProviderConfigRepository;
use serde::Serialize;
use serde_json::Value;
use std::marker::PhantomData;
use std::rc::Rc;

pub const CREDENTIAL_SERVICE: &str = "com.kkstudio.provider";
#[cfg(unix)]
thread_local! {
    static UNIX_TRANSACTION: std::cell::RefCell<Option<(std::path::PathBuf, std::fs::File, usize)>> = const { std::cell::RefCell::new(None) };
}

pub struct ProviderTransactionGuard {
    #[cfg(windows)]
    handle: windows_sys::Win32::Foundation::HANDLE,
    _thread: PhantomData<Rc<()>>,
}

impl ProviderTransactionGuard {
    #[cfg(unix)]
    fn acquire_unix(root: &std::path::Path) -> Result<Self, String> {
        UNIX_TRANSACTION.with(|state| {
            let mut state = state.borrow_mut();
            if let Some((held, _, depth)) = state.as_mut() {
                if held != root {
                    return Err("lock: 凭据事务目录不一致".into());
                }
                *depth += 1;
            } else {
                crate::asset_io::directory(root)?;
                let file = crate::asset_io::lock(root)
                    .map_err(|_| "lock: 系统凭据共享锁不可用，请重试")?;
                *state = Some((root.to_path_buf(), file, 1));
            }
            Ok(Self {
                _thread: PhantomData,
            })
        })
    }

    pub fn acquire() -> Result<Self, String> {
        #[cfg(windows)]
        {
            use windows_sys::Win32::Foundation::{CloseHandle, WAIT_ABANDONED, WAIT_OBJECT_0};
            use windows_sys::Win32::System::Threading::{
                CreateMutexW, ReleaseMutex, WaitForSingleObject,
            };
            let name: Vec<u16> = "Local\\com.kkstudio.provider.transaction.v1\0"
                .encode_utf16()
                .collect();
            // Default token DACL; non-inherited, shared by this Windows session.
            let handle = unsafe { CreateMutexW(std::ptr::null(), 0, name.as_ptr()) };
            if handle.is_null() {
                return Err("lock: 无法创建系统凭据共享锁，请重试".into());
            }
            let result = unsafe { WaitForSingleObject(handle, 10_000) };
            if result == WAIT_OBJECT_0 {
                return Ok(Self {
                    handle,
                    _thread: PhantomData,
                });
            }
            if result == WAIT_ABANDONED {
                // Ownership was granted, but a previous writer died. Fail closed
                // for this attempt instead of silently treating it as normal.
                unsafe {
                    ReleaseMutex(handle);
                }
            }
            unsafe {
                CloseHandle(handle);
            }
            return Err(if result == WAIT_ABANDONED {
                "lock: 上次凭据保存异常中断，请重新读取连接后重试"
            } else {
                "lock: 系统凭据共享锁不可用或超时，请重试"
            }
            .into());
        }
        #[cfg(unix)]
        {
            let root = std::env::temp_dir()
                .join(format!("kk-studio-provider-transactions-{}", unsafe {
                    libc::geteuid()
                }));
            Self::acquire_unix(&root)
        }
        #[cfg(not(any(windows, unix)))]
        Err("unsupported: 当前桌面平台不支持安全凭据事务".into())
    }
}

#[cfg(windows)]
impl Drop for ProviderTransactionGuard {
    fn drop(&mut self) {
        unsafe {
            windows_sys::Win32::System::Threading::ReleaseMutex(self.handle);
            windows_sys::Win32::Foundation::CloseHandle(self.handle);
        }
    }
}

#[cfg(unix)]
impl Drop for ProviderTransactionGuard {
    fn drop(&mut self) {
        UNIX_TRANSACTION.with(|state| {
            let mut state = state.borrow_mut();
            if let Some((_, _, depth)) = state.as_mut() {
                *depth -= 1;
                if *depth == 0 {
                    *state = None;
                }
            }
        });
    }
}

pub fn validate_provider_id(provider_id: &str) -> Result<(), String> {
    if provider_id.is_empty()
        || provider_id.len() > 128
        || !provider_id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
    {
        return Err("凭据提供商 ID 无效".into());
    }
    Ok(())
}

pub trait CredentialVault {
    fn set(&self, provider_id: &str, secret: &str) -> Result<(), String>;
    fn delete(&self, provider_id: &str) -> Result<(), String>;
}
pub struct SystemCredentialVault;
#[cfg(windows)]
fn entry(provider_id: &str) -> Result<keyring::Entry, String> {
    keyring::Entry::new(CREDENTIAL_SERVICE, provider_id)
        .map_err(|_| "无法访问 Windows 凭据管理器".into())
}
impl CredentialVault for SystemCredentialVault {
    fn set(&self, provider_id: &str, secret: &str) -> Result<(), String> {
        #[cfg(windows)]
        {
            entry(provider_id)?
                .set_password(secret)
                .map_err(|_| "无法写入 Windows 凭据管理器".into())
        }
        #[cfg(not(windows))]
        {
            crate::system_credentials::set(provider_id, secret.to_owned()).map(|_| ())
        }
    }
    fn delete(&self, provider_id: &str) -> Result<(), String> {
        #[cfg(windows)]
        {
            match entry(provider_id)?.delete_credential() {
                Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
                Err(_) => Err("无法删除 Windows 凭据".into()),
            }
        }
        #[cfg(not(windows))]
        {
            crate::system_credentials::delete(provider_id).map(|_| ())
        }
    }
}

pub fn set_credential(provider_id: &str, secret: &str) -> Result<bool, String> {
    validate_provider_id(provider_id)?;
    if secret.trim().is_empty() || secret.len() > 64 * 1024 {
        return Err("凭据内容为空或过长".into());
    }
    let _guard = ProviderTransactionGuard::acquire()?;
    SystemCredentialVault.set(provider_id, secret.trim())?;
    Ok(true)
}
pub fn get_credential(provider_id: &str) -> Result<Option<String>, String> {
    validate_provider_id(provider_id)?;
    let _guard = ProviderTransactionGuard::acquire()?;
    #[cfg(windows)]
    {
        match entry(provider_id)?.get_password() {
            Ok(secret) => Ok(Some(secret)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(_) => Err("无法读取 Windows 凭据管理器".into()),
        }
    }
    #[cfg(not(windows))]
    crate::system_credentials::get(provider_id)
}
pub fn delete_credential(provider_id: &str) -> Result<bool, String> {
    validate_provider_id(provider_id)?;
    let _guard = ProviderTransactionGuard::acquire()?;
    #[cfg(windows)]
    {
        match entry(provider_id)?.delete_credential() {
            Ok(()) => Ok(true),
            Err(keyring::Error::NoEntry) => Ok(false),
            Err(_) => Err("无法删除 Windows 凭据".into()),
        }
    }
    #[cfg(not(windows))]
    crate::system_credentials::delete(provider_id)
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderCommitReceipt {
    pub revision: u64,
    pub credential_state: &'static str,
}

pub fn commit_provider_connection(
    repository: &ProviderConfigRepository,
    vault: &impl CredentialVault,
    connections: Value,
    expected_revision: Option<u64>,
    provider_id: Option<&str>,
    secret: Option<&str>,
    clear_secret: bool,
) -> Result<ProviderCommitReceipt, String> {
    if clear_secret && secret.is_some() {
        return Err("凭据操作不能同时写入和清除".into());
    }
    if secret.is_some() || clear_secret {
        validate_provider_id(provider_id.ok_or("凭据操作缺少提供商 ID")?)?;
        if let Some(value) = secret {
            if value.trim().is_empty() || value.len() > 64 * 1024 {
                return Err("凭据内容为空或过长".into());
            }
        }
    }
    let _guard = ProviderTransactionGuard::acquire()?;
    let previous = repository.read()?;
    // The global lock remains held through vault IO and CAS compensation.
    let revision = repository.write(connections, expected_revision)?;
    let credential_result = if let Some(value) = secret {
        vault
            .set(provider_id.unwrap(), value.trim())
            .map(|_| "saved")
    } else if clear_secret {
        vault.delete(provider_id.unwrap()).map(|_| "missing")
    } else {
        Ok("unchanged")
    };
    match credential_result {
        Ok(credential_state) => Ok(ProviderCommitReceipt {
            revision,
            credential_state,
        }),
        Err(_) => {
            let rollback = if previous.revision.is_none() {
                repository.restore_missing(revision)
            } else {
                repository
                    .write(previous.connections, Some(revision))
                    .map(|_| ())
            };
            rollback.map_err(|_| "credential: 系统凭据操作失败，元数据回退未完成；请重新读取并检查连接，未主动覆盖其他凭据".to_string())?;
            Err("credential: 系统凭据操作失败，连接信息已回退；请检查系统凭据库后重试".into())
        }
    }
}

// Intentional process termination must not abandon the session mutex into another fixture.
#[cfg(test)]
pub(crate) fn provider_test_guard() -> std::sync::MutexGuard<'static, ()> {
    static GATE: std::sync::Mutex<()> = std::sync::Mutex::new(());
    GATE.lock().unwrap_or_else(|error| error.into_inner())
}

#[cfg(all(test, windows))]
#[path = "provider_transaction_tests.rs"]
mod tests;

#[cfg(all(test, unix))]
mod unix_tests {
    use super::*;
    #[test]
    fn shared_transaction_lock_is_exclusive_and_released() {
        let root = std::env::temp_dir().join(format!(
            "kk-provider-lock-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let first = ProviderTransactionGuard::acquire_unix(&root).unwrap();
        let nested = ProviderTransactionGuard::acquire_unix(&root).unwrap();
        drop(first);
        let other = root.clone();
        assert!(
            std::thread::spawn(move || ProviderTransactionGuard::acquire_unix(&other).is_err())
                .join()
                .unwrap()
        );
        drop(nested);
        drop(ProviderTransactionGuard::acquire_unix(&root).unwrap());
        std::fs::remove_dir_all(root).unwrap();
    }
}
