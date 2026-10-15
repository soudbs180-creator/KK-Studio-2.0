use super::{
    catalog::{self, FileSpec},
    paths,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, HashSet};
use std::fs::{File, OpenOptions};
use std::io::{Read, Seek, SeekFrom, Write};
use std::sync::atomic::AtomicBool;

#[derive(Clone, Deserialize, Serialize, PartialEq, Debug)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct Extracted {
    pub path: String,
    pub bytes: u64,
    pub sha256: String,
}
#[derive(Clone, Deserialize, Serialize, Debug)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct RuntimeReceipt {
    pub version: u8,
    pub fingerprint: String,
    pub backend: String,
    pub release: String,
    pub revision: String,
    pub server: String,
    pub files: Vec<Extracted>,
    pub archives: Vec<String>,
}
pub(super) fn runtime_relative(backend: &str, archives: &[FileSpec]) -> String {
    let hashes = archives
        .iter()
        .map(|f| f.sha256.as_str())
        .collect::<Vec<_>>()
        .join(":");
    format!(
        "runtimes/llama-b11429/{backend}/{}",
        catalog::hash(hashes.as_bytes())
    )
}
fn directory_bounds(file: &mut File, bytes: u64) -> Result<usize, String> {
    if bytes < 22 || bytes > 1024 * 1024 * 1024 {
        return Err("archive: 运行时压缩包体积无效".into());
    }
    let length = usize::min(bytes as usize, 65557);
    let mut tail = vec![0u8; length];
    file.seek(SeekFrom::End(-(length as i64)))
        .map_err(paths::error)?;
    file.read_exact(&mut tail).map_err(paths::error)?;
    let at = tail
        .windows(4)
        .rposition(|b| b == b"PK\x05\x06")
        .ok_or("archive: ZIP 尾目录无效")?;
    if at + 22 > tail.len() {
        return Err("archive: ZIP 尾目录不完整".into());
    }
    let u16_at = |n| u16::from_le_bytes(tail[at + n..at + n + 2].try_into().unwrap());
    let u32_at = |n| u32::from_le_bytes(tail[at + n..at + n + 4].try_into().unwrap());
    let count = u16_at(10) as usize;
    if u16_at(4) != 0
        || u16_at(6) != 0
        || u16_at(8) != u16_at(10)
        || count == 0
        || count > 512
        || u32_at(12) > 1024 * 1024
        || at + 22 + u16_at(20) as usize != tail.len()
        || u32_at(16) as u64 + u32_at(12) as u64 != bytes - length as u64 + at as u64
    {
        return Err("archive: 不支持此运行时 ZIP 目录或多卷格式".into());
    }
    file.seek(SeekFrom::Start(0)).map_err(paths::error)?;
    Ok(count)
}
fn allowed(name: &str) -> bool {
    let name = name.to_ascii_lowercase();
    name == "llama-server.exe"
        || name.ends_with(".dll")
        || ["license", "licence", "copying", "notice"]
            .iter()
            .any(|prefix| name.starts_with(prefix))
}
fn read_archive(
    directory: &paths::Directory,
    archive: &FileSpec,
    target: Option<&str>,
    cancel: &AtomicBool,
) -> Result<Vec<Extracted>, String> {
    let source = directory.child(&archive.relative, false)?;
    if paths::file_hash(&source, archive.bytes, cancel)? != archive.sha256 {
        return Err("integrity: 引擎 ZIP 摘要不符".into());
    }
    let mut file = File::open(source).map_err(paths::error)?;
    let count = directory_bounds(&mut file, archive.bytes)?;
    let mut zip = zip::ZipArchive::new(file).map_err(|_| "archive: 运行时 ZIP 不可读取")?;
    if zip.len() != count {
        return Err("archive: ZIP 含重复目录或条目数量不符".into());
    }
    let mut names = HashSet::new();
    let mut total = 0u64;
    let mut extracted = Vec::new();
    for index in 0..zip.len() {
        paths::cancelled(cancel)?;
        let mut entry = zip
            .by_index(index)
            .map_err(|_| "archive: ZIP 条目不可读取")?;
        let name = entry.name().to_string();
        if !catalog::safe_relative(&name)
            || name.contains('/')
            || !names.insert(name.to_ascii_lowercase())
            || entry.encrypted()
            || entry.is_symlink()
            || entry
                .unix_mode()
                .is_some_and(|m| !matches!(m & 0o170000, 0 | 0o100000))
        {
            return Err("archive: 未确认的运行时布局、链接或重复成员".into());
        }
        total = total
            .checked_add(entry.size())
            .ok_or("archive: ZIP 长度溢出")?;
        if entry.size() > 2 * 1024u64.pow(3)
            || total > catalog::MAX_ARCHIVE_EXPANSION
            || entry.size() > entry.compressed_size().max(1).saturating_mul(1000)
        {
            return Err("archive: ZIP 解压体积超过限制".into());
        }
        if !allowed(&name) {
            continue;
        }
        let mut output = if let Some(target) = target {
            let path = directory.child(&format!("{target}/{name}"), true)?;
            let temp =
                directory.child(&format!("{target}/.entry-{}", paths::random_id()?), true)?;
            Some((
                OpenOptions::new()
                    .create_new(true)
                    .write(true)
                    .open(&temp)
                    .map_err(paths::error)?,
                temp,
                path,
            ))
        } else {
            None
        };
        let mut buffer = [0u8; 65536];
        let mut bytes = 0u64;
        let mut sha = Sha256::new();
        loop {
            paths::cancelled(cancel)?;
            let n = entry
                .read(&mut buffer)
                .map_err(|_| "archive: ZIP 校验或解压失败")?;
            if n == 0 {
                break;
            }
            bytes += n as u64;
            if bytes > entry.size() {
                return Err("archive: 成员实际体积超过声明".into());
            }
            sha.update(&buffer[..n]);
            if let Some((file, _, _)) = &mut output {
                file.write_all(&buffer[..n]).map_err(paths::error)?;
            }
        }
        if bytes != entry.size() {
            return Err("archive: ZIP 成员长度不符".into());
        }
        let sha256 = format!("{:x}", sha.finalize());
        if let Some((file, temp, path)) = output {
            file.sync_all().map_err(paths::error)?;
            drop(file);
            if paths::file_hash(&temp, bytes, cancel)? != sha256 {
                return Err("integrity: 引擎成员写后校验失败".into());
            }
            if paths::metadata(&path)?.is_some() {
                if paths::file_hash(&path, bytes, cancel)? != sha256 {
                    return Err("conflict: CUDA 运行时成员内容冲突".into());
                }
                std::fs::remove_file(&temp).map_err(paths::error)?;
            } else {
                paths::rename(&temp, &path, false)?;
            }
        }
        extracted.push(Extracted {
            path: name,
            bytes,
            sha256,
        });
    }
    Ok(extracted)
}
fn merge(files: &mut BTreeMap<String, Extracted>, entries: Vec<Extracted>) -> Result<(), String> {
    for file in entries {
        let key = file.path.to_ascii_lowercase();
        if let Some(old) = files.get(&key) {
            if old.bytes != file.bytes || old.sha256 != file.sha256 {
                return Err("conflict: 固定引擎压缩包成员冲突".into());
            }
        } else {
            files.insert(key, file);
        }
    }
    if files.len() > 128 {
        return Err("archive: 引擎文件清单超过上限".into());
    }
    Ok(())
}
pub(super) fn validate(
    directory: &paths::Directory,
    relative: &str,
    expected: &[FileSpec],
    backend: &str,
    cancel: &AtomicBool,
) -> Result<RuntimeReceipt, String> {
    let value = paths::read_record(&directory.child(&format!("{relative}/receipt.json"), false)?)?
        .ok_or("missing: 运行时安装回执缺失")?;
    let receipt: RuntimeReceipt =
        serde_json::from_value(value).map_err(|_| "corrupt: 运行时回执损坏")?;
    let hashes = expected
        .iter()
        .map(|f| f.sha256.clone())
        .collect::<Vec<_>>();
    if receipt.version != 1
        || receipt.backend != backend
        || receipt.release != "b11429"
        || receipt.revision != "d81235049384534c167caea52b85a694f6103d14"
        || receipt.archives != hashes
        || receipt.server != "llama-server.exe"
        || receipt.files.is_empty()
        || receipt.files.len() > 128
        || receipt.fingerprint != catalog::hash(hashes.join(":").as_bytes())
    {
        return Err("unsupported: 运行时身份或回执版本不符".into());
    }
    // A local editable receipt is not executable trust: derive member hashes again from pinned ZIPs.
    let mut trusted = BTreeMap::new();
    for spec in expected {
        merge(&mut trusted, read_archive(directory, spec, None, cancel)?)?;
    }
    if receipt.files != trusted.into_values().collect::<Vec<_>>() {
        return Err("integrity: 运行时回执与固定 ZIP 内容不符".into());
    }
    let mut names = HashSet::new();
    let mut server = false;
    for file in &receipt.files {
        if !catalog::safe_relative(&file.path)
            || file.path.contains('/')
            || !allowed(&file.path)
            || !names.insert(file.path.to_ascii_lowercase())
            || !catalog::hex(&file.sha256, 64)
            || file.bytes > 2 * 1024u64.pow(3)
        {
            return Err("corrupt: 运行时文件清单无效".into());
        }
        if file.path == receipt.server {
            server = true;
        }
        if paths::file_hash(
            &directory.child(&format!("{relative}/{}", file.path), false)?,
            file.bytes,
            cancel,
        )? != file.sha256
        {
            return Err("integrity: 已安装运行时内容改变".into());
        }
    }
    if !server {
        return Err("missing: 固定 llama-server.exe 缺失".into());
    }
    let folder = directory.child(relative, false)?;
    let mut count = 0;
    for entry in std::fs::read_dir(folder).map_err(paths::error)? {
        let name = entry
            .map_err(paths::error)?
            .file_name()
            .to_string_lossy()
            .into_owned();
        let path = directory.child(&format!("{relative}/{name}"), false)?;
        if !paths::metadata(&path)?.is_some_and(|m| m.is_file())
            || name != "receipt.json" && !names.contains(&name.to_ascii_lowercase())
        {
            return Err("integrity: 引擎目录含未受信成员".into());
        }
        count += 1;
    }
    if count != receipt.files.len() + 1 {
        return Err("integrity: 引擎目录清单不符".into());
    }
    Ok(receipt)
}
pub(super) fn unpack(
    directory: &paths::Directory,
    archives: &[FileSpec],
    backend: &str,
    cancel: &AtomicBool,
) -> Result<String, String> {
    if archives.is_empty() {
        return Err("catalog: 未选择运行时压缩包".into());
    }
    let relative = runtime_relative(backend, archives);
    if paths::metadata(&directory.child(&relative, false)?)?.is_some() {
        validate(directory, &relative, archives, backend, cancel)?;
        return Ok(relative);
    }
    let staging = format!(".runtime-staging/{}", paths::random_id()?);
    let mut merged = BTreeMap::new();
    for archive in archives {
        merge(
            &mut merged,
            read_archive(directory, archive, Some(&staging), cancel)?,
        )?;
    }
    let files = merged.into_values().collect::<Vec<_>>();
    if files.len() > 128 || !files.iter().any(|f| f.path == "llama-server.exe") {
        return Err("archive: 固定服务端或受限布局未确认".into());
    }
    let hashes = archives
        .iter()
        .map(|f| f.sha256.clone())
        .collect::<Vec<_>>();
    let receipt = RuntimeReceipt {
        version: 1,
        fingerprint: catalog::hash(hashes.join(":").as_bytes()),
        backend: backend.into(),
        release: "b11429".into(),
        revision: "d81235049384534c167caea52b85a694f6103d14".into(),
        server: "llama-server.exe".into(),
        files,
        archives: hashes,
    };
    paths::write_record(
        &directory.child(&format!("{staging}/receipt.json"), true)?,
        &serde_json::to_value(&receipt).map_err(paths::error)?,
    )?;
    paths::cancelled(cancel)?;
    let target = directory.child(&relative, true)?;
    paths::rename(&directory.child(&staging, false)?, &target, false)?;
    validate(directory, &relative, archives, backend, cancel)?;
    Ok(relative)
}
pub(super) fn staging_bytes(
    directory: Option<&paths::Directory>,
    archives: &[FileSpec],
    backend: &str,
    cancel: &AtomicBool,
) -> Result<u64, String> {
    if archives.is_empty() {
        return Ok(0);
    }
    if let Some(dir) = directory {
        let relative = runtime_relative(backend, archives);
        if paths::metadata(&dir.child(&relative, false)?)?.is_some() {
            validate(dir, &relative, archives, backend, cancel)?;
            return Ok(0);
        }
    }
    archives.iter().try_fold(0u64, |total, spec| {
        let expansion = match directory {
            Some(dir) if paths::metadata(&dir.child(&spec.relative, false)?)?.is_some() => {
                read_archive(dir, spec, None, cancel)?
                    .iter()
                    .map(|f| f.bytes)
                    .sum()
            }
            _ => catalog::MAX_ARCHIVE_EXPANSION,
        };
        total
            .checked_add(expansion)
            .ok_or_else(|| "catalog: 引擎提取空间溢出".into())
    })
}
#[cfg(test)]
#[path = "archive_tests.rs"]
mod tests;
