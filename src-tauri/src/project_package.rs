//! Bounded ZIP transport primitives for the portable project package.
//!
//! The shared TypeScript layer validates the logical manifest. These helpers
//! provide the native byte transport with independent path, size and duplicate
//! checks before a caller can stage any project data.

use crate::asset_storage::validation as asset_validation;
use crate::asset_storage::AssetRepository;
use crate::creation_storage::SnapshotRepository;
use base64::{engine::general_purpose::STANDARD, Engine};
use serde::Serialize;
use serde_json::{Map, Value};
use std::collections::{BTreeMap, BTreeSet, HashSet};
use std::fs::{self, File, OpenOptions};
use std::io::{Cursor, Read, Write};
use std::path::{Component, Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, ZipArchive, ZipWriter};

#[cfg(test)]
#[path = "project_package_failure_tests.rs"]
mod failure_tests;
#[path = "project_package_snapshot.rs"]
mod snapshot_schema;
#[path = "project_package_json.rs"]
mod strict_json;

fn fail_at(stage: &str) -> Result<(), String> {
    #[cfg(test)]
    failure_tests::fail_at(stage)?;
    #[cfg(not(test))]
    let _ = stage;
    Ok(())
}

const MAX_ENTRY_BYTES: u64 = 100 * 1024 * 1024;
const MAX_TOTAL_BYTES: u64 = 512 * 1024 * 1024;
const MAX_ENTRIES: usize = 10_000;

fn valid_entry_name(name: &str) -> bool {
    !name.is_empty()
        && !name.contains('\\')
        && !name.starts_with('/')
        && !name
            .split('/')
            .any(|part| part.is_empty() || part == "." || part == "..")
        && !name.as_bytes().windows(2).any(|pair| pair[1] == b':')
}

pub fn make_zip(entries: &[(String, Vec<u8>)]) -> Result<Vec<u8>, String> {
    if entries.len() > MAX_ENTRIES {
        return Err("corrupt: 项目包条目数量超过上限".into());
    }
    let mut names = std::collections::HashSet::new();
    let mut total = 0u64;
    let mut output = Cursor::new(Vec::new());
    let mut writer = ZipWriter::new(&mut output);
    let options = SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);
    for (name, bytes) in entries {
        if !valid_entry_name(name) || name.ends_with('/') {
            return Err("path-traversal: 项目包路径无效".into());
        }
        if !names.insert(name.clone()) {
            return Err("duplicate-entry: 项目包包含重复条目".into());
        }
        let size = bytes.len() as u64;
        if size > MAX_ENTRY_BYTES || total.saturating_add(size) > MAX_TOTAL_BYTES {
            return Err("quota: 项目包大小超过上限".into());
        }
        writer
            .start_file(name, options)
            .map_err(|_| "io: 无法创建项目包条目".to_string())?;
        writer
            .write_all(bytes)
            .map_err(|_| "io: 无法写入项目包条目".to_string())?;
        total += size;
    }
    writer
        .finish()
        .map_err(|_| "io: 无法完成项目包".to_string())?;
    Ok(output.into_inner())
}

pub fn read_zip(bytes: &[u8]) -> Result<Vec<(String, Vec<u8>)>, String> {
    // Allocation gate only; the ZIP library still parses all actual entries.
    // v1 is ZIP32 with no archive comment (our own writer's format), so its
    // fixed footer can bound central-directory allocation before ZipArchive.
    let footer = bytes
        .get(
            bytes
                .len()
                .checked_sub(22)
                .ok_or_else(|| failure("corrupt", "ZIP 尾记录缺失"))?..,
        )
        .ok_or_else(|| failure("corrupt", "ZIP 尾记录缺失"))?;
    let u16_at = |at: usize| u16::from_le_bytes(footer[at..at + 2].try_into().unwrap()) as usize;
    let u32_at = |at: usize| u32::from_le_bytes(footer[at..at + 4].try_into().unwrap()) as u64;
    if &footer[..4] != b"PK\x05\x06"
        || u16_at(20) != 0
        || u16_at(4) != 0
        || u16_at(6) != 0
        || u16_at(8) != u16_at(10)
    {
        return Err(failure("unsupported", "项目包只支持无注释的单卷 ZIP32"));
    }
    let count = u16_at(10);
    if count > MAX_ENTRIES
        || u32_at(12) > 2 * 1024 * 1024
        || u32_at(16) + u32_at(12) != (bytes.len() - 22) as u64
    {
        return Err(failure("quota", "ZIP 目录或条目数量超过限制"));
    }
    if bytes.get(bytes.len().saturating_sub(42)..bytes.len().saturating_sub(38))
        == Some(b"PK\x06\x07".as_slice())
    {
        return Err(failure("unsupported", "项目包 v1 不支持 ZIP64"));
    }
    let mut archive =
        ZipArchive::new(Cursor::new(bytes)).map_err(|_| "corrupt: 项目包 ZIP 无效".to_string())?;
    if archive.len() != count {
        return Err("duplicate-entry: ZIP 条目数量不一致或含重复名称".into());
    }
    let mut names = std::collections::HashSet::new();
    let mut total = 0u64;
    let mut entries = Vec::with_capacity(archive.len());
    for index in 0..archive.len() {
        let file = archive
            .by_index(index)
            .map_err(|_| "corrupt: 项目包条目不可读".to_string())?;
        if file.encrypted()
            || file.is_symlink()
            || file
                .unix_mode()
                .is_some_and(|mode| mode & 0o111 != 0 || !matches!(mode & 0o170000, 0 | 0o100000))
        {
            return Err("corrupt: 项目包包含加密或符号链接条目".into());
        }
        let name = file.name().to_string();
        if !valid_entry_name(&name) || name.ends_with('/') {
            return Err("path-traversal: 项目包路径无效".into());
        }
        if !names.insert(name.clone()) {
            return Err("duplicate-entry: 项目包包含重复条目".into());
        }
        let declared = file.size();
        if declared > MAX_ENTRY_BYTES || total.saturating_add(declared) > MAX_TOTAL_BYTES {
            return Err("quota: 项目包大小超过上限".into());
        }
        let mut content = Vec::new();
        file.take(declared + 1)
            .read_to_end(&mut content)
            .map_err(|_| "corrupt: 项目包条目解压失败".to_string())?;
        if content.len() as u64 != declared {
            return Err("corrupt: 项目包条目大小不一致".into());
        }
        total += declared;
        entries.push((name, content));
    }
    Ok(entries)
}

const MANIFEST_NAME: &str = "manifest.json";
const ASSET_PREFIX: &str = "assets/";
const ASSET_SUFFIX: &str = ".bin";

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PackageSummary {
    pub checksum: String,
    pub project_ids: Vec<String>,
    pub asset_ids: Vec<String>,
}

struct ValidatedPackage {
    summary: PackageSummary,
    snapshot: Value,
    assets: Vec<(Value, Vec<u8>)>,
}

fn failure(kind: &str, message: impl Into<String>) -> String {
    format!("{kind}: {}", message.into())
}

fn asset_id(id: &str) -> Result<(), String> {
    asset_validation::asset_id(id).map_err(|_| failure("corrupt", "项目包素材标识无效"))
}

fn optional_id(
    value: &Value,
    field: &str,
    ids: &mut BTreeSet<String>,
) -> Result<Option<String>, String> {
    match value.get(field) {
        None => Ok(None),
        Some(Value::String(id)) => {
            asset_id(id)?;
            ids.insert(id.clone());
            Ok(Some(id.clone()))
        }
        _ => Err(failure("corrupt", "素材标识字段无效")),
    }
}

fn media_reference(
    value: Option<&Value>,
    expected: Option<&str>,
    ids: &mut BTreeSet<String>,
    poster: bool,
) -> Result<(), String> {
    let Some(value) = value else {
        return Ok(());
    };
    let text = value
        .as_str()
        .ok_or_else(|| failure("corrupt", "媒体字段无效"))?;
    if text.is_empty() {
        return Ok(());
    }
    if let Some(id) = text.strip_prefix("kk-asset:") {
        asset_id(id)?;
        if poster || expected.is_some_and(|expected| expected != id) {
            return Err(failure("corrupt", "媒体引用无法完整恢复或与素材标识不一致"));
        }
        ids.insert(id.into());
        return Ok(());
    }
    if (text.starts_with("/fixtures/demo/") || text.starts_with("/design/figma/"))
        && valid_entry_name(&text[1..])
        && !text.contains(['?', '#', '%'])
    {
        return Ok(());
    }
    Err(failure(
        "corrupt",
        "媒体尚未归档，项目包不能保留临时、远程或本机地址",
    ))
}

fn attachments(value: &Value, ids: &mut BTreeSet<String>) -> Result<(), String> {
    if let Some(values) = value.get("attachments").and_then(Value::as_array) {
        for attachment in values {
            let id = optional_id(attachment, "assetId", ids)?;
            media_reference(attachment.get("dataUrl"), id.as_deref(), ids, false)?;
        }
    }
    Ok(())
}

fn collect_references(snapshot: &Value, ids: &mut BTreeSet<String>) -> Result<(), String> {
    // Visit only schema media fields. User prompts and messages are plain text.
    attachments(&snapshot["homeDraft"], ids)?;
    for project in snapshot["projects"]
        .as_array()
        .ok_or_else(|| failure("corrupt", "项目集合无效"))?
    {
        attachments(project, ids)?;
        attachments(&project["composerDraft"], ids)?;
        if let Some(tasks) = project["tasks"].as_array() {
            for task in tasks {
                attachments(task, ids)?;
                if let Some(outputs) = task["outputs"].as_array() {
                    for output in outputs {
                        optional_id(output, "assetId", ids)?;
                    }
                }
            }
        }
        if let Some(plans) = project.get("stagePlans") {
            for plan in plans
                .as_array()
                .ok_or_else(|| failure("corrupt", "阶段计划集合无效"))?
            {
                for stage in plan["stages"]
                    .as_array()
                    .ok_or_else(|| failure("corrupt", "阶段集合无效"))?
                {
                    for work in stage["workItems"]
                        .as_array()
                        .ok_or_else(|| failure("corrupt", "阶段工作项集合无效"))?
                    {
                        optional_id(work, "assetId", ids)?;
                    }
                }
            }
        }
        for item in project["items"]
            .as_array()
            .ok_or_else(|| failure("corrupt", "节点集合无效"))?
        {
            let id = optional_id(item, "assetId", ids)?;
            optional_id(item, "parentAssetId", ids)?;
            media_reference(item.get("preview"), id.as_deref(), ids, false)?;
            if let Some(result) = item.get("result") {
                media_reference(result.get("src"), id.as_deref(), ids, false)?;
                media_reference(result.get("poster"), None, ids, true)?;
            }
        }
    }
    Ok(())
}
fn project_ids(snapshot: &Value) -> Vec<String> {
    snapshot["projects"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(|project| project["id"].as_str().map(ToOwned::to_owned))
        .collect()
}

fn canonical_bytes(value: &Value) -> Result<Vec<u8>, String> {
    fn write(value: &Value, output: &mut Vec<u8>) -> Result<(), String> {
        match value {
            Value::Number(number) => {
                let number = number
                    .as_f64()
                    .filter(|n| n.is_finite())
                    .ok_or_else(|| failure("corrupt", "清单包含无效数字"))?;
                output.extend_from_slice(ryu_js::Buffer::new().format(number).as_bytes());
            }
            Value::Array(values) => {
                output.push(b'[');
                for (index, child) in values.iter().enumerate() {
                    if index > 0 {
                        output.push(b',');
                    }
                    write(child, output)?;
                }
                output.push(b']');
            }
            Value::Object(object) => {
                let mut entries: Vec<_> = object.iter().collect();
                entries.sort_by(|(a, _), (b, _)| a.encode_utf16().cmp(b.encode_utf16()));
                output.push(b'{');
                for (index, (key, child)) in entries.into_iter().enumerate() {
                    if index > 0 {
                        output.push(b',');
                    }
                    serde_json::to_writer(&mut *output, key)
                        .map_err(|_| failure("corrupt", "清单字段无效"))?;
                    output.push(b':');
                    write(child, output)?;
                }
                output.push(b'}');
            }
            _ => serde_json::to_writer(&mut *output, value)
                .map_err(|_| failure("corrupt", "清单字段无效"))?,
        }
        Ok(())
    }
    let mut output = Vec::new();
    write(value, &mut output)?;
    Ok(output)
}

fn manifest_checksum(manifest: &Map<String, Value>) -> Result<String, String> {
    let mut body = manifest.clone();
    body.remove("checksum");
    Ok(asset_validation::hash(&canonical_bytes(&Value::Object(
        body,
    ))?))
}

fn reject_secrets(value: &Value) -> Result<(), String> {
    match value {
        Value::Object(object) => {
            for (key, child) in object {
                let lower = key.to_ascii_lowercase().replace(['_', '-'], "");
                if lower.contains("api_key")
                    || lower.contains("apikey")
                    || lower.contains("bearer_token")
                    || lower.contains("bearertoken")
                    || lower.contains("access_token")
                    || lower.contains("accesstoken")
                    || lower.contains("oauthtoken")
                    || lower.contains("refreshtoken")
                    || lower.contains("client_secret")
                    || lower.contains("clientsecret")
                    || lower.contains("authorization")
                    || lower.contains("secret")
                {
                    return Err(failure("secret-present", "项目包不能包含凭据或授权秘密"));
                }
                reject_secrets(child)?;
            }
        }
        Value::Array(values) => {
            for child in values {
                reject_secrets(child)?;
            }
        }
        _ => {}
    }
    Ok(())
}

fn validate_metadata(metadata: &Value) -> Result<(String, usize), String> {
    fn utf16_limits(value: &Value) -> Result<(), String> {
        match value {
            Value::Object(object) => {
                for (key, value) in object {
                    let max = match key.as_str() {
                        "sourceJobId" | "promptHash" | "parentId" | "providerRequestId" => 200,
                        "provider" => 80,
                        "model" => 120,
                        "connectionId" => 160,
                        _ => usize::MAX,
                    };
                    if value
                        .as_str()
                        .is_some_and(|s| s.encode_utf16().count() > max)
                    {
                        return Err(failure("corrupt", "素材元数据文字过长"));
                    }
                    utf16_limits(value)?;
                }
            }
            Value::Array(values) => {
                for value in values {
                    utf16_limits(value)?;
                }
            }
            _ => {}
        }
        Ok(())
    }
    utf16_limits(metadata)?;
    if metadata["tags"].as_array().is_some_and(|tags| {
        tags.iter()
            .any(|tag| tag.as_str().is_some_and(|s| s.encode_utf16().count() > 200))
    }) {
        return Err(failure("corrupt", "素材标签过长"));
    }
    let object = metadata
        .as_object()
        .ok_or_else(|| failure("corrupt", "素材元数据无效"))?;
    let id = object
        .get("assetId")
        .and_then(Value::as_str)
        .ok_or_else(|| failure("corrupt", "素材元数据缺少 assetId"))?;
    let sha = object
        .get("sha256")
        .and_then(Value::as_str)
        .ok_or_else(|| failure("corrupt", "素材元数据缺少 sha256"))?;
    let size = object
        .get("size")
        .and_then(Value::as_u64)
        .filter(|size| *size > 0 && *size <= asset_validation::MAX_BYTES as u64)
        .ok_or_else(|| failure("corrupt", "素材大小必须为 1 至 100 MiB"))? as usize;
    let mut without_size = object.clone();
    without_size.remove("size");
    asset_validation::metadata(&Value::Object(without_size))
        .map_err(|_| failure("corrupt", "素材元数据不符合原生 schema"))?;
    if id != format!("asset-{}", &sha[..24.min(sha.len())]) {
        return Err(failure("asset-hash-mismatch", "素材标识与 SHA-256 不匹配"));
    }
    Ok((sha.to_string(), size))
}

fn parse_asset_entry(name: &str) -> Result<&str, String> {
    if !name.starts_with(ASSET_PREFIX) || !name.ends_with(ASSET_SUFFIX) {
        return Err(failure("corrupt", "项目包包含未知文件"));
    }
    let sha = &name[ASSET_PREFIX.len()..name.len() - ASSET_SUFFIX.len()];
    if sha.len() != 64
        || !sha
            .bytes()
            .all(|c| c.is_ascii_hexdigit() && !c.is_ascii_uppercase())
    {
        return Err(failure("corrupt", "项目包素材文件名无效"));
    }
    Ok(sha)
}

fn validate_entries(entries: Vec<(String, Vec<u8>)>) -> Result<ValidatedPackage, String> {
    let mut manifest_bytes = None;
    let mut asset_entries = BTreeMap::<String, Vec<u8>>::new();
    for (name, bytes) in entries {
        if name == MANIFEST_NAME {
            if manifest_bytes.replace(bytes).is_some() {
                return Err(failure("duplicate-entry", "项目包包含重复清单"));
            }
        } else {
            let sha = parse_asset_entry(&name)?.to_string();
            if asset_entries.insert(sha, bytes).is_some() {
                return Err(failure("duplicate-entry", "项目包包含重复素材"));
            }
        }
    }
    let manifest_bytes =
        manifest_bytes.ok_or_else(|| failure("corrupt", "项目包缺少 manifest.json"))?;
    let manifest = strict_json::parse(&manifest_bytes)?;
    let manifest = manifest
        .as_object()
        .ok_or_else(|| failure("corrupt", "项目包清单结构无效"))?;
    let allowed: HashSet<&str> = [
        "kind",
        "version",
        "exportedAt",
        "snapshot",
        "assets",
        "checksum",
    ]
    .into_iter()
    .collect();
    if manifest.len() != allowed.len() || manifest.keys().any(|key| !allowed.contains(key.as_str()))
    {
        return Err(failure("corrupt", "项目包清单包含未知字段"));
    }
    if manifest["kind"] != "kk-studio-project" || manifest["version"] != 1 {
        return Err(failure("unsupported", "项目包版本不受支持"));
    }
    if !manifest["exportedAt"]
        .as_str()
        .is_some_and(asset_validation::utc_date)
    {
        return Err(failure("corrupt", "exportedAt 必须是 UTC 时间"));
    }
    reject_secrets(&Value::Object(manifest.clone()))?;
    let snapshot = manifest
        .get("snapshot")
        .ok_or_else(|| failure("corrupt", "项目包缺少 snapshot"))?
        .clone();
    snapshot_schema::validate(&snapshot).map_err(|error| {
        if error.starts_with("unsupported:") {
            error
        } else {
            failure("corrupt", "项目快照无效")
        }
    })?;

    let mut refs = BTreeSet::new();
    collect_references(&snapshot, &mut refs)?;
    if refs.len() >= MAX_ENTRIES {
        return Err(failure("quota", "项目包引用数量超过上限"));
    }
    let assets = manifest["assets"]
        .as_array()
        .ok_or_else(|| failure("corrupt", "项目包 assets 无效"))?;
    let mut metadata_by_id = BTreeMap::new();
    let mut validated_assets = Vec::new();
    for metadata in assets {
        let (sha, size) = validate_metadata(metadata)?;
        let id = metadata["assetId"].as_str().unwrap().to_string();
        if metadata_by_id
            .insert(id.clone(), (sha.clone(), size))
            .is_some()
        {
            return Err(failure("duplicate-entry", "项目包包含重复素材元数据"));
        }
        if !refs.contains(&id) {
            return Err(failure("unreferenced-asset", "项目包包含未引用素材"));
        }
    }
    if refs.len() != metadata_by_id.len() {
        return Err(failure("missing-asset", "项目包缺少项目引用的素材"));
    }
    let expected = manifest_checksum(manifest)?;
    if manifest["checksum"].as_str() != Some(expected.as_str()) {
        return Err(failure("checksum-mismatch", "项目包清单校验失败"));
    }
    for (id, (sha, size)) in &metadata_by_id {
        let bytes = asset_entries
            .remove(sha)
            .ok_or_else(|| failure("missing-asset", "项目包缺少素材原件"))?;
        if bytes.len() != *size || asset_validation::hash(&bytes) != *sha {
            return Err(failure("asset-hash-mismatch", "素材原件校验失败"));
        }
        validated_assets.push((
            manifest["assets"]
                .as_array()
                .unwrap()
                .iter()
                .find(|entry| entry["assetId"] == *id)
                .unwrap()
                .clone(),
            bytes,
        ));
    }
    if !asset_entries.is_empty() {
        return Err(failure("unreferenced-asset", "项目包包含未声明的素材原件"));
    }
    let checksum = manifest["checksum"].as_str().unwrap().to_string();
    Ok(ValidatedPackage {
        summary: PackageSummary {
            checksum,
            project_ids: project_ids(&snapshot),
            asset_ids: refs.into_iter().collect(),
        },
        snapshot,
        assets: validated_assets,
    })
}

fn nonce() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos()
}

fn utc_now() -> String {
    let seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let days = (seconds / 86_400) as i64;
    let rem = seconds % 86_400;
    let (year, month, day) = civil_from_days(days);
    format!(
        "{year:04}-{month:02}-{day:02}T{:02}:{:02}:{:02}Z",
        rem / 3600,
        (rem / 60) % 60,
        rem % 60
    )
}

fn civil_from_days(days: i64) -> (i64, i64, i64) {
    let z = days + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = mp + if mp < 10 { 3 } else { -9 };
    (y + if m <= 2 { 1 } else { 0 }, m, d)
}

fn read_and_validate(path: &Path) -> Result<ValidatedPackage, String> {
    if !path.is_absolute() {
        return Err(failure("permission", "项目包路径必须是绝对路径"));
    }
    let file = File::open(path).map_err(|_| failure("io", "无法读取项目包"))?;
    let meta = file
        .metadata()
        .map_err(|_| failure("io", "无法读取项目包"))?;
    if !meta.is_file() || meta.len() > MAX_TOTAL_BYTES {
        return Err(failure("quota", "项目包大小或类型无效"));
    }
    let mut bytes = Vec::new();
    file.take(MAX_TOTAL_BYTES + 1)
        .read_to_end(&mut bytes)
        .map_err(|_| failure("io", "无法读取项目包"))?;
    if bytes.len() as u64 > MAX_TOTAL_BYTES {
        return Err(failure("quota", "项目包超过大小限制"));
    }
    validate_entries(read_zip(&bytes)?)
}

/// Resolve the user-selected parent once; never create an ancestor or follow a
/// pre-existing target. v1 publishes a new artifact/root only.
fn new_target(path: &Path) -> Result<PathBuf, String> {
    if !path.is_absolute()
        || path
            .components()
            .any(|part| matches!(part, Component::ParentDir | Component::CurDir))
    {
        return Err(failure(
            "permission",
            "请选择绝对路径且不含相对路径段的目标",
        ));
    }
    let leaf = path
        .file_name()
        .ok_or_else(|| failure("permission", "不能使用卷根目录作为目标"))?;
    let name = leaf.to_string_lossy();
    if name.contains(':') || name.ends_with(['.', ' ']) {
        return Err(failure("permission", "目标名称无效"));
    }
    let parent = path
        .parent()
        .ok_or_else(|| failure("permission", "目标目录无效"))?
        .canonicalize()
        .map_err(|_| failure("permission", "请选择已存在的父目录"))?;
    let resolved = parent.join(leaf);
    match fs::symlink_metadata(&resolved) {
        Ok(_) => Err(failure(
            "target-not-empty",
            "目标已存在，请选择新文件或新目录",
        )),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(resolved),
        Err(_) => Err(failure("permission", "无法检查目标")),
    }
}

pub fn require_isolated_target(path: &Path, current_root: &Path) -> Result<(), String> {
    let target = new_target(path)?;
    let root = current_root
        .canonicalize()
        .map_err(|_| failure("permission", "无法确认当前数据目录"))?;
    #[cfg(windows)]
    let (target, root) = (
        PathBuf::from(target.to_string_lossy().to_lowercase()),
        PathBuf::from(root.to_string_lossy().to_lowercase()),
    );
    if target.starts_with(&root) || root.starts_with(&target) {
        return Err(failure("permission", "请选择当前数据目录之外的独立位置"));
    }
    Ok(())
}

fn sync_parent(path: &Path) -> Result<(), String> {
    #[cfg(unix)]
    File::open(path.parent().ok_or_else(|| failure("io", "父目录无效"))?)
        .and_then(|file| file.sync_all())
        .map_err(|_| failure("io", "无法同步目录"))?;
    #[cfg(not(unix))]
    let _ = path;
    Ok(())
}

pub fn preflight_package(source: &Path) -> Result<PackageSummary, String> {
    Ok(read_and_validate(source)?.summary)
}

#[cfg(test)]
fn export_package(
    snapshot_repo: &SnapshotRepository,
    assets_repo: &AssetRepository,
    destination: &Path,
) -> Result<PackageSummary, String> {
    export_package_at_revision(snapshot_repo, assets_repo, destination, None)
}

pub fn export_package_at_revision(
    snapshot_repo: &SnapshotRepository,
    assets_repo: &AssetRepository,
    destination: &Path,
    expected_revision: Option<u64>,
) -> Result<PackageSummary, String> {
    let destination = new_target(destination)?;
    let snapshot = snapshot_repo
        .read()?
        .snapshot
        .ok_or_else(|| failure("missing-asset", "当前没有可导出的项目快照"))?;
    if expected_revision.is_some_and(|revision| snapshot["revision"].as_u64() != Some(revision)) {
        return Err(failure(
            "conflict",
            "项目在选择文件期间发生变化，请保存完成后重新导出",
        ));
    }
    let mut refs = BTreeSet::new();
    collect_references(&snapshot, &mut refs)?;
    if refs.len() >= MAX_ENTRIES {
        return Err(failure("quota", "项目包引用数量超过上限"));
    }
    let mut metadata = Vec::new();
    let mut entries = vec![(MANIFEST_NAME.to_string(), Vec::new())];
    let mut total_bytes = 0u64;
    for id in &refs {
        let record = assets_repo
            .read(id)?
            .ok_or_else(|| failure("missing-asset", "项目引用的素材不存在"))?;
        let bytes = STANDARD
            .decode(record.data_base64)
            .map_err(|_| failure("corrupt", "素材原件编码无效"))?;
        total_bytes += bytes.len() as u64;
        if total_bytes > MAX_TOTAL_BYTES {
            return Err(failure("quota", "项目包超过大小限制"));
        }
        let sha = asset_validation::hash(&bytes);
        if record.metadata["sha256"] != sha || record.metadata["assetId"] != *id || bytes.is_empty()
        {
            return Err(failure("asset-hash-mismatch", "素材原件校验失败"));
        }
        let mut item = record.metadata;
        item.as_object_mut()
            .unwrap()
            .insert("size".into(), Value::from(bytes.len() as u64));
        metadata.push(item);
        entries.push((format!("assets/{sha}.bin"), bytes));
    }
    metadata.sort_by(|a, b| a["assetId"].as_str().cmp(&b["assetId"].as_str()));
    let mut manifest = Map::new();
    manifest.insert("kind".into(), Value::String("kk-studio-project".into()));
    manifest.insert("version".into(), Value::from(1));
    manifest.insert("exportedAt".into(), Value::String(utc_now()));
    manifest.insert("snapshot".into(), snapshot);
    manifest.insert("assets".into(), Value::Array(metadata));
    let checksum = manifest_checksum(&manifest)?;
    manifest.insert("checksum".into(), Value::String(checksum));
    entries[0].1 = serde_json::to_vec(&Value::Object(manifest))
        .map_err(|_| failure("io", "无法序列化项目包清单"))?;
    let archive = make_zip(&entries)?;
    let summary = validate_entries(read_zip(&archive)?)?.summary;
    drop(entries);
    if archive.len() as u64 > MAX_TOTAL_BYTES {
        return Err(failure("quota", "项目包超过大小限制"));
    }
    let temp = destination.with_extension(format!("kkproject.tmp.{}", nonce()));
    let mut owns_temp = false;
    let write_result = (|| {
        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temp)
            .map_err(|_| failure("io", "无法写入项目包"))?;
        owns_temp = true;
        file.write_all(&archive)
            .map_err(|_| failure("io", "无法写入项目包"))?;
        fail_at("export-before-sync")?;
        file.sync_all()
            .map_err(|_| failure("io", "无法同步项目包"))?;
        drop(file);
        fail_at("export-before-readback")?;
        let readback = read_and_validate(&temp)?;
        if readback.summary.checksum != summary.checksum {
            return Err(failure("checksum-mismatch", "项目包写后校验失败"));
        }
        // Hard-link publication is atomic and fails if another writer won the
        // target name. Unlike rename it never replaces an existing destination.
        fail_at("export-before-publish")?;
        fs::hard_link(&temp, &destination)
            .map_err(|_| failure("io", "无法提交项目包，请选择新文件"))?;
        sync_parent(&destination)?;
        Ok::<(), String>(())
    })();
    if owns_temp {
        let _ = fs::remove_file(&temp);
    }
    write_result?;
    Ok(summary)
}

pub fn import_package(source: &Path, target_root: &Path) -> Result<PackageSummary, String> {
    if !source.is_absolute() || !target_root.is_absolute() {
        return Err(failure("permission", "项目包路径必须是绝对路径"));
    }
    let target_root = new_target(target_root)?;
    let package = read_and_validate(source)?;
    let staging = target_root.with_extension(format!("kkstudio-import.{}", nonce()));
    // Exclusive creation also bounds cleanup to a directory owned by this call.
    fs::create_dir(&staging).map_err(|_| failure("io", "无法创建恢复暂存目录"))?;
    let result = (|| {
        fs::create_dir_all(staging.join("projects"))
            .map_err(|_| failure("io", "无法创建恢复暂存目录"))?;
        fs::create_dir_all(staging.join("assets"))
            .map_err(|_| failure("io", "无法创建恢复暂存目录"))?;
        let assets = AssetRepository::new(staging.join("assets"));
        fail_at("import-before-assets")?;
        for (metadata, bytes) in &package.assets {
            let mut without_size = metadata.as_object().unwrap().clone();
            without_size.remove("size");
            assets.store(STANDARD.encode(bytes), Value::Object(without_size))?;
        }
        let snapshot_path = staging.join("projects").join("creation-v2.json");
        let snapshots = SnapshotRepository::new(snapshot_path);
        fail_at("import-before-snapshot")?;
        snapshots.write(package.snapshot.clone(), None)?;
        fail_at("import-before-readback")?;
        let reopened = snapshots
            .read()?
            .snapshot
            .ok_or_else(|| failure("corrupt", "恢复后的项目快照无法读取"))?;
        if reopened != package.snapshot {
            return Err(failure("corrupt", "恢复后的项目快照不一致"));
        }
        for (metadata, bytes) in &package.assets {
            let id = metadata["assetId"].as_str().unwrap();
            let record = assets
                .read(id)?
                .ok_or_else(|| failure("missing-asset", "恢复后的素材无法读取"))?;
            let readback = STANDARD
                .decode(record.data_base64)
                .map_err(|_| failure("corrupt", "恢复后的素材编码无效"))?;
            if readback != *bytes
                || asset_validation::hash(&readback) != metadata["sha256"].as_str().unwrap()
            {
                return Err(failure("asset-hash-mismatch", "恢复后的素材校验失败"));
            }
        }
        new_target(&target_root)?;
        fail_at("import-before-publish")?;
        fs::rename(&staging, &target_root).map_err(|_| failure("io", "无法发布恢复目录"))?;
        sync_parent(&target_root)?;
        Ok::<(), String>(())
    })();
    if result.is_err() {
        let _ = fs::remove_dir_all(&staging);
    }
    result?;
    Ok(package.summary)
}

#[cfg(test)]
mod tests {
    use super::*;
    use base64::{engine::general_purpose::STANDARD, Engine};
    use serde_json::json;
    use std::sync::atomic::{AtomicU64, Ordering};

    static NEXT: AtomicU64 = AtomicU64::new(0);

    fn fixture_root() -> PathBuf {
        let root = std::env::temp_dir().join(format!(
            "kk-project-package-{}-{}",
            std::process::id(),
            NEXT.fetch_add(1, Ordering::Relaxed)
        ));
        fs::create_dir_all(root.join("projects")).unwrap();
        fs::create_dir_all(root.join("assets")).unwrap();
        root
    }

    fn snapshot(asset_id: &str) -> Value {
        json!({
            "version": 2,
            "revision": 1,
            "activeProjectId": "p1",
            "homeDraft": {"prompt":"", "model":"", "kind":"image", "attachments":[], "updatedAt":1},
            "projects": [{
                "id":"p1", "name":"Portable", "items":[{"id":"n1","title":"Image","description":"","kind":"image","assetId":asset_id,"preview":format!("kk-asset:{asset_id}")}],
                "tasks":[{"id":"t1","sourceItemId":"n1","prompt":"create","model":"synthetic","status":"succeeded"}], "messages":[], "attachments":[]
            }]
        })
    }

    fn seed(root: &Path) -> (SnapshotRepository, AssetRepository, String, Vec<u8>) {
        let assets = AssetRepository::new(root.join("assets"));
        let bytes = b"portable-original".to_vec();
        let sha = asset_validation::hash(&bytes);
        let asset_id = format!("asset-{}", &sha[..24]);
        assets
            .store(
                STANDARD.encode(&bytes),
                json!({
                    "assetId": asset_id,
                    "sha256": sha,
                    "mime": "image/png",
                    "tags": [],
                    "isAiGenerated": false,
                    "source": "upload",
                    "provenance": {"generatedAt":"2026-01-01T00:00:00Z"}
                }),
            )
            .unwrap();
        let snapshots = SnapshotRepository::new(root.join("projects").join("creation-v2.json"));
        snapshots.write(snapshot(&asset_id), None).unwrap();
        (snapshots, assets, asset_id, bytes)
    }

    #[test]
    fn round_trips_manifest_and_asset_entries() {
        let input = vec![
            ("manifest.json".to_string(), b"{}".to_vec()),
            (
                "assets/0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef.bin"
                    .to_string(),
                vec![1, 2, 3],
            ),
        ];
        assert_eq!(read_zip(&make_zip(&input).unwrap()).unwrap(), input);
    }

    #[test]
    fn rejects_traversal_and_duplicate_entries() {
        assert!(make_zip(&[("../escape".into(), vec![1])]).is_err());
        assert!(make_zip(&[
            ("manifest.json".into(), vec![1]),
            ("manifest.json".into(), vec![2]),
        ])
        .is_err());
    }

    #[test]
    fn rejects_entry_over_limit_before_writing() {
        let bytes = vec![0u8; 100 * 1024 * 1024 + 1];
        assert!(make_zip(&[("manifest.json".into(), bytes)]).is_err());
    }

    #[test]
    fn exports_preflights_and_restores_into_a_fresh_root() {
        let source = fixture_root();
        let (snapshots, assets, asset_id, original) = seed(&source);
        let package_path = source.join("portable.kkproject");
        let exported = export_package(&snapshots, &assets, &package_path).unwrap();
        let preflight = preflight_package(&package_path).unwrap();
        assert_eq!(exported.checksum, preflight.checksum);
        assert_eq!(preflight.asset_ids, vec![asset_id.clone()]);

        let target = source.join("restored");
        let imported = import_package(&package_path, &target).unwrap();
        assert_eq!(imported.checksum, exported.checksum);
        let restored = SnapshotRepository::new(target.join("projects").join("creation-v2.json"));
        assert_eq!(
            restored.read().unwrap().snapshot.as_ref().unwrap()["projects"][0]["tasks"][0]
                ["sourceItemId"],
            "n1"
        );
        assert_eq!(
            restored.read().unwrap().snapshot.unwrap(),
            snapshot(&asset_id)
        );
        let restored_assets = AssetRepository::new(target.join("assets"));
        let record = restored_assets.read(&asset_id).unwrap().unwrap();
        assert_eq!(STANDARD.decode(record.data_base64).unwrap(), original);
        let _ = fs::remove_dir_all(source);
    }

    #[test]
    fn exports_normalized_project_with_empty_stage_plans() {
        let source = fixture_root();
        let (snapshots, assets, _, _) = seed(&source);
        let mut current = snapshots.read().unwrap().snapshot.unwrap();
        current["revision"] = Value::from(2);
        current["projects"][0]["stagePlans"] = json!([]);
        snapshots.write(current, Some(1)).unwrap();
        let package_path = source.join("empty-plans.kkproject");
        export_package(&snapshots, &assets, &package_path).unwrap();
        preflight_package(&package_path).unwrap();
        let _ = fs::remove_dir_all(source);
    }

    #[test]
    fn exports_and_restores_asset_referenced_only_by_stage_plan() {
        let source = fixture_root();
        let (snapshots, assets, asset_id, original) = seed(&source);
        let mut current = snapshots.read().unwrap().snapshot.unwrap();
        current["revision"] = Value::from(2);
        current["projects"][0]["items"] = json!([]);
        current["projects"][0]["tasks"] = json!([]);
        current["projects"][0]["stagePlans"] = json!([{
            "id": "plan-1", "title": "Stage asset", "projectId": "p1", "createdBy": "agent",
            "revision": 0, "createdAt": 1, "updatedAt": 1,
            "stages": [{
                "index": 0, "name": "Generate", "goal": "Keep original", "status": "doing",
                "approvalGate": "plan", "planApprovedAt": 1,
                "createdAt": 1, "updatedAt": 1,
                "workItems": [{
                    "id": "work-1", "kind": "image", "prompt": "Blue sphere",
                    "dependencies": [], "status": "succeeded", "assetId": asset_id,
                    "createdAt": 1, "updatedAt": 1
                }]
            }]
        }]);
        snapshots.write(current.clone(), Some(1)).unwrap();
        let package_path = source.join("stage-asset.kkproject");
        let exported = export_package(&snapshots, &assets, &package_path).unwrap();
        assert_eq!(exported.asset_ids, vec![asset_id.clone()]);
        let target = source.join("restored-stage");
        import_package(&package_path, &target).unwrap();
        let restored = SnapshotRepository::new(target.join("projects").join("creation-v2.json"));
        assert_eq!(restored.read().unwrap().snapshot.unwrap(), current);
        let restored_assets = AssetRepository::new(target.join("assets"));
        let record = restored_assets.read(&asset_id).unwrap().unwrap();
        assert_eq!(STANDARD.decode(record.data_base64).unwrap(), original);
        let _ = fs::remove_dir_all(source);
    }

    #[test]
    fn rejects_stage_plan_with_duplicate_work_item_ids_before_export() {
        let source = fixture_root();
        let (snapshots, assets, _, _) = seed(&source);
        let mut current = snapshots.read().unwrap().snapshot.unwrap();
        current["revision"] = Value::from(2);
        current["projects"][0]["stagePlans"] = json!([{
            "id": "plan-duplicate", "title": "Duplicate", "projectId": "p1", "createdBy": "agent",
            "revision": 0, "createdAt": 1, "updatedAt": 1,
            "stages": [
                {
                    "index": 0, "name": "Plan", "goal": "First work", "status": "doing",
                    "createdAt": 1, "updatedAt": 1,
                    "workItems": [{"id":"same", "kind":"text", "prompt":"First", "dependencies":[], "status":"queued", "createdAt":1, "updatedAt":1}]
                },
                {
                    "index": 1, "name": "Generate", "goal": "Keep distinct work", "status": "doing",
                    "createdAt": 1, "updatedAt": 1,
                    "workItems": [{"id":"same", "kind":"text", "prompt":"Second", "dependencies":[], "status":"succeeded", "createdAt":1, "updatedAt":1}]
                }
            ]
        }]);
        snapshots.write(current, Some(1)).unwrap();
        let package_path = source.join("duplicate-plan.kkproject");
        assert!(export_package(&snapshots, &assets, &package_path)
            .unwrap_err()
            .starts_with("corrupt:"));
        assert!(!package_path.exists());
        let _ = fs::remove_dir_all(source);
    }

    #[test]
    fn rejects_stage_plan_with_invalid_identity_or_dependencies_before_export() {
        for variant in [
            "stage-index",
            "plan-id",
            "foreign-project",
            "missing-dependency",
            "cyclic-dependency",
            "queued-done",
            "unapproved-work",
        ] {
            let source = fixture_root();
            let (snapshots, assets, _, _) = seed(&source);
            let mut current = snapshots.read().unwrap().snapshot.unwrap();
            current["revision"] = Value::from(2);
            let mut plan = json!({
                "id": "plan-duplicate", "title": "Duplicate", "projectId": "p1", "createdBy": "agent",
                "revision": 0, "createdAt": 1, "updatedAt": 1,
                "stages": [
                    {"index": 0, "name": "Plan", "goal": "First", "status": "doing", "workItems": [], "createdAt": 1, "updatedAt": 1},
                    {"index": 1, "name": "Build", "goal": "Second", "status": "done", "workItems": [], "createdAt": 1, "updatedAt": 1}
                ]
            });
            let plans = if variant == "stage-index" {
                plan["stages"][1]["index"] = json!(0.0);
                json!([plan])
            } else if variant == "plan-id" {
                json!([plan.clone(), plan])
            } else if variant == "foreign-project" {
                plan["projectId"] = Value::from("another-project");
                json!([plan])
            } else if variant == "missing-dependency" {
                plan["stages"][0]["workItems"] = json!([{
                    "id":"a", "kind":"text", "prompt":"First", "dependencies":["missing"],
                    "status":"queued", "createdAt":1, "updatedAt":1
                }]);
                json!([plan])
            } else if variant == "cyclic-dependency" {
                plan["stages"][0]["workItems"] = json!([
                    {"id":"a", "kind":"text", "prompt":"First", "dependencies":["b"], "status":"queued", "createdAt":1, "updatedAt":1},
                    {"id":"b", "kind":"text", "prompt":"Second", "dependencies":["a"], "status":"queued", "createdAt":1, "updatedAt":1}
                ]);
                json!([plan])
            } else {
                plan["stages"][0]["workItems"] = json!([{
                    "id":"a", "kind":"text", "prompt":"First", "dependencies":[],
                    "status": if variant == "queued-done" { "queued" } else { "running" },
                    "createdAt":1, "updatedAt":1
                }]);
                if variant == "queued-done" {
                    plan["stages"][0]["status"] = Value::from("done");
                } else {
                    plan["stages"][0]["approvalGate"] = Value::from("plan");
                }
                json!([plan])
            };
            current["projects"][0]["stagePlans"] = plans;
            snapshots.write(current, Some(1)).unwrap();
            let package_path = source.join(format!("duplicate-{variant}.kkproject"));
            assert!(export_package(&snapshots, &assets, &package_path)
                .unwrap_err()
                .starts_with("corrupt:"));
            assert!(!package_path.exists());
            let _ = fs::remove_dir_all(source);
        }
    }

    #[test]
    fn occupied_target_is_rejected_without_touching_source() {
        let source = fixture_root();
        let (snapshots, assets, _asset_id, _original) = seed(&source);
        let package_path = source.join("portable.kkproject");
        export_package(&snapshots, &assets, &package_path).unwrap();
        let target = source.join("occupied");
        fs::create_dir_all(&target).unwrap();
        fs::write(target.join("keep.txt"), b"keep").unwrap();
        let before = fs::read(&package_path).unwrap();
        let error = import_package(&package_path, &target).unwrap_err();
        assert!(error.starts_with("target-not-empty:"));
        assert_eq!(fs::read(&package_path).unwrap(), before);
        assert_eq!(fs::read(target.join("keep.txt")).unwrap(), b"keep");
        let _ = fs::remove_dir_all(source);
    }
}

#[allow(dead_code)]
pub fn register() {}
