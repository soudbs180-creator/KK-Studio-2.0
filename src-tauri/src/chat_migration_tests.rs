use super::*;
use crate::native_root_authority::NativeRootAuthority;
use serde_json::json;
use std::sync::Arc;
#[path = "../tests/legacy-2.1.36/creation_storage.rs"]
mod legacy_writer;

thread_local! { static FAILURE: std::cell::Cell<Option<&'static str>> = const { std::cell::Cell::new(None) }; }
pub(super) fn fail_at(stage: &str) -> Result<(), String> {
    if FAILURE.with(|failure| failure.get() == Some(stage)) {
        Err(format!("io: injected migration {stage}"))
    } else {
        Ok(())
    }
}
struct Fixture {
    paths: AppPaths,
}
impl Fixture {
    fn new() -> Self {
        let root =
            std::env::temp_dir().join(format!("kk-real-chat-migration-{}", random_id().unwrap()));
        let paths = AppPaths::initialize_at(&root).unwrap();
        fs::create_dir_all(paths.tasks.join("native-host")).unwrap();
        Self { paths }
    }
    fn seed(&self, main: &[u8], backup: Option<&[u8]>) {
        fs::write(&self.paths.creation, main).unwrap();
        if let Some(backup) = backup {
            fs::write(self.paths.creation.with_extension("json.bak"), backup).unwrap();
        }
        fs::write(
            self.paths.root.join("app/repository.json"),
            serde_json::to_vec(&RepositoryIdentity {
                version: 1,
                repository_id: "0123456789abcdef0123456789abcdef".into(),
                format_version: 1,
                minimum_writer_version: 1,
            })
            .unwrap(),
        )
        .unwrap();
    }
    fn owner(&self) -> Result<Arc<NativeRootAuthority>, String> {
        NativeRootAuthority::elect(&self.paths)?.ok_or_else(|| "busy".into())
    }
}
impl Drop for Fixture {
    fn drop(&mut self) {
        FAILURE.with(|failure| failure.set(None));
        let _ = fs::remove_dir_all(&self.paths.root);
    }
}
fn source(revision: u64) -> Value {
    json!({"version":2,"revision":revision,"activeProjectId":"p","homeDraft":{},"extra":{"retain":true},"projectGroups":[],"projects":[{"id":"p","items":[],"messages":[{"id":"m","role":"user","content":"saved","extra":42}],"composerDraft":{"prompt":"unsent","attachments":[],"conversationChannel":"codex","pendingAgent":true},"agentThreadId":"thread-old","tasks":[{"id":"t","status":"succeeded","prompt":"old"}],"extra":"untouched"}]})
}
fn journal() -> Vec<u8> {
    serde_json::to_vec(&json!({"taskId":"pending","idempotencyKey":"pending-idem","outputIndices":[0],"status":"submitted","assetIds":[],"outputs":[{"index":0,"status":"submitted"}],"updatedAt":1,"fingerprint":"a".repeat(64),"opaqueMetadata":{"keep":true}})).unwrap()
}

#[test]
fn desktop_chat_migration_matches_shared_raw_golden_vectors() {
    let vectors: Value = serde_json::from_str(include_str!(
        "../../tests/fixtures/chat-migration-vectors.json"
    ))
    .unwrap();
    for case in vectors["cases"].as_array().unwrap() {
        assert_eq!(
            value::migrate(&case["input"]).unwrap(),
            case["expected"],
            "{}",
            case["name"]
        );
    }
}

#[test]
fn desktop_chat_migration_preserves_originals_and_real_restarts() {
    let f = Fixture::new();
    let main = serde_json::to_vec_pretty(&source(11)).unwrap();
    let backup = serde_json::to_vec(&source(9)).unwrap();
    f.seed(&main, Some(&backup));
    let marker = fs::read(f.paths.root.join("app/repository.json")).unwrap();
    let expected = value::migrate(&source(11)).unwrap();
    let owner = f.owner().unwrap();
    assert_eq!(
        owner.identity.repository_id,
        "0123456789abcdef0123456789abcdef"
    );
    assert_eq!(
        (
            owner.identity.format_version,
            owner.identity.minimum_writer_version
        ),
        (2, 2)
    );
    let loaded = owner.snapshots.read().unwrap();
    assert!(loaded.read_only_reason.is_none());
    assert_eq!(loaded.snapshot.unwrap(), expected);
    assert_eq!(
        decode(&fs::read(f.paths.creation.with_extension("json.bak")).unwrap()).unwrap(),
        expected
    );
    let dir = archive_root(&f.paths, &owner.identity.repository_id);
    for raw in [&main, &backup, &marker] {
        assert_eq!(
            fs::read(dir.join(format!("{}.json", hash(raw)))).unwrap(),
            *raw
        );
    }
    let mut next = expected.clone();
    next["revision"] = json!(13);
    next["projects"][0]["chats"]["legacy-codex"]["draft"]["prompt"] = json!("edited after upgrade");
    owner.snapshots.write(next.clone(), Some(12)).unwrap();
    assert!(owner
        .snapshots
        .write(source(14), Some(13))
        .unwrap_err()
        .starts_with("unsupported:"));
    drop(owner);
    for _ in 0..2 {
        let owner = f.owner().unwrap();
        assert_eq!(owner.snapshots.read().unwrap().snapshot.unwrap(), next);
        assert_eq!(
            owner.identity.repository_id,
            "0123456789abcdef0123456789abcdef"
        );
    }
}

#[test]
fn desktop_chat_migration_every_publication_failure_is_resumable_before_task_recovery() {
    for stage in [
        "immutable-before-publish",
        "archive-main",
        "archive-backup",
        "archive-journals",
        "candidate",
        "plan",
        "backup",
        "main",
        "marker",
        "receipt",
    ] {
        let f = Fixture::new();
        let main = serde_json::to_vec(&source(2)).unwrap();
        let backup = serde_json::to_vec(&source(1)).unwrap();
        f.seed(&main, Some(&backup));
        let journal = journal();
        let path = f.paths.tasks.join("native-host/pending.json");
        fs::write(&path, &journal).unwrap();
        FAILURE.with(|failure| failure.set(Some(stage)));
        assert!(
            f.owner().err().unwrap().starts_with("io: injected"),
            "{stage}"
        );
        assert_eq!(
            fs::read(&path).unwrap(),
            journal,
            "journal changed before committed migration at {stage}"
        );
        assert!(!f.paths.root.join("app/authority-endpoint.json").exists());
        FAILURE.with(|failure| failure.set(None));
        let owner = f.owner().unwrap();
        assert!(owner.snapshots.read().unwrap().read_only_reason.is_none());
        assert_eq!(
            owner.snapshots.read().unwrap().snapshot.unwrap(),
            value::migrate(&source(2)).unwrap()
        );
        assert_eq!(
            owner.task_host.get("pending").unwrap().unwrap().status,
            "unknown"
        );
        assert_eq!(
            serde_json::from_slice::<Value>(&fs::read(&path).unwrap()).unwrap()["opaqueMetadata"],
            json!({"keep":true})
        );
        let dir = archive_root(&f.paths, &owner.identity.repository_id);
        for raw in [&main, &backup, &journal] {
            assert_eq!(
                fs::read(dir.join(format!("{}.json", hash(raw)))).unwrap(),
                *raw
            );
        }
        drop(owner);
        assert!(f
            .owner()
            .unwrap()
            .snapshots
            .read()
            .unwrap()
            .read_only_reason
            .is_none());
    }
}

#[test]
fn desktop_chat_migration_rejects_unknown_newer_and_future_combinations_without_mutation() {
    let base = source(2);
    let migrated = value::migrate(&base).unwrap();
    let mut future = source(5);
    future["version"] = json!(99);
    let mut conflicting = source(2);
    conflicting["extra"] = json!("different");
    for (main, backup) in [
        (base.clone(), source(3)),
        (base.clone(), migrated.clone()),
        (base.clone(), conflicting),
        (future.clone(), base.clone()),
        (base.clone(), future),
    ] {
        let f = Fixture::new();
        let main = serde_json::to_vec(&main).unwrap();
        let backup = serde_json::to_vec(&backup).unwrap();
        f.seed(&main, Some(&backup));
        let marker = fs::read(f.paths.root.join("app/repository.json")).unwrap();
        assert!(f.owner().is_err());
        assert_eq!(fs::read(&f.paths.creation).unwrap(), main);
        assert_eq!(
            fs::read(f.paths.creation.with_extension("json.bak")).unwrap(),
            backup
        );
        assert_eq!(
            fs::read(f.paths.root.join("app/repository.json")).unwrap(),
            marker
        );
        assert!(!f.paths.root.join(PLAN).exists());
    }
}

#[test]
fn desktop_chat_migration_rejects_changed_prepared_bytes_and_retains_plan() {
    let f = Fixture::new();
    f.seed(&serde_json::to_vec(&source(1)).unwrap(), None);
    FAILURE.with(|failure| failure.set(Some("plan")));
    assert!(f.owner().is_err());
    FAILURE.with(|failure| failure.set(None));
    let plan = fs::read(f.paths.root.join(PLAN)).unwrap();
    let unexpected = serde_json::to_vec(&source(9)).unwrap();
    fs::write(&f.paths.creation, &unexpected).unwrap();
    assert!(f.owner().is_err());
    assert_eq!(fs::read(&f.paths.creation).unwrap(), unexpected);
    assert_eq!(fs::read(f.paths.root.join(PLAN)).unwrap(), plan);
}

#[test]
fn desktop_chat_migration_retains_corrupt_unused_backup_and_rejects_companion_root() {
    let f = Fixture::new();
    f.seed(
        &serde_json::to_vec(&source(1)).unwrap(),
        Some(b"broken backup"),
    );
    let owner = f.owner().unwrap();
    assert_eq!(
        fs::read(
            archive_root(&f.paths, &owner.identity.repository_id)
                .join(format!("{}.json", hash(b"broken backup")))
        )
        .unwrap(),
        b"broken backup"
    );
    drop(owner);
    let foreign = Fixture::new();
    fs::write(foreign.paths.root.join("app/companion.json"), b"{}").unwrap();
    assert!(foreign.owner().is_err());
    assert!(!foreign.paths.root.join("app/repository.json").exists());
}

#[test]
fn desktop_chat_migration_frozen_legacy_writer_cannot_overwrite_v3_main_or_backup_barrier() {
    let old = source(1);
    let upgraded = value::migrate(&old).unwrap();
    for (main, backup) in [
        (
            serde_json::to_vec(&old).unwrap(),
            serde_json::to_vec(&upgraded).unwrap(),
        ),
        (
            serde_json::to_vec(&upgraded).unwrap(),
            serde_json::to_vec(&upgraded).unwrap(),
        ),
        (
            b"broken main".to_vec(),
            serde_json::to_vec(&upgraded).unwrap(),
        ),
    ] {
        let f = Fixture::new();
        f.seed(&main, Some(&backup));
        let writer = legacy_writer::SnapshotRepository::new(f.paths.creation.clone());
        let loaded = writer.read().unwrap();
        assert!(loaded.read_only_reason.is_some());
        let expected = loaded.snapshot.unwrap()["revision"].as_u64();
        assert!(writer
            .write(source(99), expected)
            .unwrap_err()
            .starts_with("readonly:"));
        assert_eq!(fs::read(&f.paths.creation).unwrap(), main);
        assert_eq!(
            fs::read(f.paths.creation.with_extension("json.bak")).unwrap(),
            backup
        );
    }
}

#[test]
fn desktop_chat_migration_invalid_journal_stops_before_marker_or_any_task_recovery() {
    let f = Fixture::new();
    let raw = serde_json::to_vec(&source(1)).unwrap();
    f.seed(&raw, None);
    let marker = fs::read(f.paths.root.join("app/repository.json")).unwrap();
    let pending = f.paths.tasks.join("native-host/pending.json");
    fs::write(&pending, journal()).unwrap();
    let invalid = f.paths.tasks.join("native-host/invalid.json");
    fs::write(&invalid, b"{\"status\":\"submitted\"}").unwrap();
    assert!(f.owner().is_err());
    assert_eq!(fs::read(&pending).unwrap(), journal());
    assert_eq!(fs::read(&f.paths.creation).unwrap(), raw);
    assert_eq!(
        fs::read(f.paths.root.join("app/repository.json")).unwrap(),
        marker
    );
    assert!(!f.paths.root.join(PLAN).exists());
}

#[test]
fn desktop_chat_migration_empty_snapshot_invalid_journal_keeps_original_marker_and_receipts() {
    let f = Fixture::new();
    let marker = serde_json::to_vec(&RepositoryIdentity {
        version: 1,
        repository_id: "0123456789abcdef0123456789abcdef".into(),
        format_version: 1,
        minimum_writer_version: 1,
    })
    .unwrap();
    fs::write(f.paths.root.join("app/repository.json"), &marker).unwrap();
    let pending = f.paths.tasks.join("native-host/pending.json");
    let invalid = f.paths.tasks.join("native-host/invalid.json");
    let invalid_raw = b"{\"status\":\"submitted\"}";
    fs::write(&pending, journal()).unwrap();
    fs::write(&invalid, invalid_raw).unwrap();
    assert!(f.owner().is_err());
    assert_eq!(
        fs::read(f.paths.root.join("app/repository.json")).unwrap(),
        marker
    );
    assert_eq!(fs::read(&pending).unwrap(), journal());
    assert_eq!(fs::read(&invalid).unwrap(), invalid_raw);
    assert!(!f.paths.creation.exists());
    assert!(!f.paths.creation.with_extension("json.bak").exists());
    assert!(!f.paths.root.join(PLAN).exists());
    assert!(!f.paths.root.join(COMPLETE).exists());
}

#[test]
fn desktop_chat_migration_raw_unsupported_version_types_never_fall_back_or_overwrite() {
    for unsupported in [
        br#"{"version":4.0}"#.as_slice(),
        br#"{"version":"99"}"#,
        br#"{"version":-1}"#,
        br#"{"version":null}"#,
    ] {
        for protected_backup in [false, true] {
            let f = Fixture::new();
            let supported = serde_json::to_vec(&source(1)).unwrap();
            let (main, backup) = if protected_backup {
                (supported.as_slice(), unsupported)
            } else {
                (unsupported, supported.as_slice())
            };
            f.seed(main, Some(backup));
            let marker = fs::read(f.paths.root.join("app/repository.json")).unwrap();
            let pending = f.paths.tasks.join("native-host/pending.json");
            fs::write(&pending, journal()).unwrap();
            let error = f
                .owner()
                .err()
                .expect("unsupported main/backup must reject");
            assert!(error.starts_with("unsupported:"), "{error}");
            assert_eq!(fs::read(&f.paths.creation).unwrap(), main);
            assert_eq!(
                fs::read(f.paths.creation.with_extension("json.bak")).unwrap(),
                backup
            );
            assert_eq!(
                fs::read(f.paths.root.join("app/repository.json")).unwrap(),
                marker
            );
            assert_eq!(fs::read(&pending).unwrap(), journal());
            assert!(!f.paths.root.join(PLAN).exists());
        }
    }
}

#[test]
fn desktop_chat_migration_empty_legacy_root_archives_marker_and_journal_before_upgrade() {
    let f = Fixture::new();
    let marker = serde_json::to_vec(&RepositoryIdentity {
        version: 1,
        repository_id: "0123456789abcdef0123456789abcdef".into(),
        format_version: 1,
        minimum_writer_version: 1,
    })
    .unwrap();
    fs::write(f.paths.root.join("app/repository.json"), &marker).unwrap();
    fs::write(f.paths.tasks.join("native-host/pending.json"), journal()).unwrap();
    let owner = f.owner().unwrap();
    let directory = archive_root(&f.paths, &owner.identity.repository_id);
    for raw in [marker, journal()] {
        assert_eq!(
            fs::read(directory.join(format!("{}.json", hash(&raw)))).unwrap(),
            raw
        );
    }
    assert_eq!(owner.identity.format_version, 2);
    assert_eq!(
        owner.task_host.get("pending").unwrap().unwrap().status,
        "unknown"
    );
    assert!(!f.paths.creation.exists());
    assert!(!f.paths.creation.with_extension("json.bak").exists());
}

#[test]
fn desktop_chat_migration_malformed_json_main_still_recovers_from_valid_backup() {
    let f = Fixture::new();
    let main = b"{broken JSON";
    let backup = serde_json::to_vec(&source(1)).unwrap();
    f.seed(main, Some(&backup));
    let owner = f.owner().unwrap();
    assert_eq!(
        owner.snapshots.read().unwrap().snapshot.unwrap(),
        value::migrate(&source(1)).unwrap()
    );
    let directory = archive_root(&f.paths, &owner.identity.repository_id);
    assert_eq!(
        fs::read(directory.join(format!("{}.json", hash(main)))).unwrap(),
        main
    );
    assert_eq!(
        fs::read(directory.join(format!("{}.json", hash(&backup)))).unwrap(),
        backup
    );
}
