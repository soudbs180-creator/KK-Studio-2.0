use super::*;
use base64::{engine::general_purpose::STANDARD, Engine};
use serde_json::json;

pub(crate) struct Fixture(pub PathBuf);
impl Fixture {
    pub(crate) fn new() -> Self {
        let root =
            std::env::temp_dir().join(format!("kk-native-authority-{}", random_id().unwrap()));
        fs::create_dir(&root).unwrap();
        Self(root)
    }
    pub(crate) fn paths(&self) -> AppPaths {
        AppPaths::initialize_at(&self.0).unwrap()
    }
    pub(crate) fn owner(&self) -> Arc<NativeRootAuthority> {
        NativeRootAuthority::elect(&self.paths()).unwrap().unwrap()
    }
}
impl Drop for Fixture {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

pub(super) fn snapshot(revision: u64) -> Value {
    json!({"version":2,"revision":revision,"projects":[],"activeProjectId":null,"homeDraft":{"prompt":"","model":"","kind":"image","attachments":[],"updatedAt":1}})
}

#[test]
fn one_physical_root_has_one_owner_and_two_roots_coexist() {
    let f = Fixture::new();
    let owner = f.owner();
    let alias = AppPaths::initialize_at(&f.0.join(".")).unwrap();
    assert!(NativeRootAuthority::elect(&alias).unwrap().is_none());
    let other = Fixture::new();
    let second = other.owner();
    assert_ne!(owner.identity.repository_id, second.identity.repository_id);
    assert_eq!(
        fs::read(f.0.join("app/repository.json")).unwrap(),
        serde_json::to_vec(&owner.identity).unwrap()
    );
}

#[test]
fn owned_transactions_work_and_legacy_repositories_remain_excluded() {
    let f = Fixture::new();
    let paths = f.paths();
    let owner = f.owner();
    owner.snapshots.write(snapshot(1), None).unwrap();
    assert_eq!(
        owner.snapshots.read().unwrap().snapshot.unwrap()["revision"],
        1
    );
    assert!(SnapshotRepository::new(paths.creation.clone())
        .read()
        .is_err());
    assert!(AssetRepository::new(paths.assets.clone()).list().is_err());
    let bytes = b"isolated authority original";
    let sha = crate::asset_storage::validation::hash(bytes);
    let id = format!("asset-{}", &sha[..24]);
    let metadata = json!({"assetId":id,"sha256":sha,"mime":"image/png","tags":[],"isAiGenerated":false,"source":"upload","provenance":{"generatedAt":"2026-10-15T00:00:00.000Z"}});
    owner
        .assets
        .store(STANDARD.encode(bytes), metadata)
        .unwrap();
    assert_eq!(
        owner.assets.read(&id).unwrap().unwrap().data_base64,
        STANDARD.encode(bytes)
    );
    assert!(owner
        .snapshots
        .write(snapshot(2), None)
        .unwrap_err()
        .starts_with("conflict:"));
    drop(owner);
    assert!(SnapshotRepository::new(paths.creation).read().is_ok());
    assert!(AssetRepository::new(paths.assets).list().is_ok());
    assert!(f.owner().snapshots.read().unwrap().snapshot.is_some());
}

#[test]
fn identity_survives_restart_and_epoch_changes() {
    let f = Fixture::new();
    let first = f.owner();
    let id = first.identity.repository_id.clone();
    let epoch = first.epoch.clone();
    drop(first);
    let second = f.owner();
    assert_eq!(second.identity.repository_id, id);
    assert_ne!(second.epoch, epoch);
}

#[test]
fn partial_legacy_lock_acquisition_releases_root_and_snapshot_locks() {
    let f = Fixture::new();
    let paths = f.paths();
    let held = crate::asset_storage::io::lock(&paths.assets).unwrap();
    assert!(NativeRootAuthority::elect(&paths).is_err());
    assert!(!f.0.join("app/repository.json").exists());
    assert!(SnapshotRepository::new(paths.creation.clone())
        .read()
        .is_ok());
    drop(held);
    assert!(NativeRootAuthority::elect(&paths).unwrap().is_some());
}

#[test]
fn lifetime_owner_prevents_legacy_taskhost_recovery_and_preserves_journal() {
    let f = Fixture::new();
    let paths = f.paths();
    let jobs = f.0.join("tasks/native-host");
    fs::create_dir(&jobs).unwrap();
    let owner = f.owner();
    let journal = jobs.join("pending.json");
    let raw = serde_json::to_vec(&json!({"taskId":"pending","idempotencyKey":"pending-idem","outputIndices":[0],"status":"submitted","assetIds":[],"outputs":[{"index":0,"status":"submitted"}],"updatedAt":1,"fingerprint":"a".repeat(64)})).unwrap();
    fs::write(&journal, &raw).unwrap();
    assert!(crate::task_host::TaskHost::new(jobs.clone(), Arc::clone(&owner.assets)).is_err());
    assert_eq!(fs::read(&journal).unwrap(), raw);
    let owned = Arc::clone(&owner.task_host);
    assert_eq!(owned.get("pending").unwrap().unwrap().status, "submitted");
    assert_eq!(owned.read("pending").unwrap().len(), 1);
    assert_eq!(owned.list().unwrap().len(), 1);
    drop(owned);
    drop(owner);
    let legacy =
        crate::task_host::TaskHost::new(jobs, Arc::new(AssetRepository::new(paths.assets)))
            .unwrap();
    assert_eq!(legacy.get("pending").unwrap().unwrap().status, "unknown");
    drop(legacy);
    fs::write(&journal, &raw).unwrap();
    let reopened = f.owner();
    assert_eq!(
        reopened.task_host.get("pending").unwrap().unwrap().status,
        "unknown"
    );
}

#[test]
fn final_journal_lock_failure_releases_every_preceding_guard() {
    let f = Fixture::new();
    let paths = f.paths();
    let jobs = f.0.join("tasks/native-host");
    fs::create_dir(&jobs).unwrap();
    let journal_lock = crate::asset_storage::io::lock(&jobs).unwrap();
    assert!(NativeRootAuthority::elect(&paths).is_err());
    assert!(SnapshotRepository::new(paths.creation).read().is_ok());
    assert!(AssetRepository::new(paths.assets).list().is_ok());
    assert!(!f.0.join("app/repository.json").exists());
    assert!(!f.0.join("app/authority-endpoint.json").exists());
    drop(journal_lock);
    assert!(f.owner().snapshots.read().is_ok());
}

#[test]
fn future_snapshot_and_foreign_asset_envelopes_are_never_adopted() {
    for foreign in [false, true] {
        let f = Fixture::new();
        let paths = f.paths();
        let path = if foreign {
            fs::create_dir(paths.assets.join("records")).unwrap();
            paths
                .assets
                .join("records/asset-0123456789abcdef01234567.json")
        } else {
            paths.creation.clone()
        };
        let raw = if foreign {
            br#"{"assetId":"asset-0123456789abcdef01234567","size":1}"#.as_slice()
        } else {
            br#"{"version":99}"#.as_slice()
        };
        fs::write(&path, raw).unwrap();
        assert!(NativeRootAuthority::elect(&paths).is_err());
        assert_eq!(fs::read(&path).unwrap(), raw);
        assert!(!f.0.join("app/repository.json").exists());
        assert!(!f.0.join("app/authority-endpoint.json").exists());
    }
}

#[test]
fn corrupt_and_io_markers_never_become_new_repositories() {
    for directory in [false, true] {
        let f = Fixture::new();
        let paths = f.paths();
        let marker = f.0.join("app/repository.json");
        if directory {
            fs::create_dir(&marker).unwrap();
        } else {
            fs::write(&marker, b"broken").unwrap();
        }
        assert!(NativeRootAuthority::elect(&paths).is_err());
        if directory {
            assert!(marker.is_dir());
        } else {
            assert_eq!(fs::read(marker).unwrap(), b"broken");
        }
    }
}

#[test]
fn missing_original_keeps_native_identity_and_only_its_asset_read_fails() {
    let f = Fixture::new();
    let paths = f.paths();
    fs::create_dir(paths.assets.join("records")).unwrap();
    let sha = "a".repeat(64);
    let path = paths
        .assets
        .join("records/asset-aaaaaaaaaaaaaaaaaaaaaaaa.json");
    let raw = serde_json::to_vec(&json!({"version":1,"metadata":{"assetId":"asset-aaaaaaaaaaaaaaaaaaaaaaaa","sha256":sha,"mime":"image/png","tags":[],"provenance":{"generatedAt":"2026-10-15T00:00:00.000Z"}}})).unwrap();
    fs::write(&path, &raw).unwrap();
    let owner = NativeRootAuthority::elect(&paths)
        .unwrap()
        .expect("missing original cannot block the root");
    let identity = owner.identity.clone();
    assert!(owner
        .assets
        .read("asset-aaaaaaaaaaaaaaaaaaaaaaaa")
        .unwrap_err()
        .starts_with("missing:"));
    assert!(owner.snapshots.read().is_ok());
    drop(owner);
    let reopened = f.owner();
    assert_eq!(reopened.identity, identity);
    assert_eq!(fs::read(path).unwrap(), raw);
    assert!(!paths.assets.join("blobs").join(sha).exists());
}

#[test]
fn future_backup_and_strict_bounded_identity_fail_before_publication() {
    let f = Fixture::new();
    let paths = f.paths();
    fs::write(&paths.creation, serde_json::to_vec(&snapshot(1)).unwrap()).unwrap();
    fs::write(
        paths.creation.with_extension("json.bak"),
        b"{\"version\":99}",
    )
    .unwrap();
    assert!(NativeRootAuthority::elect(&paths)
        .err()
        .unwrap()
        .starts_with("unsupported:"));
    assert!(!f.0.join("app/repository.json").exists());
    assert_eq!(
        fs::read(paths.creation.with_extension("json.bak")).unwrap(),
        b"{\"version\":99}"
    );
    for raw in [b"x".repeat(4097), br#"{"version":1,"repositoryId":"0123456789abcdef0123456789abcdef","formatVersion":1,"minimumWriterVersion":1,"extra":"ignored?"}"#.to_vec()] {
        fs::write(f.0.join("app/repository.json"), &raw).unwrap();
        assert!(NativeRootAuthority::elect(&paths).is_err());
        assert_eq!(fs::read(f.0.join("app/repository.json")).unwrap(), raw);
        assert!(!f.0.join("app/authority-endpoint.json").exists());
    }
}

fn unused_corrupt_backup_retains_identity_until_existing_writer_archives(raw: &[u8]) {
    let f = Fixture::new();
    let seeded = f.owner();
    let identity = seeded.identity.clone();
    drop(seeded);
    let paths = f.paths();
    let main = serde_json::to_vec(&snapshot(1)).unwrap();
    let backup = paths.creation.with_extension("json.bak");
    fs::write(&paths.creation, &main).unwrap();
    fs::write(&backup, raw).unwrap();
    for _ in 0..2 {
        let owner = NativeRootAuthority::elect(&paths)
            .unwrap()
            .expect("valid main remains usable");
        assert_eq!(owner.identity, identity);
        assert_eq!(owner.snapshots.read().unwrap().status, "loaded");
        assert_eq!(fs::read(&paths.creation).unwrap(), main);
        assert_eq!(fs::read(&backup).unwrap(), raw);
        drop(owner);
    }
    let owner = f.owner();
    owner.snapshots.write(snapshot(2), Some(1)).unwrap();
    assert_eq!(owner.identity, identity);
    assert_eq!(fs::read(&backup).unwrap(), main);
    let archived: Vec<_> = fs::read_dir(paths.creation.parent().unwrap())
        .unwrap()
        .map(|entry| entry.unwrap().path())
        .filter(|path| {
            path.file_name()
                .unwrap()
                .to_string_lossy()
                .contains(".corrupt-backup.")
        })
        .collect();
    assert_eq!(archived.len(), 1);
    assert_eq!(fs::read(&archived[0]).unwrap(), raw);
    drop(owner);
    let restarted = f.owner();
    assert_eq!(restarted.identity, identity);
    assert_eq!(
        restarted.snapshots.read().unwrap().snapshot.unwrap()["revision"],
        2
    );
}

#[test]
fn valid_main_with_invalid_json_backup_starts_restarts_and_archives_original_bytes() {
    unused_corrupt_backup_retains_identity_until_existing_writer_archives(b"{not valid json");
}

#[test]
fn valid_main_with_invalid_structure_backup_starts_restarts_and_archives_original_bytes() {
    unused_corrupt_backup_retains_identity_until_existing_writer_archives(
        br#"{"version":2,"revision":1,"projects":"broken"}"#,
    );
}

#[test]
fn corrupt_main_cannot_ignore_invalid_backup() {
    for raw in [
        b"{not json".as_slice(),
        br#"{"version":2,"projects":"broken"}"#.as_slice(),
    ] {
        let f = Fixture::new();
        let paths = f.paths();
        let main = b"{broken main";
        fs::write(&paths.creation, main).unwrap();
        let backup = paths.creation.with_extension("json.bak");
        fs::write(&backup, raw).unwrap();
        assert!(NativeRootAuthority::elect(&paths)
            .err()
            .unwrap()
            .starts_with("corrupt:"));
        assert_eq!(fs::read(&paths.creation).unwrap(), main);
        assert_eq!(fs::read(backup).unwrap(), raw);
        assert!(!f.0.join("app/repository.json").exists());
    }
}

#[cfg(windows)]
#[test]
fn valid_main_cannot_hide_backup_sharing_io_failure() {
    use std::os::windows::fs::OpenOptionsExt;
    let f = Fixture::new();
    let paths = f.paths();
    let raw = serde_json::to_vec(&snapshot(1)).unwrap();
    fs::write(&paths.creation, &raw).unwrap();
    let backup = paths.creation.with_extension("json.bak");
    fs::write(&backup, &raw).unwrap();
    let held = std::fs::OpenOptions::new()
        .read(true)
        .share_mode(0)
        .open(&backup)
        .unwrap();
    assert!(NativeRootAuthority::elect(&paths)
        .err()
        .unwrap()
        .starts_with("io:"));
    assert!(!f.0.join("app/repository.json").exists());
    drop(held);
    assert_eq!(fs::read(&paths.creation).unwrap(), raw);
    assert_eq!(fs::read(backup).unwrap(), raw);
    assert!(f.owner().snapshots.read().is_ok());
}

#[cfg(windows)]
#[test]
fn marker_sharing_io_failure_never_becomes_missing() {
    use std::os::windows::fs::OpenOptionsExt;
    let f = Fixture::new();
    let owner = f.owner();
    drop(owner);
    let paths = f.paths();
    let marker = f.0.join("app/repository.json");
    let before = fs::read(&marker).unwrap();
    let held = std::fs::OpenOptions::new()
        .read(true)
        .share_mode(0)
        .open(&marker)
        .unwrap();
    assert!(NativeRootAuthority::elect(&paths)
        .err()
        .unwrap()
        .starts_with("io:"));
    drop(held);
    assert_eq!(fs::read(marker).unwrap(), before);
    assert!(NativeRootAuthority::elect(&paths).unwrap().is_some());
}

#[test]
fn retained_repository_arc_keeps_all_lifetime_locks() {
    let f = Fixture::new();
    let owner = f.owner();
    let assets = Arc::clone(&owner.assets);
    drop(owner);
    assert!(NativeRootAuthority::elect(&f.paths()).unwrap().is_none());
    assert!(assets.list().unwrap().is_empty());
    drop(assets);
    assert!(NativeRootAuthority::elect(&f.paths()).unwrap().is_some());
}

#[test]
fn authority_subprocess_probe() {
    let Some(root) = std::env::var_os("KK_NATIVE_AUTH_TEST_ROOT") else {
        return;
    };
    let paths = AppPaths::initialize_at(Path::new(&root)).unwrap();
    if std::env::var("KK_NATIVE_AUTH_TEST_MODE").unwrap() == "hold" {
        let _owner = NativeRootAuthority::elect(&paths).unwrap().unwrap();
        fs::write(paths.root.join("probe-ready"), b"ready").unwrap();
        loop {
            std::thread::sleep(std::time::Duration::from_millis(100));
        }
    } else {
        assert!(NativeRootAuthority::elect(&paths).unwrap().is_none());
        assert!(SnapshotRepository::new(paths.creation).read().is_err());
        assert!(AssetRepository::new(paths.assets).list().is_err());
        assert!(crate::task_host::TaskHost::new(
            paths.root.join("tasks/native-host"),
            Arc::new(AssetRepository::new(paths.root.join("assets")))
        )
        .is_err());
    }
}

fn subprocess(root: &Path, mode: &str) -> std::process::Command {
    let mut command = std::process::Command::new(std::env::current_exe().unwrap());
    command
        .args([
            "--exact",
            "native_root_authority::tests::authority_subprocess_probe",
            "--nocapture",
        ])
        .env("KK_NATIVE_AUTH_TEST_ROOT", root)
        .env("KK_NATIVE_AUTH_TEST_MODE", mode);
    command
}

#[test]
fn actual_process_contention_and_crash_release_all_locks() {
    let f = Fixture::new();
    let owner = f.owner();
    let output = subprocess(&f.0, "compete").output().unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    drop(owner);
    let mut child = subprocess(&f.0, "hold")
        .stdout(std::process::Stdio::null())
        .spawn()
        .unwrap();
    let deadline = std::time::Instant::now() + std::time::Duration::from_secs(3);
    while !f.0.join("probe-ready").exists() && std::time::Instant::now() < deadline {
        std::thread::sleep(std::time::Duration::from_millis(10));
    }
    let ready = f.0.join("probe-ready").exists();
    child.kill().unwrap();
    child.wait().unwrap();
    assert!(ready, "owned subprocess did not acquire its root");
    let reopened = f.owner();
    assert!(reopened.snapshots.read().is_ok());
    assert!(reopened.assets.list().is_ok());
}

#[cfg(windows)]
fn junction(target: &Path, link: &Path) {
    let result = std::process::Command::new("cmd")
        .args(["/C", "mklink", "/J"])
        .arg(link)
        .arg(target)
        .output()
        .unwrap();
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
}

#[cfg(windows)]
#[test]
fn canonical_root_junction_collides_and_controlled_child_junction_is_rejected() {
    let f = Fixture::new();
    let owner = f.owner();
    let alias = f.0.with_extension("junction");
    junction(&f.0, &alias);
    let result =
        AppPaths::initialize_at(&alias).and_then(|paths| NativeRootAuthority::elect(&paths));
    fs::remove_dir(&alias).unwrap();
    assert!(result.unwrap().is_none());
    drop(owner);
    let linked = Fixture::new();
    let external = Fixture::new();
    junction(&external.0, &linked.0.join("assets"));
    let result = AppPaths::initialize_at(&linked.0);
    fs::remove_dir(linked.0.join("assets")).unwrap();
    assert!(result.is_err());
    assert!(!linked.0.join("app").exists());
    assert!(fs::read_dir(&external.0).unwrap().next().is_none());
}

#[test]
fn taskhost_and_package_readers_use_the_authority_repositories() {
    let f = Fixture::new();
    let owner = f.owner();
    owner.snapshots.write(snapshot(1), None).unwrap();
    let host = Arc::clone(&owner.task_host);
    assert!(host.list().unwrap().is_empty());
    let destination = f.0.join("fixture.kkproject");
    crate::project_package::export_package_at_revision(
        &owner.snapshots,
        &owner.assets,
        &destination,
        Some(1),
    )
    .unwrap();
    assert!(destination.is_file());
}
