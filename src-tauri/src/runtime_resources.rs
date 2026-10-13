use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::collections::HashSet;
use std::fs;
use std::path::{Component, Path, PathBuf};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Manifest {
    schema_version: u32,
    platform: String,
    arch: String,
    node: String,
    node_executable: Option<String>,
    files: Vec<Resource>,
}

#[derive(Deserialize)]
struct Resource {
    path: String,
    size: u64,
    sha256: String,
}

pub fn platform() -> &'static str {
    match std::env::consts::OS {
        "windows" => "win32",
        "macos" => "darwin",
        "linux" => "linux",
        _ => "unsupported",
    }
}

pub fn arch() -> &'static str {
    match std::env::consts::ARCH {
        "x86_64" => "x64",
        "aarch64" => "arm64",
        _ => "unsupported",
    }
}

pub fn node_filename() -> &'static str {
    if cfg!(windows) {
        "node.exe"
    } else {
        "node"
    }
}

pub fn validate(directory: &Path) -> Result<PathBuf, String> {
    inspect(directory, true)
}

// Availability is a cheap resource/platform diagnostic. Actual launch verifies
// every digest; a stopped status never claims health from this inspection.
pub fn diagnose(directory: &Path) -> Result<PathBuf, String> {
    inspect(directory, false)
}

fn inspect(directory: &Path, verify_hashes: bool) -> Result<PathBuf, String> {
    let error =
        || "Agent 运行资源缺失、损坏或与当前平台不匹配，请重新安装匹配的桌面包。".to_string();
    if platform() == "unsupported" || arch() == "unsupported" {
        return Err(error());
    }
    let root = directory.canonicalize().map_err(|_| error())?;
    let manifest_path = root.join("runtime-manifest.json");
    let metadata = fs::symlink_metadata(&manifest_path).map_err(|_| error())?;
    if !metadata.is_file() || metadata.file_type().is_symlink() || metadata.len() > 2 * 1024 * 1024
    {
        return Err(error());
    }
    let manifest: Manifest = serde_json::from_slice(&fs::read(manifest_path).map_err(|_| error())?)
        .map_err(|_| error())?;
    if manifest.schema_version != 1
        || manifest.platform != platform()
        || manifest.arch != arch()
        || manifest.node.trim_start_matches('v').split('.').next() != Some("24")
        || manifest
            .node_executable
            .as_deref()
            .is_some_and(|name| name != node_filename())
        || manifest.files.is_empty()
        || manifest.files.len() > 20_000
    {
        return Err(error());
    }
    let mut paths = HashSet::new();
    for resource in manifest.files {
        let relative = Path::new(&resource.path);
        if resource.path.contains(['\\', ':'])
            || !relative
                .components()
                .all(|part| matches!(part, Component::Normal(_)))
            || !paths.insert(resource.path.clone())
            || resource.size > 256 * 1024 * 1024
            || resource.sha256.len() != 64
            || !resource.sha256.bytes().all(|byte| byte.is_ascii_hexdigit())
        {
            return Err(error());
        }
        let path = root.join(relative);
        let metadata = fs::symlink_metadata(&path).map_err(|_| error())?;
        if !metadata.is_file()
            || metadata.file_type().is_symlink()
            || metadata.len() != resource.size
            || !path.canonicalize().map_err(|_| error())?.starts_with(&root)
        {
            return Err(error());
        }
        if verify_hashes {
            let digest = format!(
                "{:x}",
                Sha256::digest(fs::read(&path).map_err(|_| error())?)
            );
            if digest != resource.sha256.to_ascii_lowercase() {
                return Err(error());
            }
        }
    }
    for required in [node_filename(), "desktop-entry.mjs", "agent/dist/index.js"] {
        if !paths.contains(required) {
            return Err(error());
        }
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if !paths.contains("unix-guardian.mjs")
            || fs::metadata(root.join(node_filename()))
                .map_err(|_| error())?
                .permissions()
                .mode()
                & 0o111
                == 0
        {
            return Err(error());
        }
    }
    Ok(root.join(node_filename()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::{json, Value};
    use sha2::{Digest, Sha256};
    use std::fs;

    fn fixture() -> (std::path::PathBuf, Value) {
        let directory = std::env::temp_dir().join(format!(
            "kk-runtime-resources-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        fs::create_dir(&directory).unwrap();
        let mut files = vec![];
        for name in [
            node_filename(),
            "desktop-entry.mjs",
            "agent/dist/index.js",
            "unix-guardian.mjs",
        ] {
            let file = directory.join(name);
            fs::create_dir_all(file.parent().unwrap()).unwrap();
            fs::write(&file, b"fixture").unwrap();
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                fs::set_permissions(&file, fs::Permissions::from_mode(0o700)).unwrap();
            }
            files.push(
                json!({"path":name,"size":7,"sha256":format!("{:x}", Sha256::digest(b"fixture"))}),
            );
        }
        let manifest = json!({"schemaVersion":1,"platform":platform(),"arch":arch(),"node":"v24.0.0","nodeExecutable":node_filename(),"agentVersion":"test","files":files});
        (directory, manifest)
    }

    fn write_manifest(directory: &std::path::Path, manifest: &Value) {
        fs::write(
            directory.join("runtime-manifest.json"),
            serde_json::to_vec(manifest).unwrap(),
        )
        .unwrap();
    }

    #[test]
    fn wrong_platform_and_arch_are_rejected_before_launch() {
        let (directory, mut manifest) = fixture();
        write_manifest(&directory, &manifest);
        assert!(validate(&directory).is_ok());
        manifest["platform"] = json!("unsupported-os");
        write_manifest(&directory, &manifest);
        assert!(validate(&directory).is_err());
        manifest["platform"] = json!(platform());
        manifest["arch"] = json!(if arch() == "x64" { "arm64" } else { "x64" });
        write_manifest(&directory, &manifest);
        assert!(validate(&directory).is_err());
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn missing_manifest_unlisted_entry_and_changed_resource_are_rejected() {
        let (directory, mut manifest) = fixture();
        assert!(validate(&directory).is_err());
        manifest["files"].as_array_mut().unwrap().remove(2);
        write_manifest(&directory, &manifest);
        assert!(validate(&directory).is_err());
        let (valid_directory, valid_manifest) = fixture();
        write_manifest(&valid_directory, &valid_manifest);
        fs::write(valid_directory.join("desktop-entry.mjs"), b"changed").unwrap();
        assert!(validate(&valid_directory).is_err());
        fs::remove_dir_all(directory).unwrap();
        fs::remove_dir_all(valid_directory).unwrap();
    }

    #[test]
    fn parent_path_and_duplicate_manifest_entries_are_rejected() {
        let (directory, mut manifest) = fixture();
        manifest["files"][0]["path"] = json!("../node");
        write_manifest(&directory, &manifest);
        assert!(validate(&directory).is_err());
        manifest["files"][0]["path"] = json!(node_filename());
        let duplicate = manifest["files"][0].clone();
        manifest["files"].as_array_mut().unwrap().push(duplicate);
        write_manifest(&directory, &manifest);
        assert!(validate(&directory).is_err());
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    #[cfg(unix)]
    fn unix_node_requires_execute_permission() {
        use std::os::unix::fs::PermissionsExt;
        let (directory, manifest) = fixture();
        write_manifest(&directory, &manifest);
        fs::set_permissions(
            directory.join(node_filename()),
            fs::Permissions::from_mode(0o600),
        )
        .unwrap();
        assert!(validate(&directory).is_err());
        fs::remove_dir_all(directory).unwrap();
    }
}
