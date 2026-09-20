use super::*;
use serde_json::{json, Value};
use std::sync::atomic::{AtomicU64, Ordering};

static NEXT: AtomicU64 = AtomicU64::new(0);
thread_local! { static FAILURE: std::cell::RefCell<Option<&'static str>> = const { std::cell::RefCell::new(None) }; }
pub(super) fn fail_at(stage: &str) -> Result<(), String> {
    if FAILURE.with(|failure| *failure.borrow() == Some(stage)) {
        Err(format!("io: injected {stage}"))
    } else {
        Ok(())
    }
}
struct Fixture {
    root: PathBuf,
    repo: SnapshotRepository,
}
impl Fixture {
    fn new() -> Self {
        let root = std::env::temp_dir().join(format!(
            "kk-native-snapshot-{}-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos(),
            NEXT.fetch_add(1, Ordering::Relaxed)
        ));
        fs::create_dir_all(&root).unwrap();
        let repo = SnapshotRepository::new(root.join("creation-v2.json"));
        Self { root, repo }
    }
    fn main(&self, value: &Value) -> Vec<u8> {
        let raw = serde_json::to_vec_pretty(value).unwrap();
        fs::write(&self.repo.path, &raw).unwrap();
        raw
    }
    fn backup(&self, value: &Value) -> Vec<u8> {
        let raw = serde_json::to_vec_pretty(value).unwrap();
        fs::write(self.repo.path.with_extension("json.bak"), &raw).unwrap();
        raw
    }
}
impl Drop for Fixture {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.root);
    }
}
fn snapshot(revision: u64) -> Value {
    json!({"version":2,"revision":revision,"activeProjectId":"p1","homeDraft":{"prompt":"draft","model":"","kind":"image","attachments":[],"updatedAt":1},"projects":[{"id":"p1","name":"Synthetic","items":[{"id":"n1","title":"Node","description":"","kind":"image"}],"tasks":[],"messages":[],"attachments":[]}]})
}

#[test]
fn source_item_id_is_optional_bounded_and_history_safe() {
    let mut value = snapshot(1);
    value["projects"][0]["tasks"] = json!([{
        "id": "task-1",
        "sourceItemId": "deleted-node",
        "prompt": "restore",
        "model": "synthetic",
        "status": "succeeded"
    }]);
    assert!(validation::validate(&value).is_ok());

    value["projects"][0]["tasks"][0]["sourceItemId"] = json!("x".repeat(161));
    assert!(validation::validate(&value).is_err());

    value["projects"][0]["tasks"][0]["sourceItemId"] = json!(42);
    assert!(validation::validate(&value).is_err());
}

#[test]
fn task_submission_states_and_unknown_outputs_survive_repository_reopen() {
    let f = Fixture::new();
    let mut value = snapshot(1);
    value["projects"][0]["tasks"] = json!([
        {"id":"intent","prompt":"restore","model":"synthetic","status":"running","submissionState":"intent","submittedAt":0},
        {"id":"submitted","prompt":"restore","model":"synthetic","status":"running","submissionState":"submitted","submittedAt":42},
        {"id":"unknown","prompt":"restore","model":"synthetic","status":"unknown","submissionState":"unknown","submittedAt":9007199254740991_u64,"outputs":[{"index":0,"status":"unknown"}]},
        {"id":"terminal","prompt":"restore","model":"synthetic","status":"failed","submissionState":"terminal"}
    ]);
    f.repo.write(value.clone(), None).unwrap();
    let reopened = SnapshotRepository::new(f.repo.path.clone());
    assert_eq!(reopened.read().unwrap().snapshot.unwrap(), value);
}

#[test]
fn malformed_submission_fields_fail_before_overwriting_durable_intent() {
    let f = Fixture::new();
    let mut original = snapshot(1);
    original["projects"][0]["tasks"] = json!([{
        "id":"intent","prompt":"restore","model":"synthetic","status":"queued",
        "submissionState":"intent","outputs":[{"index":0,"status":"waiting"}]
    }]);
    let raw = f.main(&original);
    for (field, invalid) in [
        ("submissionState", json!("accepted")),
        ("submissionState", Value::Null),
        ("submissionState", json!(0)),
        ("submittedAt", json!(-1)),
        ("submittedAt", json!(0.5)),
        ("submittedAt", json!(9007199254740992_u64)),
        ("submittedAt", json!("42")),
        ("submittedAt", Value::Null),
        ("status", json!("accepted")),
        ("outputs", json!([{"index":0,"status":"accepted"}])),
        ("outputs", json!(["unknown"])),
    ] {
        let mut malformed = original.clone();
        malformed["revision"] = json!(2);
        malformed["projects"][0]["tasks"][0][field] = invalid;
        assert!(
            f.repo
                .write(malformed, Some(1))
                .unwrap_err()
                .starts_with("corrupt:"),
            "accepted invalid {field}"
        );
        assert_eq!(fs::read(&f.repo.path).unwrap(), raw);
    }
}

#[test]
fn corrupt_main_never_replaces_good_backup_on_recovered_write() {
    let f = Fixture::new();
    fs::write(&f.repo.path, b"broken-original").unwrap();
    let backup = f.backup(&snapshot(4));
    assert_eq!(f.repo.read().unwrap().status, "recovered");
    f.repo.write(snapshot(5), Some(4)).unwrap();
    assert_eq!(
        fs::read(f.repo.path.with_extension("json.bak")).unwrap(),
        backup
    );
    assert!(fs::read_dir(&f.root)
        .unwrap()
        .flatten()
        .any(|entry| fs::read(entry.path()).ok().as_deref() == Some(b"broken-original")));
}
#[test]
fn future_main_is_not_hidden_by_older_backup() {
    let f = Fixture::new();
    let mut future = snapshot(9);
    future["version"] = json!(3);
    let raw = f.main(&future);
    f.backup(&snapshot(4));
    assert!(f.repo.read().unwrap_err().starts_with("unsupported:"));
    assert!(f
        .repo
        .write(snapshot(5), Some(4))
        .unwrap_err()
        .starts_with("unsupported:"));
    assert_eq!(fs::read(&f.repo.path).unwrap(), raw);
}
#[test]
fn both_corrupt_is_error_and_write_preserves_both() {
    let f = Fixture::new();
    fs::write(&f.repo.path, b"corrupt-main").unwrap();
    fs::write(f.repo.path.with_extension("json.bak"), b"corrupt-backup").unwrap();
    assert!(f.repo.read().unwrap_err().starts_with("corrupt:"));
    assert!(f
        .repo
        .write(snapshot(1), None)
        .unwrap_err()
        .starts_with("corrupt:"));
    assert_eq!(fs::read(&f.repo.path).unwrap(), b"corrupt-main");
    assert_eq!(
        fs::read(f.repo.path.with_extension("json.bak")).unwrap(),
        b"corrupt-backup"
    );
}
#[test]
fn stale_expected_revision_cannot_overwrite_newer_bytes() {
    let f = Fixture::new();
    let raw = f.main(&snapshot(5));
    assert!(f
        .repo
        .write(snapshot(6), Some(4))
        .unwrap_err()
        .starts_with("conflict:"));
    assert_eq!(fs::read(&f.repo.path).unwrap(), raw);
}
#[test]
fn equal_revision_different_payload_is_conflict_but_identical_is_idempotent() {
    let f = Fixture::new();
    let raw = f.main(&snapshot(5));
    let mut changed = snapshot(5);
    changed["homeDraft"]["prompt"] = json!("different");
    assert!(f
        .repo
        .write(changed, Some(5))
        .unwrap_err()
        .starts_with("conflict:"));
    f.repo.write(snapshot(5), Some(5)).unwrap();
    assert_eq!(fs::read(&f.repo.path).unwrap(), raw);
}
#[test]
fn invalid_members_and_duplicate_ids_are_rejected_before_overwrite() {
    let f = Fixture::new();
    let raw = f.main(&snapshot(1));
    for malformed in [
        json!({"version":2}),
        {
            let mut v = snapshot(2);
            v["projects"][0]["items"] = json!([{"id":"n1","title":"a","description":""},{"id":"n1","title":"b","description":""}]);
            v
        },
        {
            let mut v = snapshot(2);
            v["activeProjectId"] = json!("unknown");
            v
        },
    ] {
        assert!(f
            .repo
            .write(malformed, Some(1))
            .unwrap_err()
            .starts_with("corrupt:"));
        assert_eq!(fs::read(&f.repo.path).unwrap(), raw);
    }
}
#[test]
fn unknown_canvas_version_does_not_fall_back_to_backup() {
    let f = Fixture::new();
    let mut v = snapshot(3);
    v["projects"][0]["canvas"] =
        json!({"version":2,"positions":{},"edges":[],"viewport":{"x":0,"y":0,"scale":1}});
    let raw = f.main(&v);
    f.backup(&snapshot(2));
    assert!(f.repo.read().unwrap_err().starts_with("unsupported:"));
    assert_eq!(fs::read(&f.repo.path).unwrap(), raw);
}
#[test]
fn legacy_raw_pre_canvas_copy_survives_later_rotations() {
    let f = Fixture::new();
    let raw = f.main(&snapshot(1));
    let mut upgraded = snapshot(2);
    upgraded["projects"][0]["canvas"] = json!({"version":1,"positions":{"n1":{"x":2,"y":3}},"edges":[],"viewport":{"x":0,"y":0,"scale":1}});
    f.repo.write(upgraded.clone(), Some(1)).unwrap();
    upgraded["revision"] = json!(3);
    f.repo.write(upgraded, Some(2)).unwrap();
    assert!(fs::read_dir(&f.root)
        .unwrap()
        .flatten()
        .any(|entry| fs::read(entry.path()).ok().as_deref() == Some(raw.as_slice())));
}

#[test]
fn malformed_canvas_main_recovers_from_valid_backup_without_erasing_original() {
    let graph = json!({"version":1,"positions":{"n1":{"x":2,"y":3}},"edges":[],"viewport":{"x":0,"y":0,"scale":1}});
    let mut missing = graph.clone();
    missing["positions"] = json!({});
    let mut zoom = graph.clone();
    zoom["viewport"]["scale"] = json!(5);
    let mut looped = graph.clone();
    looped["edges"] = json!([{"id":"e1","source":"n1","target":"n1"}]);
    for invalid in [missing, zoom, looped] {
        let f = Fixture::new();
        let mut main = snapshot(3);
        main["projects"][0]["canvas"] = invalid;
        let raw = f.main(&main);
        let backup = f.backup(&snapshot(2));
        let read = f.repo.read().unwrap();
        assert_eq!(read.status, "recovered");
        assert_eq!(read.snapshot.unwrap()["revision"], 2);
        assert_eq!(fs::read(&f.repo.path).unwrap(), raw);
        assert_eq!(
            fs::read(f.repo.path.with_extension("json.bak")).unwrap(),
            backup
        );
    }
}

#[test]
fn duplicate_canvas_endpoints_are_corrupt() {
    let f = Fixture::new();
    let mut main = snapshot(3);
    main["projects"][0]["items"]
        .as_array_mut()
        .unwrap()
        .push(json!({"id":"n2","title":"second","description":"","kind":"image"}));
    main["projects"][0]["canvas"] = json!({"version":1,"positions":{"n1":{"x":0,"y":0},"n2":{"x":10,"y":10}},"edges":[{"id":"e1","source":"n1","target":"n2"},{"id":"e2","source":"n1","target":"n2"}],"viewport":{"x":0,"y":0,"scale":1}});
    let raw = f.main(&main);
    assert!(f.repo.read().unwrap_err().starts_with("corrupt:"));
    assert_eq!(fs::read(&f.repo.path).unwrap(), raw);
}

#[test]
fn sync_and_commit_failure_leave_original_main_and_valid_backup() {
    for stage in ["before-sync", "before-commit"] {
        let f = Fixture::new();
        let raw = f.main(&snapshot(3));
        f.backup(&snapshot(2));
        FAILURE.with(|failure| *failure.borrow_mut() = Some(stage));
        let result = f.repo.write(snapshot(4), Some(3));
        FAILURE.with(|failure| *failure.borrow_mut() = None);
        assert!(result.is_err(), "expected injected {stage} error");
        assert_eq!(fs::read(&f.repo.path).unwrap(), raw);
        assert!(decode(fs::read(f.repo.path.with_extension("json.bak")).unwrap()).is_ok());
        assert_eq!(f.repo.read().unwrap().snapshot.unwrap()["revision"], 3);
    }
}

#[test]
fn file_access_error_is_not_a_missing_snapshot() {
    let f = Fixture::new();
    fs::create_dir(&f.repo.path).unwrap();
    assert!(f.repo.read().unwrap_err().starts_with("io:"));
    assert!(f
        .repo
        .write(snapshot(1), None)
        .unwrap_err()
        .starts_with("io:"));
    assert!(f.repo.path.is_dir());
}

#[test]
fn separate_repositories_cannot_overwrite_a_competing_commit() {
    let f = Fixture::new();
    f.main(&snapshot(3));
    let second = SnapshotRepository::new(f.repo.path.clone());
    assert_eq!(second.read().unwrap().snapshot.unwrap()["revision"], 3);
    f.repo.write(snapshot(4), Some(3)).unwrap();
    assert!(second
        .write(snapshot(5), Some(3))
        .unwrap_err()
        .starts_with("conflict:"));
    assert_eq!(f.repo.read().unwrap().snapshot.unwrap()["revision"], 4);
}
