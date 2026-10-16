use crate::asset_storage::{io, AssetRepository};
use crate::creation_storage::SnapshotRepository;
use crate::native_repository_lock::{exclusive, message, LockError, OwnedLocks};
use crate::storage_paths::AppPaths;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Arc;

#[cfg(test)]
#[path = "native_root_authority_tests.rs"]
pub(crate) mod tests;

pub(crate) const PROTOCOL_VERSION: u32 = 1;
const FORMAT_VERSION: u32 = 1;
const WRITER_VERSION: u32 = 1;
const MAX_RECORDS: usize = 100_000;

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct RepositoryIdentity {
    pub version: u32,
    pub repository_id: String,
    pub format_version: u32,
    pub minimum_writer_version: u32,
}

pub(crate) fn valid_id(value: &str) -> bool {
    value.len() == 32
        && value
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}

pub(crate) fn random_id() -> Result<String, String> {
    let mut bytes = [0u8; 16];
    getrandom::fill(&mut bytes).map_err(|_| "io: 无法取得系统随机身份".to_string())?;
    Ok(bytes.iter().map(|byte| format!("{byte:02x}")).collect())
}

pub(crate) fn read_identity(root: &Path) -> Result<Option<RepositoryIdentity>, String> {
    let Some(raw) = io::read(&root.join("app/repository.json"), 4096)? else {
        return Ok(None);
    };
    let identity: RepositoryIdentity = serde_json::from_slice(&raw)
        .map_err(|_| "corrupt: 仓库身份文件无效，已保留原文件".to_string())?;
    if identity.version != 1
        || identity.format_version != FORMAT_VERSION
        || identity.minimum_writer_version != WRITER_VERSION
    {
        return Err("unsupported: 仓库格式或最低写入版本不受支持".into());
    }
    if !valid_id(&identity.repository_id) {
        return Err("corrupt: 仓库身份无效，已保留原文件".into());
    }
    Ok(Some(identity))
}

pub(crate) struct NativeRootAuthority {
    pub root: PathBuf,
    pub identity: RepositoryIdentity,
    pub epoch: String,
    pub snapshots: Arc<SnapshotRepository>,
    pub assets: Arc<AssetRepository>,
    pub task_host: Arc<crate::task_host::TaskHost>,
    _locks: Arc<OwnedLocks>,
}

impl NativeRootAuthority {
    // None is a secondary. It must activate the existing owner and cannot recover jobs.
    pub(crate) fn elect(paths: &AppPaths) -> Result<Option<Arc<Self>>, String> {
        read_identity(&paths.root)?;
        let owner = match exclusive(&paths.root.join(".kk-native-owner.lock")) {
            Ok(owner) => owner,
            Err(LockError::Busy) => return Ok(None),
            Err(error) => return Err(message(error)),
        };
        let identity = read_identity(&paths.root)?;
        let snapshot_lock =
            exclusive(&paths.creation.with_extension("json.lock")).map_err(message)?;
        let assets_lock = exclusive(&paths.assets.join("repository.lock")).map_err(message)?;
        let journal = paths.tasks.join("native-host");
        io::directory(&journal)?;
        let journal_lock = exclusive(&journal.join("repository.lock")).map_err(message)?;
        let locks = OwnedLocks::new(owner, snapshot_lock, assets_lock, journal_lock);
        let snapshots = Arc::new(SnapshotRepository::owned(
            paths.creation.clone(),
            locks.access(),
        ));
        let assets = Arc::new(AssetRepository::owned(paths.assets.clone(), locks.access()));
        for path in [&paths.creation, &paths.creation.with_extension("json.bak")] {
            if io::checked_metadata(path)?.is_some_and(|metadata| !metadata.is_file()) {
                return Err("corrupt: 项目快照路径类型无效".into());
            }
        }
        snapshots.read()?;
        if let Some(raw) = fs::read(paths.creation.with_extension("json.bak"))
            .map(Some)
            .or_else(|error| {
                if error.kind() == std::io::ErrorKind::NotFound {
                    Ok(None)
                } else {
                    Err(error)
                }
            })
            .map_err(io::error)?
        {
            // A usable primary leaves its corrupt unused backup for the existing writer to archive.
            if let Ok(value) = serde_json::from_slice::<Value>(&raw) {
                if let Err(error) = crate::creation_storage::validate_snapshot_value(&value) {
                    if !error.starts_with("corrupt:") {
                        return Err(error);
                    }
                }
            }
        }
        admit_asset_records(&paths.assets)?;
        // No marker is published until both legacy locks and Native format admission succeed.
        let identity = match identity {
            Some(identity) => identity,
            None => {
                let identity = RepositoryIdentity {
                    version: 1,
                    repository_id: random_id()?,
                    format_version: FORMAT_VERSION,
                    minimum_writer_version: WRITER_VERSION,
                };
                io::atomic_write(
                    &paths.root.join("app/repository.json"),
                    &serde_json::to_vec(&identity).map_err(io::error)?,
                    true,
                )?;
                identity
            }
        };
        io::directory(&paths.assets.join("blobs"))?;
        io::directory(&paths.assets.join("records"))?;
        let task_host = Arc::new(crate::task_host::TaskHost::owned(
            journal,
            Arc::clone(&assets),
            locks.access(),
        )?);
        Ok(Some(Arc::new(Self {
            root: paths.root.clone(),
            identity,
            epoch: random_id()?,
            snapshots,
            assets,
            task_host,
            _locks: locks,
        })))
    }
}

fn admit_asset_records(root: &Path) -> Result<(), String> {
    for name in ["blobs", "records"] {
        if io::checked_metadata(&root.join(name))?.is_some_and(|metadata| !metadata.is_dir()) {
            return Err("corrupt: 素材目录类型无效".into());
        }
    }
    let directory = root.join("records");
    if !directory.exists() {
        return Ok(());
    }
    let mut count = 0;
    for entry in fs::read_dir(directory).map_err(io::error)? {
        let entry = entry.map_err(io::error)?;
        count += 1;
        if count > MAX_RECORDS {
            return Err("unsupported: 素材记录超过启动校验上限，请使用受支持的导入流程".into());
        }
        let path = entry.path();
        io::checked_metadata(&path)?;
        if path
            .extension()
            .is_some_and(|extension| extension != "json")
        {
            continue;
        }
        let id = path
            .file_stem()
            .and_then(|stem| stem.to_str())
            .ok_or_else(|| "corrupt: 素材记录文件名无效".to_string())?;
        let raw = io::read(&path, crate::asset_storage::validation::MAX_RECORD_BYTES)?
            .ok_or_else(|| "missing: 素材记录在校验期间丢失".to_string())?;
        let value: Value =
            serde_json::from_slice(&raw).map_err(|_| "corrupt: 素材记录 JSON 无效".to_string())?;
        if value.get("assetId").is_some() || value.get("size").is_some() {
            return Err(
                "unsupported: 旧伴随服务素材格式不能作为 Native 仓库打开，请显式导入".into(),
            );
        }
        crate::asset_storage::validation::decode_record(&raw, id)?;
    }
    Ok(())
}
