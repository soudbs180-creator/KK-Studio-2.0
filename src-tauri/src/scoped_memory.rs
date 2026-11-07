use crate::asset_storage::io::checked_metadata;
use crate::creation_storage::atomic_write;
use crate::{validate_memory_store, with_memory_file_lock, AppState, MemoryStore};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};
use tauri::State;

fn scope(namespace: &str) -> Result<(&str, Option<&str>), String> {
    if namespace == "global" {
        return Ok(("global", None));
    }
    match namespace.split_once(':') {
        Some((scope @ ("project" | "session"), id)) if !id.trim().is_empty() => {
            Ok((scope, Some(id)))
        }
        _ => Err("记忆命名空间无效".to_string()),
    }
}

fn namespace_path(global: &Path, namespace: &str) -> Result<PathBuf, String> {
    let (scope, id) = scope(namespace)?;
    let Some(id) = id else {
        return Ok(global.to_path_buf());
    };
    let directory = global
        .parent()
        .ok_or_else(|| "记忆文件路径无效".to_string())?
        .join(if scope == "project" {
            "projects"
        } else {
            "sessions"
        });
    if checked_metadata(&directory)?.is_some_and(|metadata| !metadata.is_dir()) {
        return Err("记忆目录被文件占用".to_string());
    }
    // Hashing UTF-8 identifiers also keeps long JSON identifiers within filesystem limits.
    let filename = format!("{:x}.json", Sha256::digest(id.as_bytes()));
    Ok(directory.join(filename))
}

fn read_raw(path: &Path) -> Result<Option<String>, String> {
    if checked_metadata(path)?.is_some_and(|metadata| !metadata.is_file()) {
        return Err("记忆文件路径不是普通文件".to_string());
    }
    match fs::read_to_string(path) {
        Ok(raw) => Ok(Some(raw)),
        Err(error) if error.kind() == ErrorKind::NotFound => Ok(None),
        Err(error) => Err(format!("无法读取记忆文件：{error}")),
    }
}

pub(super) fn validate(raw: &str, namespace: &str, allow_v1: bool) -> Result<Value, String> {
    let value: Value =
        serde_json::from_str(raw).map_err(|_| "记忆文件格式无效，已保留原文件".to_string())?;
    let store: MemoryStore = serde_json::from_value(value.clone())
        .map_err(|_| "记忆文件格式无效，已保留原文件".to_string())?;
    validate_memory_store(&store)?;
    if store.version == 1 && allow_v1 && namespace == "global" {
        return Ok(value);
    }
    if store.version != 2 {
        return Err(format!(
            "记忆文件版本不支持（{}），已保留原文件",
            store.version
        ));
    }
    let (expected_scope, expected_id) = scope(namespace)?;
    let metadata = value.get("metadata");
    let nonempty_string = |field: Option<&Value>| {
        field
            .and_then(Value::as_str)
            .is_some_and(|text| !text.trim().is_empty())
    };
    let valid = store.namespace == namespace
        && metadata
            .and_then(|entry| entry.get("scope"))
            .and_then(Value::as_str)
            == Some(expected_scope)
        && metadata
            .and_then(|entry| entry.get("scopeId"))
            .map(Value::as_str)
            == expected_id.map(Some)
        && metadata
            .and_then(|entry| entry.get("recordCount"))
            .and_then(Value::as_u64)
            == Some(store.records.len() as u64)
        && nonempty_string(value.get("updatedAt"))
        && nonempty_string(metadata.and_then(|entry| entry.get("createdAt")))
        && nonempty_string(metadata.and_then(|entry| entry.get("updatedAt")))
        && metadata
            .and_then(|entry| entry.get("description"))
            .is_none_or(Value::is_string);
    if !valid {
        return Err("记忆文件作用域或元数据无效，已保留原文件".to_string());
    }
    Ok(value)
}

fn read_scoped(global: &Path, namespace: &str) -> Result<Option<String>, String> {
    let path = namespace_path(global, namespace)?;
    let raw = read_raw(&path)?;
    if let Some(raw) = &raw {
        validate(raw, namespace, true)?;
    }
    Ok(raw)
}

pub(super) fn write_legacy_v2(path: &Path, store: &MemoryStore) -> Result<bool, String> {
    let Some(raw) = read_raw(path)? else {
        return Ok(false);
    };
    if serde_json::from_str::<Value>(&raw)
        .ok()
        .as_ref()
        .and_then(|value| value.get("version"))
        .and_then(Value::as_u64)
        != Some(2)
    {
        return Ok(false);
    }
    let mut value = validate(&raw, "global", false)?;
    let mut records = serde_json::to_value(&store.records).map_err(|error| error.to_string())?;
    let mut existing_records = HashMap::new();
    for record in value["records"]
        .as_array()
        .expect("validated memory records")
    {
        existing_records
            .entry(record["id"].as_str().expect("validated memory id"))
            .or_insert(record);
    }
    for record in records.as_array_mut().expect("serialized memory records") {
        if let Some(existing) =
            existing_records.get(record["id"].as_str().expect("serialized memory id"))
        {
            let mut merged = existing
                .as_object()
                .expect("validated memory record")
                .clone();
            merged.remove("sourceThreadId");
            merged.remove("lastUsedAt");
            merged.extend(
                record
                    .as_object()
                    .expect("serialized memory record")
                    .clone(),
            );
            *record = Value::Object(merged);
        }
    }
    value["records"] = records;
    value["metadata"]["recordCount"] = Value::from(store.records.len());
    let updated_at = Value::String(crate::task_host::rfc3339_now());
    value["updatedAt"] = updated_at.clone();
    value["metadata"]["updatedAt"] = updated_at;
    atomic_write(path, value.to_string().as_bytes())?;
    Ok(true)
}

fn write_scoped(
    global: &Path,
    namespace: &str,
    serialized_data: &str,
    expected_serialized: Option<&str>,
) -> Result<(), String> {
    let path = namespace_path(global, namespace)?;
    checked_metadata(&path.with_extension("json.lock"))?;
    with_memory_file_lock(&path, || {
        let current = read_raw(&path)?;
        if current.as_deref() != expected_serialized {
            return Err("MEMORY_CONFLICT：共享记忆已被其他窗口修改".to_string());
        }
        let previous = current
            .as_ref()
            .map(|raw| validate(raw, namespace, true))
            .transpose()?;
        validate(serialized_data, namespace, false)?;
        if previous
            .as_ref()
            .and_then(|value| value.get("version"))
            .and_then(Value::as_u64)
            == Some(1)
        {
            let backup = path.with_extension(format!("previous-{}.json", uuid::Uuid::new_v4()));
            atomic_write(
                &backup,
                current
                    .as_ref()
                    .expect("validated existing memory")
                    .as_bytes(),
            )?;
        }
        atomic_write(&path, serialized_data.as_bytes())
    })
}

fn list_namespaces(global: &Path) -> Result<Vec<String>, String> {
    let mut namespaces = Vec::new();
    if read_scoped(global, "global")?.is_some() {
        namespaces.push("global".to_string());
    }
    let parent = global
        .parent()
        .ok_or_else(|| "记忆文件路径无效".to_string())?;
    for (directory, expected_scope) in [("projects", "project"), ("sessions", "session")] {
        let directory = parent.join(directory);
        checked_metadata(&directory)?;
        let entries = match fs::read_dir(directory) {
            Ok(entries) => entries,
            Err(error) if error.kind() == ErrorKind::NotFound => continue,
            Err(error) => return Err(format!("无法列出记忆命名空间：{error}")),
        };
        for entry in entries {
            let entry = entry.map_err(|error| format!("无法列出记忆命名空间：{error}"))?;
            let path = entry.path();
            if path.extension().and_then(|extension| extension.to_str()) != Some("json") {
                continue;
            }
            if path
                .file_stem()
                .and_then(|stem| stem.to_str())
                .and_then(|stem| stem.rsplit_once(".previous-"))
                .is_some_and(|(_, nonce)| uuid::Uuid::parse_str(nonce).is_ok())
            {
                continue;
            }
            let raw =
                read_raw(&path)?.ok_or_else(|| "记忆文件在列举时发生变化，请重试".to_string())?;
            let value: Value = serde_json::from_str(&raw)
                .map_err(|_| "记忆文件格式无效，已保留原文件".to_string())?;
            let namespace = value
                .get("namespace")
                .and_then(Value::as_str)
                .ok_or_else(|| "记忆命名空间无效".to_string())?;
            if scope(namespace)?.0 != expected_scope || namespace_path(global, namespace)? != path {
                return Err("记忆文件路径与命名空间不一致".to_string());
            }
            validate(&raw, namespace, false)?;
            namespaces.push(namespace.to_string());
        }
    }
    namespaces.sort();
    Ok(namespaces)
}

fn reset_scoped(global: &Path, namespace: &str) -> Result<(), String> {
    let path = namespace_path(global, namespace)?;
    checked_metadata(&path.with_extension("json.lock"))?;
    with_memory_file_lock(&path, || {
        let current = read_raw(&path)?;
        let previous_value = current
            .as_deref()
            .map(|raw| validate(raw, namespace, true))
            .transpose()?;
        let backup = path.with_extension(format!("previous-{}.json", uuid::Uuid::new_v4()));
        checked_metadata(&backup)?;
        if namespace == "global" {
            return crate::reset_memory_file_with_writer(&path, &backup, crate::write_memory_file)
                .map(|_| ());
        }
        let (scope, id) = scope(namespace)?;
        let now = crate::task_host::rfc3339_now();
        let mut value = previous_value.unwrap_or_else(|| serde_json::json!({
            "version": 2, "namespace": namespace, "records": [], "updatedAt": now,
            "metadata": { "scope": scope, "scopeId": id, "createdAt": now, "updatedAt": now, "recordCount": 0 }
        }));
        value["records"] = serde_json::json!([]);
        value["metadata"]["recordCount"] = Value::from(0);
        value["updatedAt"] = Value::String(now.clone());
        value["metadata"]["updatedAt"] = Value::String(now);
        let serialized = value.to_string();
        validate(&serialized, namespace, false)?;
        crate::reset_memory_file_with_writer(&path, &backup, |path, _| {
            atomic_write(path, serialized.as_bytes())
        })
        .map(|_| ())
    })
}

#[tauri::command(rename_all = "camelCase")]
pub(crate) fn memory_reset_scoped(state: State<AppState>, namespace: String) -> Result<(), String> {
    reset_scoped(&state.memory_path, &namespace)
}

#[tauri::command(rename_all = "camelCase")]
pub(crate) fn memory_read_scoped(
    state: State<AppState>,
    namespace: String,
) -> Result<Option<Value>, String> {
    if namespace == "global" {
        if let Some(legacy) = &state.legacy_memory_path {
            crate::seed_shared_memory(&state.memory_path, legacy)?;
        }
    }
    // Return the raw JSON as a JSON string so CAS retains whitespace and field ordering.
    read_scoped(&state.memory_path, &namespace).map(|raw| raw.map(Value::String))
}

#[tauri::command(rename_all = "camelCase")]
pub(crate) fn memory_write_scoped(
    state: State<AppState>,
    namespace: String,
    serialized_data: String,
    expected_serialized: Option<String>,
) -> Result<(), String> {
    write_scoped(
        &state.memory_path,
        &namespace,
        &serialized_data,
        expected_serialized.as_deref(),
    )
}

#[tauri::command]
pub(crate) fn memory_list_namespaces(state: State<AppState>) -> Result<Vec<String>, String> {
    list_namespaces(&state.memory_path)
}

#[cfg(test)]
mod tests {
    use super::*;

    struct Fixture(PathBuf);

    impl Fixture {
        fn new() -> Self {
            let root =
                std::env::temp_dir().join(format!("kk-scoped-memory-{}", uuid::Uuid::new_v4()));
            fs::create_dir_all(&root).expect("fixture directory");
            Self(root.join("memory.json"))
        }
    }

    impl Drop for Fixture {
        fn drop(&mut self) {
            fs::remove_dir_all(self.0.parent().expect("fixture parent")).expect("cleanup fixture");
        }
    }

    fn sample(namespace: &str) -> Value {
        let (scope, id) = scope(namespace).unwrap();
        let mut value = serde_json::json!({
            "version": 2, "namespace": namespace, "records": [{
                "id": "r1", "content": "用户偏好日系插画", "memoryType": "user_preference",
                "confidence": 0.8, "fingerprint": "fp-1", "source": "manual_user",
                "createdAt": "2026-11-04T00:00:00Z", "updatedAt": "2026-11-04T00:00:00Z", "active": true
            }],
            "updatedAt": "2026-11-04T00:00:00Z", "metadata": {
                "scope": scope, "createdAt": "2026-11-04T00:00:00Z", "updatedAt": "2026-11-04T00:00:00Z",
                "recordCount": 1, "description": "preserve metadata"
            }, "futureCompatibleField": { "kept": true }
        });
        if let Some(id) = id {
            value["metadata"]["scopeId"] = Value::String(id.to_string());
        }
        value
    }

    #[test]
    fn desktop_scoped_reset_backs_up_exact_v2_and_keeps_other_namespaces() {
        let fixture = Fixture::new();
        let global = sample("global").to_string();
        write_scoped(&fixture.0, "global", &global, None).unwrap();
        let other = sample("project:other").to_string();
        write_scoped(&fixture.0, "project:other", &other, None).unwrap();
        for namespace in ["project:p1", "session:[\"p1\",\"c1\"]"] {
            let original = serde_json::to_string_pretty(&sample(namespace)).unwrap();
            write_scoped(&fixture.0, namespace, &original, None).unwrap();
            reset_scoped(&fixture.0, namespace).unwrap();
            let reset = read_scoped(&fixture.0, namespace).unwrap().unwrap();
            let value: Value = serde_json::from_str(&reset).unwrap();
            assert_eq!(value["records"], serde_json::json!([]));
            assert_eq!(value["metadata"]["recordCount"], 0);
            assert_eq!(
                value["futureCompatibleField"],
                sample(namespace)["futureCompatibleField"]
            );
            let path = namespace_path(&fixture.0, namespace).unwrap();
            let backups: Vec<_> = fs::read_dir(path.parent().unwrap())
                .unwrap()
                .map(|entry| entry.unwrap().path())
                .filter(|entry| {
                    entry
                        .file_name()
                        .unwrap()
                        .to_string_lossy()
                        .starts_with(&format!(
                            "{}.previous-",
                            path.file_stem().unwrap().to_string_lossy()
                        ))
                })
                .collect();
            assert_eq!(backups.len(), 1);
            assert_eq!(fs::read_to_string(&backups[0]).unwrap(), original);
            assert!(
                write_scoped(&fixture.0, namespace, &original, Some(&original))
                    .unwrap_err()
                    .contains("MEMORY_CONFLICT")
            );
            let backup_raw = fs::read_to_string(&backups[0]).unwrap();
            write_scoped(&fixture.0, namespace, &backup_raw, Some(&reset)).unwrap();
            assert_eq!(
                read_scoped(&fixture.0, namespace).unwrap().unwrap(),
                original
            );
        }
        assert_eq!(read_scoped(&fixture.0, "global").unwrap().unwrap(), global);
        assert_eq!(
            read_scoped(&fixture.0, "project:other").unwrap().unwrap(),
            other
        );
        assert_eq!(list_namespaces(&fixture.0).unwrap().len(), 4);
    }

    #[test]
    fn desktop_scoped_reset_rejects_corruption_and_creates_valid_absent_scope() {
        let fixture = Fixture::new();
        reset_scoped(&fixture.0, "project:new").unwrap();
        let path = namespace_path(&fixture.0, "project:new").unwrap();
        for raw in ["{broken", "{\"version\":99}"] {
            fs::write(&path, raw).unwrap();
            assert!(reset_scoped(&fixture.0, "project:new").is_err());
            assert_eq!(fs::read_to_string(&path).unwrap(), raw);
        }
        assert!(reset_scoped(&fixture.0, "project:").is_err());
    }

    #[test]
    fn desktop_scoped_memory_roundtrips_all_scopes_and_raw_fields() {
        let fixture = Fixture::new();
        assert_eq!(read_scoped(&fixture.0, "global").unwrap(), None);
        assert!(list_namespaces(&fixture.0).unwrap().is_empty());
        let namespaces = [
            "global",
            "project:../项目/CON",
            "session:{\"projectId\":\"p1\",\"chatId\":\"c1\"}",
        ];
        for namespace in namespaces {
            let raw = serde_json::to_string_pretty(&sample(namespace)).unwrap();
            write_scoped(&fixture.0, namespace, &raw, None).unwrap();
            assert_eq!(read_scoped(&fixture.0, namespace).unwrap(), Some(raw));
            let path = namespace_path(&fixture.0, namespace).unwrap();
            assert!(path.starts_with(fixture.0.parent().unwrap()));
        }
        assert_eq!(list_namespaces(&fixture.0).unwrap(), namespaces);
        let long_id = format!("session:{}", "中文/..".repeat(100));
        assert!(
            namespace_path(&fixture.0, &long_id)
                .unwrap()
                .file_name()
                .unwrap()
                .len()
                < 100
        );
        for invalid in ["", "project", "session:", "global:other", "../escape"] {
            assert!(namespace_path(&fixture.0, invalid).is_err());
        }
    }

    #[test]
    fn desktop_scoped_memory_cas_compares_exact_bytes_and_absence() {
        let fixture = Fixture::new();
        let raw = serde_json::to_string_pretty(&sample("global")).unwrap();
        write_scoped(&fixture.0, "global", &raw, None).unwrap();
        let compact = serde_json::to_string(&sample("global")).unwrap();
        for expected in [None, Some(compact.as_str())] {
            assert!(write_scoped(&fixture.0, "global", &compact, expected)
                .unwrap_err()
                .contains("MEMORY_CONFLICT"));
            assert_eq!(fs::read_to_string(&fixture.0).unwrap(), raw);
        }
        write_scoped(&fixture.0, "global", &compact, Some(&raw)).unwrap();
        assert_eq!(read_scoped(&fixture.0, "global").unwrap(), Some(compact));
    }

    #[test]
    fn desktop_scoped_memory_migration_is_deferred_and_backs_up_exact_v1() {
        let fixture = Fixture::new();
        let mut v1 = sample("global");
        v1["version"] = Value::from(1);
        v1["namespace"] = Value::String(String::new());
        let raw = serde_json::to_string_pretty(&v1).unwrap();
        fs::write(&fixture.0, &raw).unwrap();
        assert_eq!(
            read_scoped(&fixture.0, "global").unwrap(),
            Some(raw.clone())
        );
        assert_eq!(
            fs::read_dir(fixture.0.parent().unwrap()).unwrap().count(),
            1
        );
        let v2 = serde_json::to_string(&sample("global")).unwrap();
        write_scoped(&fixture.0, "global", &v2, Some(&raw)).unwrap();
        let backups: Vec<_> = fs::read_dir(fixture.0.parent().unwrap())
            .unwrap()
            .map(|entry| entry.unwrap().path())
            .filter(|path| {
                path.file_name()
                    .unwrap()
                    .to_string_lossy()
                    .contains(".previous-")
            })
            .collect();
        assert_eq!(backups.len(), 1);
        assert_eq!(fs::read_to_string(&backups[0]).unwrap(), raw);
        write_scoped(&fixture.0, "global", &v2, Some(&v2)).unwrap();
        assert_eq!(fs::read_to_string(&backups[0]).unwrap(), raw);
    }

    #[test]
    fn desktop_scoped_memory_legacy_clients_preserve_v2_metadata_and_cas() {
        let fixture = Fixture::new();
        let mut value = sample("global");
        value["records"][0]["futureRecordField"] = serde_json::json!({ "kept": true });
        let raw = value.to_string();
        write_scoped(&fixture.0, "global", &raw, None).unwrap();
        let expected = crate::read_memory_file(&fixture.0).unwrap();
        assert_eq!(expected.version, 1);
        assert!(expected.namespace.is_empty());
        let mut changed = expected.clone();
        changed.records[0].content = "用户偏好水彩插画".to_string();
        crate::guarded_write_memory_file(&fixture.0, &changed, &expected).unwrap();
        let saved: Value =
            serde_json::from_str(&read_scoped(&fixture.0, "global").unwrap().unwrap()).unwrap();
        assert_eq!(saved["version"], 2);
        assert_eq!(saved["namespace"], "global");
        assert_eq!(
            saved["metadata"]["description"],
            value["metadata"]["description"]
        );
        assert_eq!(
            saved["futureCompatibleField"],
            value["futureCompatibleField"]
        );
        assert_eq!(
            saved["records"][0]["futureRecordField"],
            value["records"][0]["futureRecordField"]
        );
        assert_eq!(saved["records"][0]["content"], changed.records[0].content);
        assert_eq!(saved["updatedAt"], saved["metadata"]["updatedAt"]);
        assert!(
            crate::guarded_write_memory_file(&fixture.0, &expected, &expected)
                .unwrap_err()
                .contains("MEMORY_CONFLICT")
        );
        let before_reset = fs::read_to_string(&fixture.0).unwrap();
        let backup = fixture.0.with_extension("previous-reset.json");
        let reset = crate::reset_memory_file(&fixture.0, &backup).unwrap();
        assert!(reset.records.is_empty());
        assert_eq!(fs::read_to_string(&backup).unwrap(), before_reset);
        let reset: Value =
            serde_json::from_str(&read_scoped(&fixture.0, "global").unwrap().unwrap()).unwrap();
        assert_eq!(reset["version"], 2);
        assert_eq!(reset["metadata"]["recordCount"], 0);
        assert_eq!(
            reset["metadata"]["description"],
            value["metadata"]["description"]
        );
        assert_eq!(
            reset["futureCompatibleField"],
            value["futureCompatibleField"]
        );
    }

    #[test]
    fn desktop_scoped_memory_legacy_seed_preserves_exact_v2_envelope() {
        let fixture = Fixture::new();
        let legacy = fixture.0.with_extension("legacy.json");
        let raw = serde_json::to_string_pretty(&sample("global")).unwrap();
        fs::write(&legacy, &raw).unwrap();
        crate::seed_shared_memory(&fixture.0, &legacy).unwrap();
        assert_eq!(
            read_scoped(&fixture.0, "global").unwrap(),
            Some(raw.clone())
        );
        assert_eq!(fs::read_to_string(&legacy).unwrap(), raw);
    }

    #[test]
    fn desktop_scoped_memory_rejects_corruption_scope_mismatch_and_future_versions() {
        let fixture = Fixture::new();
        let raw = serde_json::to_string(&sample("project:p1")).unwrap();
        write_scoped(&fixture.0, "project:p1", &raw, None).unwrap();
        for (field, value) in [
            ("version", Value::from(99)),
            ("namespace", Value::from("global")),
            ("metadata", Value::Null),
            ("records", serde_json::json!([{}])),
        ] {
            let mut invalid = sample("project:p1");
            invalid[field] = value;
            assert!(
                write_scoped(&fixture.0, "project:p1", &invalid.to_string(), Some(&raw)).is_err()
            );
            assert_eq!(
                read_scoped(&fixture.0, "project:p1").unwrap(),
                Some(raw.clone())
            );
        }
        fs::write(&fixture.0, "{broken").unwrap();
        assert!(read_scoped(&fixture.0, "global").is_err());
        assert!(write_scoped(
            &fixture.0,
            "global",
            &sample("global").to_string(),
            Some("{broken")
        )
        .is_err());
        assert_eq!(fs::read_to_string(&fixture.0).unwrap(), "{broken");
    }

    #[test]
    fn desktop_scoped_memory_concurrent_writers_preserve_the_winner() {
        let fixture = Fixture::new();
        let path = fixture.0.clone();
        let barrier = std::sync::Arc::new(std::sync::Barrier::new(2));
        let writers: Vec<_> = ["first", "second"]
            .into_iter()
            .map(|label| {
                let barrier = barrier.clone();
                let path = path.clone();
                std::thread::spawn(move || {
                    let mut value = sample("global");
                    value["metadata"]["description"] = Value::String(label.to_string());
                    let raw = value.to_string();
                    barrier.wait();
                    (write_scoped(&path, "global", &raw, None), raw)
                })
            })
            .collect();
        let results: Vec<_> = writers
            .into_iter()
            .map(|writer| writer.join().unwrap())
            .collect();
        assert_eq!(
            results.iter().filter(|(result, _)| result.is_ok()).count(),
            1
        );
        let winner = &results.iter().find(|(result, _)| result.is_ok()).unwrap().1;
        assert_eq!(fs::read_to_string(&fixture.0).unwrap(), *winner);
    }

    #[cfg(windows)]
    #[test]
    fn desktop_scoped_memory_commit_failure_preserves_v1_and_backup() {
        use std::os::windows::fs::OpenOptionsExt;
        let fixture = Fixture::new();
        let mut v1 = sample("global");
        v1["version"] = Value::from(1);
        let raw = v1.to_string();
        fs::write(&fixture.0, &raw).unwrap();
        let held = fs::OpenOptions::new()
            .read(true)
            .share_mode(3)
            .open(&fixture.0)
            .unwrap();
        assert!(write_scoped(
            &fixture.0,
            "global",
            &sample("global").to_string(),
            Some(&raw)
        )
        .is_err());
        assert_eq!(fs::read_to_string(&fixture.0).unwrap(), raw);
        let files: Vec<_> = fs::read_dir(fixture.0.parent().unwrap())
            .unwrap()
            .map(|entry| entry.unwrap().path())
            .collect();
        let backups: Vec<_> = files
            .iter()
            .filter(|path| {
                path.file_name()
                    .unwrap()
                    .to_string_lossy()
                    .contains(".previous-")
            })
            .collect();
        assert_eq!(backups.len(), 1);
        assert_eq!(fs::read_to_string(backups[0]).unwrap(), raw);
        assert_eq!(
            files.len(),
            3,
            "only original, lock, and durable backup remain"
        );
        drop(held);
    }
}
