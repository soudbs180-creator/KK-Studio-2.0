use std::fs::{self, File, OpenOptions};
use std::io::{self, Read, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};

pub fn error(error: impl std::fmt::Display) -> String {
    format!("io: 素材文件操作失败：{error}")
}
fn checked_metadata(path: &Path) -> Result<Option<fs::Metadata>, String> {
    let metadata = match fs::symlink_metadata(path) {
        Ok(metadata) => metadata,
        Err(e) if e.kind() == io::ErrorKind::NotFound => return Ok(None),
        Err(e) => return Err(error(e)),
    };
    let mut link = metadata.file_type().is_symlink();
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        link |= metadata.file_attributes() & 0x400 != 0;
    }
    if link {
        return Err("corrupt: 素材路径不能是符号链接或重解析点".into());
    }
    Ok(Some(metadata))
}
pub fn directory(path: &Path) -> Result<(), String> {
    if let Some(metadata) = checked_metadata(path)? {
        if !metadata.is_dir() {
            return Err("corrupt: 素材目录被文件占用".into());
        }
    } else {
        fs::create_dir(path).map_err(error)?;
    }
    Ok(())
}
pub fn read(path: &Path, max: usize) -> Result<Option<Vec<u8>>, String> {
    let Some(metadata) = checked_metadata(path)? else {
        return Ok(None);
    };
    if !metadata.is_file() || metadata.len() > max as u64 {
        return Err("corrupt: 素材文件类型或大小无效".into());
    }
    let mut bytes = Vec::new();
    File::open(path)
        .map_err(error)?
        .take(max as u64 + 1)
        .read_to_end(&mut bytes)
        .map_err(error)?;
    if bytes.len() > max {
        return Err("corrupt: 素材文件超过大小限制".into());
    }
    Ok(Some(bytes))
}
pub fn original_exists(path: &Path, max: usize) -> Result<bool, String> {
    let Some(metadata) = checked_metadata(path)? else {
        return Ok(false);
    };
    if !metadata.is_file() || metadata.len() == 0 || metadata.len() > max as u64 {
        return Err("corrupt: 素材文件类型或大小无效".into());
    }
    Ok(true)
}
pub fn lock(root: &Path) -> Result<File, String> {
    let path = root.join("repository.lock");
    checked_metadata(&path)?;
    let mut options = OpenOptions::new();
    options.read(true).write(true).create(true).truncate(false);
    #[cfg(windows)]
    {
        use std::os::windows::fs::OpenOptionsExt;
        options.share_mode(0);
    }
    let file = options.open(path).map_err(error)?;
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
            return Err(error(io::Error::last_os_error()));
        }
    }
    Ok(file)
}
fn temporary(path: &Path) -> PathBuf {
    static NEXT: AtomicU64 = AtomicU64::new(0);
    let nonce = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    path.with_extension(format!(
        "tmp.{}.{nonce}.{}",
        std::process::id(),
        NEXT.fetch_add(1, Ordering::Relaxed)
    ))
}
fn sync_parent(path: &Path) -> Result<(), String> {
    #[cfg(unix)]
    File::open(path.parent().ok_or_else(|| error("缺少父目录"))?)
        .and_then(|file| file.sync_all())
        .map_err(error)?;
    #[cfg(not(unix))]
    let _ = path;
    Ok(())
}
pub fn atomic_write(path: &Path, bytes: &[u8], record: bool) -> Result<(), String> {
    let temp = temporary(path);
    let result = (|| {
        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temp)
            .map_err(error)?;
        file.write_all(bytes).map_err(error)?;
        #[cfg(test)]
        if record {
            super::tests::fail_at("record-before-sync")?;
        }
        file.sync_all().map_err(error)?;
        drop(file);
        if read(&temp, bytes.len())?.as_deref() != Some(bytes) {
            return Err("corrupt: 素材临时文件写后校验失败".into());
        }
        #[cfg(test)]
        if record {
            super::tests::fail_at("record-before-commit")?;
        }
        // All writers hold repository.lock. Existing immutable blobs must never be replaced.
        if !record && checked_metadata(path)?.is_some() {
            return Err("conflict: 素材原件已经存在".into());
        }
        fs::rename(&temp, path).map_err(error)?;
        sync_parent(path)
    })();
    if result.is_err() {
        let _ = fs::remove_file(temp);
    }
    result
}
