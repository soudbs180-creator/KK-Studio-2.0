use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, HashSet};

pub(super) const SOURCE: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../config/local-model-packages.json"
));
pub(super) const MAX_SAFE: u64 = 9_007_199_254_740_991;
pub(super) const SPACE_RESERVE: u64 = 2 * 1024u64.pow(3);
pub(super) const MAX_ARCHIVE_EXPANSION: u64 = 3 * 1024u64.pow(3);
pub(super) fn required_space(remaining: u64, staging: u64) -> Result<u64, String> {
    remaining
        .checked_add(staging)
        .and_then(|n| n.checked_add(SPACE_RESERVE))
        .filter(|n| *n <= MAX_SAFE)
        .ok_or_else(|| "catalog: 空间需求溢出".into())
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Selection {
    pub package_ids: Vec<String>,
    pub runtime_backend: String,
}
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Artifact {
    pub path: String,
    pub bytes: u64,
    pub sha256: String,
    pub role: String,
}
#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct Package {
    pub id: String,
    pub name: String,
    pub maintainer: String,
    pub license: String,
    pub revision: String,
    pub source_url: String,
    pub artifact_base_url: String,
    pub artifacts: Vec<Artifact>,
    pub engine: String,
    pub repository: Option<String>,
    pub filename: Option<String>,
    pub main_bytes: Option<u64>,
    pub vision_bytes: Option<u64>,
    pub main_sha256: Option<String>,
    pub vision_sha256: Option<String>,
    pub context_tokens: Option<u32>,
    pub estimated_ram_bytes: Option<u64>,
    pub mode: Option<String>,
    pub default_mode: Option<bool>,
    pub license_review: Option<String>,
    pub declared_min_vram_bytes: Option<u64>,
    pub declared_min_ram_bytes: Option<u64>,
    pub workflow_format: Option<String>,
    pub workflow_conversion_required: Option<bool>,
    pub acceleration_acceptance: Option<String>,
    pub runtime_acceptance: Option<String>,
}
#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct RuntimeArchive {
    pub id: String,
    pub release: String,
    pub revision: String,
    pub backend: String,
    pub archive_role: String,
    pub source_url: String,
    pub bytes: u64,
    pub sha256: String,
    pub license: String,
    pub license_review: String,
}
#[derive(Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Catalog {
    pub version: u8,
    pub chat: Vec<Package>,
    pub video: Vec<Package>,
    pub runtimes: Vec<RuntimeArchive>,
}
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct FileSpec {
    pub relative: String,
    pub source: String,
    pub bytes: u64,
    pub sha256: String,
    pub archive: bool,
}
#[derive(Clone)]
pub(super) struct Prepared {
    pub files: Vec<FileSpec>,
    pub packages: Vec<Package>,
    pub selection: Selection,
    pub fingerprint: String,
    pub download_bytes: u64,
    pub required_bytes: u64,
}

pub(super) fn hash(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}
pub(super) fn installation_id(directory: &str, package: &Package) -> String {
    hash(format!("{directory}:{}:{}", package.id, package.revision).as_bytes())[..32].to_string()
}
pub(super) fn hex(value: &str, length: usize) -> bool {
    value.len() == length
        && value
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}
pub(super) fn safe_relative(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 512
        && !value.contains(['\\', ':', '\0'])
        && value.split('/').all(|part| {
            let stem = part.split('.').next().unwrap_or("").to_ascii_uppercase();
            !part.is_empty()
                && part != "."
                && part != ".."
                && !part.ends_with(['.', ' '])
                && !part.chars().any(char::is_control)
                && !part.contains(['<', '>', '"', '|', '?', '*'])
                && !matches!(stem.as_str(), "CON" | "PRN" | "AUX" | "NUL")
                && !(stem.len() == 4
                    && (stem.starts_with("COM") || stem.starts_with("LPT"))
                    && matches!(stem.as_bytes()[3], b'1'..=b'9'))
        })
}
pub(super) fn parse(raw: &str) -> Result<Catalog, String> {
    let c: Catalog = serde_json::from_str(raw).map_err(|_| "catalog: 本地包目录格式无效")?;
    if c.version != 1
        || c.chat.is_empty()
        || c.chat.len() + c.video.len() > 32
        || c.runtimes.len() > 8
    {
        return Err("catalog: 本地包目录版本无效".into());
    }
    let mut ids = HashSet::new();
    for p in c.chat.iter().chain(&c.video) {
        if !safe_relative(&p.id)
            || p.id.contains('/')
            || !ids.insert(&p.id)
            || !hex(&p.revision, 40)
            || p.artifacts.is_empty()
            || p.artifacts.len() > 8
        {
            return Err("catalog: 包身份无效".into());
        }
        let url = reqwest::Url::parse(&p.artifact_base_url).map_err(|_| "catalog: 包来源无效")?;
        if url.scheme() != "https"
            || !matches!(url.host_str(), Some("huggingface.co" | "modelscope.cn"))
            || !url.path().contains(&format!("/resolve/{}", p.revision))
            || url.query().is_some()
            || url.fragment().is_some()
            || !url.username().is_empty()
            || url.password().is_some()
        {
            return Err("catalog: 包来源不是固定版本".into());
        }
        let mut paths = HashSet::new();
        for a in &p.artifacts {
            if !safe_relative(&a.path)
                || !paths.insert(a.path.to_lowercase())
                || !hex(&a.sha256, 64)
                || a.bytes == 0
                || a.bytes > MAX_SAFE
            {
                return Err("catalog: 制品身份无效".into());
            }
        }
        if p.engine == "llama.cpp" {
            if p.artifacts.len() != 2
                || p.artifacts[0].role != "model"
                || p.artifacts[1].role != "projector"
                || p.main_sha256.as_ref() != Some(&p.artifacts[0].sha256)
                || p.vision_sha256.as_ref() != Some(&p.artifacts[1].sha256)
                || p.main_bytes != Some(p.artifacts[0].bytes)
                || p.vision_bytes != Some(p.artifacts[1].bytes)
            {
                return Err("catalog: GGUF 与视觉投影不匹配".into());
            }
        } else if p.engine != "comfyui" {
            return Err("catalog: 不支持的本地引擎".into());
        }
    }
    for a in &c.runtimes {
        let expected = format!(
            "https://github.com/ggml-org/llama.cpp/releases/download/{}/{}",
            a.release, a.id
        );
        if a.source_url != expected
            || a.release != "b11429"
            || !hex(&a.revision, 40)
            || !hex(&a.sha256, 64)
            || a.bytes == 0
            || a.bytes > 1024 * 1024 * 1024
            || !safe_relative(&a.id)
            || a.id.contains('/')
            || !matches!(a.backend.as_str(), "cpu" | "cuda-13.4")
            || !matches!(a.archive_role.as_str(), "server" | "cuda-runtime")
        {
            return Err("catalog: 运行时制品无效".into());
        }
    }
    Ok(c)
}
pub(super) fn prepare(selection: Selection) -> Result<Prepared, String> {
    let c = parse(SOURCE)?;
    prepare_from(c, selection)
}
fn prepare_from(c: Catalog, selection: Selection) -> Result<Prepared, String> {
    if selection.package_ids.is_empty()
        || selection.package_ids.len() > 5
        || !matches!(
            selection.runtime_backend.as_str(),
            "none" | "cpu" | "cuda-13.4"
        )
    {
        return Err("invalid: 安装选择无效".into());
    }
    let mut selected = HashSet::new();
    let mut packages = Vec::new();
    let mut files = BTreeMap::<String, FileSpec>::new();
    for id in &selection.package_ids {
        if !selected.insert(id) {
            return Err("invalid: 重复模型包".into());
        }
        let p = c
            .chat
            .iter()
            .chain(&c.video)
            .find(|p| &p.id == id)
            .ok_or("invalid: 未知本地模型包")?
            .clone();
        if p.engine == "llama.cpp" && selection.runtime_backend == "none" {
            return Err("invalid: Qwen 需要固定推理引擎".into());
        }
        let base = if p.engine == "llama.cpp" {
            format!("packages/{}/{}", p.id, p.revision)
        } else {
            format!("shared/h3/{}/models", p.revision)
        };
        for a in &p.artifacts {
            let relative = format!("{base}/{}", a.path);
            let spec = FileSpec {
                relative: relative.clone(),
                source: format!("{}/{}", p.artifact_base_url, a.path),
                bytes: a.bytes,
                sha256: a.sha256.clone(),
                archive: false,
            };
            if let Some(old) = files.insert(relative, spec.clone()) {
                if old != spec {
                    return Err("catalog: 目标制品冲突".into());
                }
            }
        }
        packages.push(p);
    }
    if selection.runtime_backend != "none" {
        if !packages.iter().any(|p| p.engine == "llama.cpp") {
            return Err("invalid: H3 权重不安装 llama.cpp 引擎".into());
        }
        for a in c
            .runtimes
            .iter()
            .filter(|a| a.backend == selection.runtime_backend)
        {
            let relative = format!("archives/{}.zip", a.sha256);
            files.insert(
                relative.clone(),
                FileSpec {
                    relative,
                    source: a.source_url.clone(),
                    bytes: a.bytes,
                    sha256: a.sha256.clone(),
                    archive: true,
                },
            );
        }
    }
    let files: Vec<_> = files.into_values().collect();
    let download_bytes = files
        .iter()
        .try_fold(0u64, |sum, f| sum.checked_add(f.bytes))
        .ok_or("catalog: 总体积溢出")?;
    let required_bytes = required_space(
        download_bytes,
        files.iter().filter(|f| f.archive).count() as u64 * MAX_ARCHIVE_EXPANSION,
    )?;
    let canonical = serde_json::json!({"version":1,"packages":packages,"runtimes":c.runtimes.iter().filter(|a|a.backend==selection.runtime_backend).collect::<Vec<_>>()});
    Ok(Prepared {
        files,
        packages,
        selection,
        fingerprint: hash(&serde_json::to_vec(&canonical).map_err(|_| "catalog: 目录无效")?),
        download_bytes,
        required_bytes,
    })
}
#[cfg(test)]
#[path = "catalog_tests.rs"]
mod tests;
