//! An immutable migration plan makes publication resumable without guessing which backup won.
use super::{random_id, RepositoryIdentity};
use crate::asset_storage::io;
use crate::storage_paths::AppPaths;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

#[cfg(test)]
#[path = "chat_migration_tests.rs"]
mod tests;
#[path = "chat_migration_value.rs"]
mod value;

const MAX_SNAPSHOT: usize = 512 * 1024 * 1024;
const PLAN: &str = "app/chat-migration-v3.json";
const COMPLETE: &str = "app/chat-migration-v3-complete.json";

#[cfg(test)]
pub(super) fn migrated_snapshot(snapshot: &Value) -> Result<Value, String> {
    value::migrate(snapshot)
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Plan {
    version: u32,
    repository_id: String,
    main: Option<String>,
    backup: Option<String>,
    identity: Option<String>,
    journals: BTreeMap<String, String>,
    candidate: String,
    revision: u64,
}
fn fail(stage: &str) -> Result<(), String> {
    #[cfg(test)]
    tests::fail_at(stage)?;
    let _ = stage;
    Ok(())
}
fn hash(raw: &[u8]) -> String {
    crate::asset_storage::validation::hash(raw)
}
fn valid_hash(hash: &str) -> bool {
    hash.len() == 64
        && hash
            .bytes()
            .all(|b| b.is_ascii_hexdigit() && !b.is_ascii_uppercase())
}
fn problem() -> String {
    "corrupt: 聊天迁移状态无法安全确认，已保留全部原件；请从迁移回执恢复".into()
}
fn archive_root(paths: &AppPaths, repository_id: &str) -> PathBuf {
    paths
        .root
        .join("backups/chat-migration-v3")
        .join(repository_id)
}
fn read(path: &Path) -> Result<Option<Vec<u8>>, String> {
    io::read(path, MAX_SNAPSHOT)
}
fn immutable(path: &Path, raw: &[u8]) -> Result<(), String> {
    if let Some(existing) = read(path)? {
        return if existing == raw {
            Ok(())
        } else {
            Err(problem())
        };
    }
    let temp = crate::creation_storage::durable_temp(path, raw)?;
    if read(&temp)?.as_deref() != Some(raw) {
        return Err(problem());
    }
    fail("immutable-before-publish")?;
    // A no-replace link publishes only a complete file; interrupted candidates remain as evidence.
    fs::hard_link(&temp, path).map_err(io::error)?;
    if read(path)?.as_deref() != Some(raw) {
        return Err(problem());
    }
    crate::creation_storage::sync_parent(path)
}
fn archive(directory: &Path, raw: Option<&[u8]>) -> Result<Option<String>, String> {
    raw.map(|raw| {
        let digest = hash(raw);
        immutable(&directory.join(format!("{digest}.json")), raw)?;
        Ok(digest)
    })
    .transpose()
}
fn decode(raw: &[u8]) -> Result<Value, String> {
    let parsed: Value = serde_json::from_slice(raw)
        .map_err(|_| "corrupt: 项目 JSON 无效，原件已保留".to_string())?;
    crate::creation_storage::validate_snapshot_value(&parsed)?;
    Ok(parsed)
}
fn future(raw: Option<&[u8]>) -> Result<(), String> {
    if raw
        .and_then(|raw| serde_json::from_slice::<Value>(raw).ok())
        .is_some_and(|v| {
            v.get("version")
                .is_some_and(|version| !matches!(version.as_u64(), Some(2 | 3)))
        })
    {
        return Err("unsupported: 未来项目主文件或备份不能迁移，原件已保留".into());
    }
    Ok(())
}
fn admit_companion(paths: &AppPaths) -> Result<(), String> {
    if io::checked_metadata(&paths.root.join("app/companion.json"))?.is_some() {
        return Err("unsupported: 伴随服务仓库不能作为 Native 仓库迁移，请显式导入".into());
    }
    Ok(())
}

fn read_journals(paths: &AppPaths) -> Result<BTreeMap<String, Vec<u8>>, String> {
    let mut journals = BTreeMap::new();
    for entry in fs::read_dir(paths.tasks.join("native-host")).map_err(io::error)? {
        let path = entry.map_err(io::error)?.path();
        if path
            .extension()
            .is_some_and(|extension| extension == "json")
        {
            let name = path
                .file_name()
                .and_then(|name| name.to_str())
                .ok_or_else(problem)?
                .to_string();
            let raw = io::read(&path, 256 * 1024)?.ok_or_else(problem)?;
            crate::task_host::validate_journal_bytes(&raw)?;
            journals.insert(name, raw);
        }
    }
    Ok(journals)
}

/// Called with the Native owner and all legacy repository locks held, before TaskHost exists.
pub(super) fn upgrade(
    paths: &AppPaths,
    identity: Option<RepositoryIdentity>,
) -> Result<RepositoryIdentity, String> {
    admit_companion(paths)?;
    if let Some(raw) = read(&paths.root.join(PLAN))? {
        let plan: Plan = serde_json::from_slice(&raw).map_err(|_| problem())?;
        return publish(paths, plan, &raw);
    }
    let main = read(&paths.creation)?;
    let backup = read(&paths.creation.with_extension("json.bak"))?;
    future(main.as_deref())?;
    future(backup.as_deref())?;
    let main_value = main.as_deref().map(decode).transpose();
    let backup_value = backup.as_deref().map(decode).transpose();
    if let Ok(Some(backup)) = &backup_value {
        value::migrate(backup)?;
    } else if backup
        .as_deref()
        .and_then(|raw| serde_json::from_slice::<Value>(raw).ok())
        .is_some_and(|value| value["version"] == 3)
    {
        return Err(problem());
    }
    // A corrupt unused backup is retained; future versions and IO are never treated as missing.
    let source = match main_value {
        Ok(Some(main)) => {
            if let Ok(Some(backup)) = &backup_value {
                if backup["revision"].as_u64() > main["revision"].as_u64()
                    || (backup["revision"] == main["revision"] && backup != &main)
                    || (main["version"] == 2 && backup["version"] == 3)
                {
                    return Err(problem());
                }
            }
            Some(main)
        }
        Ok(None) | Err(_) => {
            // Malformed chat identities cannot be silently replaced by older history.
            if main
                .as_deref()
                .and_then(|raw| serde_json::from_slice::<Value>(raw).ok())
                .is_some_and(|v| v["version"] == 3)
            {
                return Err(problem());
            }
            match backup_value {
                Ok(Some(backup)) => Some(backup),
                Ok(None) if main.is_none() => None,
                _ => return Err(problem()),
            }
        }
    };
    let journal_raws = read_journals(paths)?;
    if identity.as_ref().is_some_and(|id| id.format_version == 2) {
        return match source {
            Some(source)
                if source["version"] == 3
                    && backup.as_deref().is_some_and(|raw| {
                        decode(raw).map(|v| v["version"] == 3).unwrap_or(true)
                    }) =>
            {
                Ok(identity.unwrap())
            }
            None => Ok(identity.unwrap()),
            _ => Err(problem()),
        };
    }
    let identity_raw = read(&paths.root.join("app/repository.json"))?;
    let repository_id = identity
        .map(|id| id.repository_id)
        .map(Ok)
        .unwrap_or_else(random_id)?;
    let target_identity = RepositoryIdentity {
        version: 1,
        repository_id: repository_id.clone(),
        format_version: 2,
        minimum_writer_version: 2,
    };
    let Some(source) = source else {
        if identity_raw.is_some() || !journal_raws.is_empty() {
            io::directory(&paths.root.join("backups/chat-migration-v3"))?;
            let directory = archive_root(paths, &repository_id);
            io::directory(&directory)?;
            archive(&directory, identity_raw.as_deref())?;
            for raw in journal_raws.values() {
                archive(&directory, Some(raw))?;
            }
        }
        io::atomic_write(
            &paths.root.join("app/repository.json"),
            &serde_json::to_vec(&target_identity).map_err(io::error)?,
            true,
        )?;
        return Ok(target_identity);
    };
    let candidate = value::migrate(&source)?;
    crate::creation_storage::validate_snapshot_value(&candidate)?;
    let candidate_raw = serde_json::to_vec_pretty(&candidate).map_err(io::error)?;
    io::directory(&paths.root.join("backups/chat-migration-v3"))?;
    let directory = archive_root(paths, &repository_id);
    io::directory(&directory)?;
    let main_hash = archive(&directory, main.as_deref())?;
    fail("archive-main")?;
    let backup_hash = archive(&directory, backup.as_deref())?;
    fail("archive-backup")?;
    let identity_hash = archive(&directory, identity_raw.as_deref())?;
    let mut journals = BTreeMap::new();
    for (name, raw) in journal_raws {
        journals.insert(name, archive(&directory, Some(&raw))?.ok_or_else(problem)?);
    }
    fail("archive-journals")?;
    let candidate_hash = archive(&directory, Some(&candidate_raw))?.ok_or_else(problem)?;
    fail("candidate")?;
    let plan = Plan {
        version: 1,
        repository_id,
        main: main_hash,
        backup: backup_hash,
        identity: identity_hash,
        journals,
        candidate: candidate_hash,
        revision: candidate["revision"].as_u64().ok_or_else(problem)?,
    };
    let raw = serde_json::to_vec_pretty(&plan).map_err(io::error)?;
    immutable(&paths.root.join(PLAN), &raw)?;
    fail("plan")?;
    publish(paths, plan, &raw)
}

fn original(directory: &Path, digest: Option<&str>) -> Result<Option<Vec<u8>>, String> {
    digest
        .map(|digest| {
            if !valid_hash(digest) {
                return Err(problem());
            }
            let raw = read(&directory.join(format!("{digest}.json")))?.ok_or_else(problem)?;
            if hash(&raw) != digest {
                return Err(problem());
            }
            Ok(raw)
        })
        .transpose()
}
fn publish(paths: &AppPaths, plan: Plan, plan_raw: &[u8]) -> Result<RepositoryIdentity, String> {
    if plan.version != 1 || !super::valid_id(&plan.repository_id) || !valid_hash(&plan.candidate) {
        return Err(problem());
    }
    let directory = archive_root(paths, &plan.repository_id);
    io::directory(&paths.root.join("backups/chat-migration-v3"))?;
    io::directory(&directory)?;
    let candidate = original(&directory, Some(&plan.candidate))?.ok_or_else(problem)?;
    let value = decode(&candidate)?;
    if value["version"] != 3 || value["revision"].as_u64() != Some(plan.revision) {
        return Err(problem());
    }
    let old_main = original(&directory, plan.main.as_deref())?;
    let old_backup = original(&directory, plan.backup.as_deref())?;
    let old_identity = original(&directory, plan.identity.as_deref())?;
    for (name, digest) in &plan.journals {
        if name.contains('/')
            || name.contains('\\')
            || name.contains(':')
            || !name.ends_with(".json")
        {
            return Err(problem());
        }
        original(&directory, Some(digest))?;
    }
    let current_journals = read_journals(paths)?
        .into_iter()
        .map(|(name, raw)| (name, hash(&raw)))
        .collect::<BTreeMap<_, _>>();
    let identity = RepositoryIdentity {
        version: 1,
        repository_id: plan.repository_id,
        format_version: 2,
        minimum_writer_version: 2,
    };
    let identity_raw = serde_json::to_vec(&identity).map_err(io::error)?;
    let main = read(&paths.creation)?;
    let backup = read(&paths.creation.with_extension("json.bak"))?;
    future(main.as_deref())?;
    future(backup.as_deref())?;
    let marker = read(&paths.root.join("app/repository.json"))?;
    // Once complete, ordinary CAS writes may advance main/backup. The immutable receipt remains history.
    if let Some(receipt) = read(&paths.root.join(COMPLETE))? {
        if receipt != plan_raw || marker.as_deref() != Some(identity_raw.as_slice()) {
            return Err(problem());
        }
        let mut valid = false;
        for raw in [main.as_deref(), backup.as_deref()].into_iter().flatten() {
            if let Ok(value) = decode(raw) {
                if value["version"] != 3 {
                    return Err(problem());
                }
                valid = true;
            }
        }
        if !valid {
            return Err(problem());
        }
        return Ok(identity);
    }
    if current_journals != plan.journals {
        return Err(problem());
    }
    let main_old = main == old_main;
    let backup_old = backup == old_backup;
    let main_new = main.as_deref() == Some(candidate.as_slice());
    let backup_new = backup.as_deref() == Some(candidate.as_slice());
    let marker_old = marker == old_identity;
    let marker_new = marker.as_deref() == Some(identity_raw.as_slice());
    if !((main_old && backup_old && marker_old)
        || (main_old && backup_new && marker_old)
        || (main_new && backup_new && (marker_old || marker_new)))
    {
        return Err(problem());
    }
    for (name, digest) in &plan.journals {
        if !read(&paths.tasks.join("native-host").join(name))?
            .is_some_and(|raw| hash(&raw) == *digest)
        {
            return Err(problem());
        }
    }
    if !backup_new {
        io::atomic_write(&paths.creation.with_extension("json.bak"), &candidate, true)?;
    }
    fail("backup")?;
    if !main_new {
        io::atomic_write(&paths.creation, &candidate, true)?;
    }
    fail("main")?;
    if !marker_new {
        io::atomic_write(&paths.root.join("app/repository.json"), &identity_raw, true)?;
    }
    fail("marker")?;
    immutable(&paths.root.join(COMPLETE), plan_raw)?;
    fail("receipt")?;
    Ok(identity)
}
