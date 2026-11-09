//! Read-only bridge from Node backups into the existing Native import transaction.
use super::*;
use crate::asset_storage::io;
use serde::Deserialize;

const MAX_MANIFEST_BYTES: usize = 4 * 1024 * 1024;
const SNAPSHOT: &str = "projects/creation-v2.json";
const RECORDS: &str = "assets/records/";
const BLOBS: &str = "assets/blobs/";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Manifest {
    protocol_version: u64,
    snapshot_revision: u64,
    created_at: String,
    files: Vec<Entry>,
    manifest_sha256: String,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Entry {
    path: String,
    sha256: String,
    size: u64,
}

fn sha(value: &str) -> bool {
    value.len() == 64
        && value
            .bytes()
            .all(|c| c.is_ascii_digit() || (b'a'..=b'f').contains(&c))
}

fn entry_limit(name: &str) -> Result<usize, String> {
    if name == SNAPSHOT {
        return Ok(MAX_ENTRY_BYTES as usize);
    }
    if let Some(id) = name
        .strip_prefix(RECORDS)
        .and_then(|s| s.strip_suffix(".json"))
    {
        asset_id(id)?;
        return Ok(asset_validation::MAX_RECORD_BYTES);
    }
    if name.strip_prefix(BLOBS).is_some_and(sha) {
        return Ok(asset_validation::MAX_BYTES);
    }
    Err(failure("path-traversal", "备份包含非标准路径"))
}

fn read_source(root: &Path, name: &str, limit: usize) -> Result<Vec<u8>, String> {
    // Only the selected root and controlled descendants are inspected; no source writes.
    let mut path = root.to_path_buf();
    let mut parts = name.split('/').peekable();
    while let Some(part) = parts.next() {
        path.push(part);
        let metadata = io::checked_metadata(&path)?
            .ok_or_else(|| failure("missing-asset", "备份缺少清单中的文件"))?;
        if parts.peek().is_some() && !metadata.is_dir() {
            return Err(failure("corrupt", "备份子目录类型无效"));
        }
    }
    io::read(&path, limit)?.ok_or_else(|| failure("missing-asset", "备份文件不可用"))
}

fn inventory(
    root: &Path,
    directory: &Path,
    expected: &HashSet<String>,
    count: &mut usize,
) -> Result<(), String> {
    for entry in fs::read_dir(directory).map_err(|_| failure("io", "无法列出备份目录"))? {
        let path = entry
            .map_err(|_| failure("io", "无法读取备份目录项"))?
            .path();
        let name = path
            .strip_prefix(root)
            .unwrap()
            .to_str()
            .ok_or_else(|| failure("corrupt", "备份路径编码无效"))?
            .replace('\\', "/");
        let metadata = io::checked_metadata(&path)?
            .ok_or_else(|| failure("conflict", "备份目录在读取期间发生变化"))?;
        if metadata.is_dir()
            && ["projects", "assets", "assets/records", "assets/blobs"].contains(&name.as_str())
        {
            inventory(root, &path, expected, count)?;
        } else if metadata.is_file() && expected.contains(&name) {
            *count += 1;
            if *count > MAX_ENTRIES + 1 {
                return Err(failure("quota", "备份文件数量超过限制"));
            }
        } else {
            return Err(failure(
                "corrupt",
                "备份包含未列入清单的文件或非标准目录，未导入",
            ));
        }
    }
    Ok(())
}

pub(super) fn read(path: &Path, bytes: &[u8]) -> Result<ValidatedPackage, String> {
    if bytes.len() > MAX_MANIFEST_BYTES {
        return Err(failure("quota", "备份清单超过 4 MiB 限制"));
    }
    if path
        .components()
        .any(|part| matches!(part, Component::ParentDir | Component::CurDir))
    {
        return Err(failure("path-traversal", "备份路径不能含相对路径段"));
    }
    let root = path
        .parent()
        .ok_or_else(|| failure("permission", "备份目录无效"))?;
    if !io::checked_metadata(root)?.is_some_and(|m| m.is_dir()) {
        return Err(failure("corrupt", "备份目录无效"));
    }
    let root = root
        .canonicalize()
        .map_err(|_| failure("io", "无法读取备份目录"))?;
    let name = path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| failure("corrupt", "备份清单名称无效"))?;
    if read_source(&root, name, MAX_MANIFEST_BYTES)? != bytes {
        return Err(failure("conflict", "备份清单在读取期间发生变化"));
    }
    let mut value = strict_json::parse(bytes)?;
    let manifest: Manifest = serde_json::from_value(value.clone())
        .map_err(|_| failure("corrupt", "备份清单字段无效"))?;
    if manifest.protocol_version != 1 {
        return Err(failure("unsupported", "本机服务备份协议不受支持"));
    }
    if manifest.snapshot_revision > 9_007_199_254_740_991
        || !asset_validation::utc_date(&manifest.created_at)
        || !sha(&manifest.manifest_sha256)
    {
        return Err(failure("corrupt", "备份清单版本或时间无效"));
    }
    if manifest.files.len() > MAX_ENTRIES {
        return Err(failure("quota", "备份文件数量超过限制"));
    }
    value.as_object_mut().unwrap().remove("manifestSha256");
    if asset_validation::hash(&canonical_bytes(&value)?) != manifest.manifest_sha256 {
        return Err(failure("checksum-mismatch", "备份清单校验失败"));
    }
    let mut names = HashSet::new();
    let mut total = bytes.len() as u64;
    for entry in &manifest.files {
        if !names.insert(entry.path.to_ascii_lowercase()) {
            return Err(failure("duplicate-entry", "备份包含重复路径或大小写碰撞"));
        }
        let limit = entry_limit(&entry.path)?;
        if !sha(&entry.sha256) || entry.size == 0 {
            return Err(failure("corrupt", "备份文件校验字段无效"));
        }
        total = total.saturating_add(entry.size);
        if entry.size > limit as u64 || total > MAX_TOTAL_BYTES {
            return Err(failure("quota", "备份文件或总大小超过限制"));
        }
    }
    let mut expected: HashSet<String> = manifest.files.iter().map(|e| e.path.clone()).collect();
    expected.insert(name.to_string());
    inventory(&root, &root, &expected, &mut 0)?;
    let mut snapshot = None;
    let mut records = Vec::new();
    let mut blobs = BTreeMap::new();
    for entry in &manifest.files {
        let bytes = read_source(&root, &entry.path, entry_limit(&entry.path)?)?;
        if bytes.len() as u64 != entry.size || asset_validation::hash(&bytes) != entry.sha256 {
            return Err(failure("checksum-mismatch", "备份文件与清单不一致"));
        }
        if entry.path == SNAPSHOT {
            let value = strict_json::parse(&bytes)?;
            crate::creation_storage::validate_snapshot_value(&value)?;
            if value["revision"].as_u64() != Some(manifest.snapshot_revision) {
                return Err(failure("conflict", "备份快照 revision 与清单不一致"));
            }
            snapshot = Some(value);
        } else if entry.path.starts_with(RECORDS) {
            let metadata = strict_json::parse(&bytes)?;
            reject_secrets(&metadata)?;
            if metadata.get("version").is_some() {
                return Err(failure("unsupported", "此入口仅支持旧本机服务裸素材记录"));
            }
            if metadata.get("provenance").is_none()
                || metadata["provenance"].get("generatedAt").is_none()
            {
                return Err(failure(
                    "unsupported",
                    "旧素材缺少 provenance/generatedAt，原备份已保留，请补全来源后导入",
                ));
            }
            let (sha, size) = validate_metadata(&metadata)?;
            if entry.path != format!("{RECORDS}{}.json", metadata["assetId"].as_str().unwrap()) {
                return Err(failure("corrupt", "素材记录文件名与标识不一致"));
            }
            records.push((metadata, sha, size));
        } else {
            let declared_sha = entry.path.strip_prefix(BLOBS).unwrap();
            if declared_sha != entry.sha256 {
                return Err(failure(
                    "asset-hash-mismatch",
                    "素材原件文件名与 SHA-256 不一致",
                ));
            }
            blobs.insert(declared_sha.to_string(), bytes);
        }
    }
    let snapshot = snapshot.ok_or_else(|| failure("corrupt", "备份缺少项目快照"))?;
    let mut references = BTreeSet::new();
    collect_references(&snapshot, &mut references)?;
    let mut ids = BTreeSet::new();
    let mut assets = Vec::new();
    for (metadata, sha, size) in records {
        let id = metadata["assetId"].as_str().unwrap().to_string();
        if !ids.insert(id) {
            return Err(failure("duplicate-entry", "备份包含重复素材标识"));
        }
        let bytes = blobs
            .remove(&sha)
            .ok_or_else(|| failure("missing-asset", "备份素材原件缺失"))?;
        if bytes.len() != size {
            return Err(failure(
                "asset-hash-mismatch",
                "备份原件与素材记录大小不一致",
            ));
        }
        assets.push((metadata, bytes));
    }
    if !references.is_subset(&ids) {
        return Err(failure("missing-asset", "备份缺少项目引用的素材记录"));
    }
    if !blobs.is_empty() {
        return Err(failure(
            "unreferenced-asset",
            "备份有原件但缺少素材记录，已保留原备份",
        ));
    }
    Ok(ValidatedPackage {
        summary: PackageSummary {
            checksum: manifest.manifest_sha256,
            project_ids: project_ids(&snapshot),
            asset_ids: ids.into_iter().collect(),
        },
        snapshot,
        assets,
    })
}
