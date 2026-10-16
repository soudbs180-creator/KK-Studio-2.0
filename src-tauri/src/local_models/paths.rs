use super::catalog::{hash, safe_relative};
use sha2::{Digest, Sha256};
use std::fs::{self, File, OpenOptions};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};

pub(super) fn error(_: impl std::fmt::Display) -> String {
    "io: 本地模型文件操作失败；原文件已保留".into()
}
pub(super) fn random_id() -> Result<String, String> {
    let mut value = [0u8; 16];
    getrandom::fill(&mut value).map_err(|_| "io: 无法建立本机操作身份")?;
    Ok(value.iter().map(|b| format!("{b:02x}")).collect())
}
#[cfg(windows)]
pub(super) fn system_directory() -> Result<PathBuf, String> {
    use std::os::windows::ffi::OsStringExt;
    #[link(name = "kernel32")]
    extern "system" {
        fn GetSystemDirectoryW(path: *mut u16, length: u32) -> u32;
    }
    let mut buffer = vec![0u16; 32768];
    let length = unsafe { GetSystemDirectoryW(buffer.as_mut_ptr(), buffer.len() as u32) } as usize;
    if length == 0 || length >= buffer.len() {
        return Err("unsupported: 无法核验系统目录".into());
    }
    Ok(PathBuf::from(std::ffi::OsString::from_wide(
        &buffer[..length],
    )))
}
pub(super) fn metadata(path: &Path) -> Result<Option<fs::Metadata>, String> {
    let meta = match fs::symlink_metadata(path) {
        Ok(m) => m,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(e) => return Err(error(e)),
    };
    let mut link = meta.file_type().is_symlink();
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        link |= meta.file_attributes() & 0x400 != 0;
    }
    if link {
        return Err("path: 本地模型受控路径不能包含重解析点".into());
    }
    Ok(Some(meta))
}
pub(super) struct Directory {
    pub root: PathBuf,
    pub identity: String,
    _handle: File,
}
impl Directory {
    pub fn open(selected: &Path) -> Result<Self, String> {
        if !selected.is_absolute() {
            return Err("path: 请选择本机绝对目录".into());
        }
        let root = dunce::canonicalize(selected).map_err(error)?;
        #[cfg(windows)]
        {
            let text = root.to_string_lossy();
            let b = text.as_bytes();
            if b.len() < 3
                || !b[0].is_ascii_alphabetic()
                || b[1] != b':'
                || !matches!(b[2], b'\\' | b'/')
            {
                return Err("path: 不使用网络共享或设备目录".into());
            }
        }
        if !metadata(&root)?.is_some_and(|m| m.is_dir()) {
            return Err("path: 目标不是目录".into());
        }
        let mut options = OpenOptions::new();
        options.read(true);
        #[cfg(windows)]
        {
            use std::os::windows::fs::OpenOptionsExt;
            options.custom_flags(0x02000000).share_mode(3);
        }
        let handle = options.open(&root).map_err(error)?;
        let identity = directory_identity(&handle)?;
        Ok(Self {
            root,
            identity,
            _handle: handle,
        })
    }
    pub fn child(&self, relative: &str, create_parents: bool) -> Result<PathBuf, String> {
        if !safe_relative(relative) {
            return Err("path: 模型路径越界或包含无效名称".into());
        }
        if directory_identity(&self._handle)? != self.identity {
            return Err("conflict: 模型目录身份改变".into());
        }
        let mut current = self.root.clone();
        let parts: Vec<_> = relative.split('/').collect();
        for (index, part) in parts.iter().enumerate() {
            current.push(part);
            if index + 1 == parts.len() {
                metadata(&current)?;
            } else {
                match metadata(&current)? {
                    Some(m) if m.is_dir() => (),
                    Some(_) => return Err("conflict: 模型父目录被文件占用".into()),
                    None if create_parents => fs::create_dir(&current).map_err(error)?,
                    None => (),
                }
            }
        }
        Ok(current)
    }
    pub fn managed(&self, create: bool) -> Result<Self, String> {
        let path = self.child("KK-Studio-models/v1/.identity", create)?;
        Self::open(path.parent().ok_or("path: 目录缺失")?)
    }
}
fn directory_identity(file: &File) -> Result<String, String> {
    Ok(file_information(file)?.0)
}
#[cfg(windows)]
fn file_information(file: &File) -> Result<(String, u64), String> {
    use std::os::windows::io::AsRawHandle;
    #[repr(C)]
    struct Info {
        attributes: u32,
        created: [u32; 2],
        accessed: [u32; 2],
        written: [u32; 2],
        volume: u32,
        high: u32,
        low: u32,
        links: u32,
        index_high: u32,
        index_low: u32,
    }
    #[link(name = "kernel32")]
    extern "system" {
        fn GetFileInformationByHandle(handle: *mut std::ffi::c_void, info: *mut Info) -> i32;
    }
    let mut info: Info = unsafe { std::mem::zeroed() };
    if unsafe { GetFileInformationByHandle(file.as_raw_handle(), &mut info) } == 0 {
        return Err(error("identity"));
    }
    if info.attributes & 0x400 != 0 {
        return Err("conflict: 文件句柄指向重解析点".into());
    }
    Ok((
        format!(
            "{:08x}{:08x}{:08x}",
            info.volume, info.index_high, info.index_low
        ),
        info.links as u64,
    ))
}
#[cfg(unix)]
fn file_information(file: &File) -> Result<(String, u64), String> {
    use std::os::unix::fs::MetadataExt;
    let m = file.metadata().map_err(error)?;
    Ok((format!("{}:{}", m.dev(), m.ino()), m.nlink()))
}
pub(super) fn partial_identity(file: &File, path: &Path) -> Result<String, String> {
    if !file.metadata().map_err(error)?.is_file() {
        return Err("conflict: 部分文件句柄类型无效".into());
    }
    let (identity, links) = file_information(file)?;
    if links != 1 {
        return Err("conflict: 部分文件含硬链接，未写入原件".into());
    }
    #[cfg(windows)]
    {
        use std::os::windows::{ffi::OsStringExt, io::AsRawHandle};
        #[link(name = "kernel32")]
        extern "system" {
            fn GetFinalPathNameByHandleW(
                handle: *mut std::ffi::c_void,
                path: *mut u16,
                length: u32,
                flags: u32,
            ) -> u32;
        }
        let mut buffer = vec![0u16; 32768];
        let length = unsafe {
            GetFinalPathNameByHandleW(
                file.as_raw_handle(),
                buffer.as_mut_ptr(),
                buffer.len() as u32,
                0,
            )
        } as usize;
        if length == 0 || length >= buffer.len() {
            return Err("conflict: 部分文件实际路径无法核验".into());
        }
        let actual = PathBuf::from(std::ffi::OsString::from_wide(&buffer[..length]));
        if !dunce::simplified(&actual)
            .to_string_lossy()
            .eq_ignore_ascii_case(&path.to_string_lossy())
        {
            return Err("conflict: 部分文件实际路径改变".into());
        }
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::MetadataExt;
        let current = metadata(path)?.ok_or("conflict: 部分文件路径丢失")?;
        if identity != format!("{}:{}", current.dev(), current.ino()) {
            return Err("conflict: 部分文件身份改变".into());
        }
    }
    Ok(identity)
}
pub(super) fn partial_unchanged(file: &File, identity: &str) -> Result<(), String> {
    let (current, links) = file_information(file)?;
    if links != 1 || current != identity {
        return Err("conflict: 部分文件身份或硬链接改变，未写入".into());
    }
    Ok(())
}

pub(super) fn lock(path: &Path) -> Result<File, String> {
    metadata(path)?;
    let mut options = OpenOptions::new();
    options.read(true).write(true).create(true).truncate(false);
    #[cfg(windows)]
    {
        use std::os::windows::fs::OpenOptionsExt;
        options.share_mode(0);
    }
    let file = options
        .open(path)
        .map_err(|_| "busy: 模型目标正在被其他操作使用")?;
    #[cfg(unix)]
    {
        use std::os::fd::AsRawFd;
        extern "C" {
            fn flock(fd: i32, operation: i32) -> i32;
        }
        if unsafe { flock(file.as_raw_fd(), 2 | 4) } != 0 {
            return Err("busy: 模型目标正在被其他操作使用".into());
        }
    }
    Ok(file)
}
pub(super) fn cancelled(flag: &AtomicBool) -> Result<(), String> {
    if flag.load(Ordering::Acquire) {
        Err("cancelled: 安装已取消，已接收部分可继续".into())
    } else {
        Ok(())
    }
}
pub(super) fn file_hash(path: &Path, expected: u64, cancel: &AtomicBool) -> Result<String, String> {
    if !metadata(path)?.is_some_and(|m| m.is_file() && m.len() == expected) {
        return Err("integrity: 模型文件长度不符".into());
    }
    let mut file = File::open(path).map_err(error)?;
    let mut sha = Sha256::new();
    let mut buffer = [0u8; 64 * 1024];
    let mut read = 0u64;
    loop {
        cancelled(cancel)?;
        let n = file.read(&mut buffer).map_err(error)?;
        if n == 0 {
            break;
        }
        read = read
            .checked_add(n as u64)
            .ok_or("integrity: 文件长度溢出")?;
        if read > expected {
            return Err("integrity: 模型文件在校验时改变".into());
        }
        sha.update(&buffer[..n]);
    }
    if read != expected {
        return Err("integrity: 模型文件在校验时改变".into());
    }
    Ok(format!("{:x}", sha.finalize()))
}
pub(super) fn read_record(path: &Path) -> Result<Option<serde_json::Value>, String> {
    let Some(m) = metadata(path)? else {
        return Ok(None);
    };
    if !m.is_file() || m.len() > 1024 * 1024 {
        return Err("unsupported: 模型记录类型或体积无效".into());
    }
    let mut raw = Vec::new();
    File::open(path)
        .map_err(error)?
        .take(1024 * 1024 + 1)
        .read_to_end(&mut raw)
        .map_err(error)?;
    if raw.len() > 1024 * 1024 {
        return Err("unsupported: 模型记录过大".into());
    }
    let value: serde_json::Value =
        serde_json::from_slice(&raw).map_err(|_| "corrupt: 模型记录损坏，已保留")?;
    if value["version"] != 1 {
        return Err("unsupported: 模型记录需要其他版本，已保留".into());
    }
    Ok(Some(value))
}
pub(super) fn write_record(path: &Path, value: &serde_json::Value) -> Result<(), String> {
    read_record(path)?;
    let raw = serde_json::to_vec(value).map_err(error)?;
    if raw.len() > 1024 * 1024 || value["version"] != 1 {
        return Err("invalid: 模型记录无效".into());
    }
    let temp = path.with_extension(format!("pending-{}", random_id()?));
    let mut file = OpenOptions::new()
        .create_new(true)
        .write(true)
        .open(&temp)
        .map_err(error)?;
    file.write_all(&raw).map_err(error)?;
    file.sync_all().map_err(error)?;
    drop(file);
    if file_hash(&temp, raw.len() as u64, &AtomicBool::new(false))? != hash(&raw) {
        return Err("integrity: 模型记录写后校验失败".into());
    }
    rename(&temp, path, true)
}
pub(super) fn rename(source: &Path, destination: &Path, replace: bool) -> Result<(), String> {
    metadata(source)?;
    metadata(destination)?;
    #[cfg(windows)]
    {
        use std::os::windows::ffi::OsStrExt;
        #[link(name = "kernel32")]
        extern "system" {
            fn MoveFileExW(old: *const u16, new: *const u16, flags: u32) -> i32;
        }
        let old: Vec<u16> = source.as_os_str().encode_wide().chain(Some(0)).collect();
        let new: Vec<u16> = destination
            .as_os_str()
            .encode_wide()
            .chain(Some(0))
            .collect();
        if unsafe { MoveFileExW(old.as_ptr(), new.as_ptr(), 8 | u32::from(replace)) } == 0 {
            return Err(error("publish"));
        }
    }
    #[cfg(unix)]
    {
        if replace {
            fs::rename(source, destination).map_err(error)?;
        } else if source.is_dir() {
            if metadata(destination)?.is_some() {
                return Err("conflict: 目标已存在".into());
            }
            fs::rename(source, destination).map_err(error)?;
        } else {
            fs::hard_link(source, destination).map_err(error)?;
            fs::remove_file(source).map_err(error)?;
        }
        File::open(destination.parent().ok_or("path: 缺少父目录")?)
            .and_then(|f| f.sync_all())
            .map_err(error)?;
    }
    Ok(())
}
#[derive(Clone, Copy)]
pub struct Volume {
    pub free_bytes: u64,
    pub max_file_bytes: u64,
}
impl Volume {
    pub(super) fn check(&self, required: u64, largest: u64) -> Result<(), String> {
        if self.free_bytes < required {
            Err("space: 目标卷可用空间不足".into())
        } else if self.max_file_bytes < largest {
            Err("filesystem: 目标卷不支持此模型的大文件".into())
        } else {
            Ok(())
        }
    }
}
#[cfg(windows)]
pub(super) fn volume(path: &Path) -> Result<Volume, String> {
    use std::os::windows::ffi::OsStrExt;
    #[link(name = "kernel32")]
    extern "system" {
        fn GetVolumePathNameW(path: *const u16, root: *mut u16, length: u32) -> i32;
        fn GetDiskFreeSpaceExW(
            path: *const u16,
            available: *mut u64,
            total: *mut u64,
            free: *mut u64,
        ) -> i32;
        fn GetVolumeInformationW(
            path: *const u16,
            name: *mut u16,
            length: u32,
            serial: *mut u32,
            max_component: *mut u32,
            flags: *mut u32,
            fs: *mut u16,
            fs_length: u32,
        ) -> i32;
    }
    let path: Vec<u16> = path.as_os_str().encode_wide().chain(Some(0)).collect();
    let mut root = vec![0u16; 32768];
    let mut free = 0u64;
    let mut system = [0u16; 64];
    unsafe {
        if GetVolumePathNameW(path.as_ptr(), root.as_mut_ptr(), root.len() as u32) == 0
            || GetDiskFreeSpaceExW(
                root.as_ptr(),
                &mut free,
                std::ptr::null_mut(),
                std::ptr::null_mut(),
            ) == 0
            || GetVolumeInformationW(
                root.as_ptr(),
                std::ptr::null_mut(),
                0,
                std::ptr::null_mut(),
                std::ptr::null_mut(),
                std::ptr::null_mut(),
                system.as_mut_ptr(),
                system.len() as u32,
            ) == 0
        {
            return Err("filesystem: 无法检查目标卷".into());
        }
    }
    let fs = String::from_utf16_lossy(
        &system[..system.iter().position(|v| *v == 0).unwrap_or(system.len())],
    );
    let max = match fs.as_str() {
        "NTFS" | "ReFS" | "exFAT" => u64::MAX,
        "FAT" | "FAT32" => u32::MAX as u64,
        _ => return Err("filesystem: 目标文件系统尚未验证".into()),
    };
    Ok(Volume {
        free_bytes: free,
        max_file_bytes: max,
    })
}
#[cfg(not(windows))]
pub(super) fn volume(_: &Path) -> Result<Volume, String> {
    Err("unsupported: 模型安装目前需要 Windows x64".into())
}

pub(super) fn publish_receipt(registry: &Path, receipt: &super::Receipt) -> Result<(), String> {
    let registry = Directory::open(registry)?;
    let _lock = lock(&registry.child(".local-installations.lock", true)?)?;
    let path = registry.child(
        &format!("installations/{}.json", receipt.installation_id),
        true,
    )?;
    if let Some(value) = read_record(&path)? {
        let previous: super::Receipt =
            serde_json::from_value(value).map_err(|_| "corrupt: 既有模型回执损坏，已保留")?;
        if previous.installation_id != receipt.installation_id
            || previous.directory_identity != receipt.directory_identity
            || previous.package_id != receipt.package_id
        {
            return Err("conflict: 安装身份冲突，已保留".into());
        }
    }
    write_record(&path, &serde_json::to_value(receipt).map_err(error)?)
}
pub(super) fn matching_pairs(
    directory: &Directory,
    packages: &[super::catalog::Package],
    cancel: &AtomicBool,
) -> Result<std::collections::HashSet<String>, String> {
    let mut matches = std::collections::HashSet::new();
    for package in packages.iter().filter(|p| p.engine == "llama.cpp") {
        let paths = package
            .artifacts
            .iter()
            .map(|a| directory.child(&a.path, false))
            .collect::<Result<Vec<_>, _>>()?;
        if paths.iter().all(|p| p.exists()) {
            for (artifact, path) in package.artifacts.iter().zip(paths) {
                if file_hash(&path, artifact.bytes, cancel)? != artifact.sha256 {
                    return Err("conflict: 既有 GGUF 或投影与固定版本不符，原文件保留".into());
                }
            }
            matches.insert(package.id.clone());
        }
    }
    Ok(matches)
}

pub(super) fn comfy_dependencies(directory: &Directory) -> Result<Vec<String>, String> {
    let mut facts = vec![
        "comfyui-runtime-and-node-registry-unverified".into(),
        "acceleration-not-managed-by-kk".into(),
        "h3-workflow-not-validated".into(),
    ];
    let version_name = if metadata(&directory.child("comfyui_version.py", false)?)?.is_some() {
        "comfyui_version.py".to_string()
    } else {
        let wrapper = directory.child("backend-state.json", false)?;
        let Some(meta) = metadata(&wrapper)? else {
            facts.push("comfyui-core-not-detected".into());
            return Ok(facts);
        };
        if !meta.is_file() || meta.len() > 65536 {
            return Err("corrupt: 本地包装目录记录超过只读检测范围".into());
        }
        let mut raw = Vec::new();
        File::open(wrapper)
            .map_err(error)?
            .take(65537)
            .read_to_end(&mut raw)
            .map_err(error)?;
        if raw.len() > 65536 {
            return Err("corrupt: 本地包装目录记录超过只读检测范围".into());
        }
        let value: serde_json::Value =
            serde_json::from_slice(&raw).map_err(|_| "corrupt: 本地包装目录记录不可读")?;
        let backend = value["backendDirectory"]
            .as_str()
            .filter(|v| {
                !v.is_empty()
                    && v.len() <= 80
                    && v.bytes()
                        .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_'))
            })
            .ok_or("path: 包装目录中的核心位置尚未受信")?;
        format!("backend/{backend}/ComfyUI/comfyui_version.py")
    };
    let path = directory.child(&version_name, false)?;
    if let Some(meta) = metadata(&path)? {
        if !meta.is_file() || meta.len() > 65536 {
            return Err("corrupt: 核心版本文件超过只读检测范围".into());
        }
        let mut raw = String::new();
        File::open(&path)
            .map_err(error)?
            .take(65537)
            .read_to_string(&mut raw)
            .map_err(error)?;
        if raw.len() > 65536 {
            return Err("corrupt: 核心版本文件超过只读检测范围".into());
        }
        let version = raw
            .lines()
            .filter_map(|line| line.split_once('='))
            .find_map(|(key, value)| {
                if key.trim() != "__version__" {
                    return None;
                }
                let value = value.trim().trim_matches(['\'', '"']);
                if value.len() <= 32
                    && value.split('.').count() == 3
                    && value
                        .split('.')
                        .all(|n| !n.is_empty() && n.bytes().all(|b| b.is_ascii_digit()))
                {
                    Some(value.to_string())
                } else {
                    None
                }
            });
        if let Some(version) = version {
            facts.push(format!("comfyui-source-version:{version}"));
        } else {
            facts.push("comfyui-source-version-unverified".into());
        }
        let prefix = version_name
            .strip_suffix("comfyui_version.py")
            .unwrap_or("");
        let node = directory.child(&format!("{prefix}comfy_extras/nodes_minimax_h3.py"), false)?;
        facts.push(
            if metadata(&node)?.is_some_and(|m| m.is_file()) {
                "comfyui-h3-node-source-present"
            } else {
                "comfyui-h3-node-source-missing"
            }
            .into(),
        );
    } else {
        facts.push("comfyui-core-not-detected".into());
    }
    Ok(facts)
}
