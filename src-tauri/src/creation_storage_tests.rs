use super::*;
use serde_json::{json, Value};
use std::sync::atomic::{AtomicU64, Ordering};

static NEXT: AtomicU64 = AtomicU64::new(0);

#[test]
fn protocol_routes_survive_native_storage_and_invalid_updates_preserve_original() {
    let f = Fixture::new();
    let mut value = snapshot(1);
    value["projects"][0]["providerBaseUrl"] = json!("http://127.0.0.1:11434/v1");
    value["projects"][0]["providerProtocol"] = json!("ollama");
    value["projects"][0]["providerAuthMode"] = json!("none");
    value["projects"][0]["tasks"] = json!([{"id":"t1","prompt":"fixture","model":"fixture-text","kind":"text","status":"succeeded","submissionState":"terminal","idempotencyKey":"original-idem","providerBaseUrl":"https://provider.example/v1","providerProtocol":"anthropic","providerAuthMode":"api-key","providerCredentialRef":"fixture_account","outputs":[{"index":0,"status":"succeeded","text":"正文🌍","model":"fixture-text","createdAt":1}]}]);
    f.repo.write(value.clone(), None).unwrap();
    let original = fs::read(&f.repo.path).unwrap();
    let reopened = SnapshotRepository::new(f.repo.path.clone());
    assert_eq!(reopened.read().unwrap().snapshot.unwrap(), value);
    for scope in ["project", "task"] {
        for (field, invalid) in [
            ("providerProtocol", json!("unknown")),
            ("providerAuthMode", json!("unknown")),
            ("providerProtocol", Value::Null),
            ("providerAuthMode", json!(42)),
        ] {
            let mut bad = value.clone();
            bad["revision"] = json!(2);
            let target = if scope == "project" {
                &mut bad["projects"][0]
            } else {
                &mut bad["projects"][0]["tasks"][0]
            };
            target[field] = invalid;
            assert!(f.repo.write(bad, Some(1)).is_err());
            assert_eq!(fs::read(&f.repo.path).unwrap(), original);
        }
    }
    for base in [
        "https://provider.example/v1",
        "http://127.0.0.2:11434/v1",
        "http://192.168.1.2/v1",
    ] {
        let mut bad = value.clone();
        bad["revision"] = json!(2);
        bad["projects"][0]["tasks"][0]["providerAuthMode"] = json!("none");
        bad["projects"][0]["tasks"][0]["providerProtocol"] = json!("ollama");
        bad["projects"][0]["tasks"][0]["providerBaseUrl"] = json!(base);
        assert!(f.repo.write(bad, Some(1)).is_err());
        assert_eq!(fs::read(&f.repo.path).unwrap(), original);
    }
}
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
fn sidebar_preferences_round_trip_and_invalid_updates_preserve_original() {
    for version in [2, 3] {
        let root = unique_path(
            &Path::new(env!("CARGO_MANIFEST_DIR"))
                .parent()
                .unwrap()
                .join(".tmp/task-sidebar-canvas-20261018/sidebar-native"),
            "fixture",
        );
        fs::create_dir_all(&root).unwrap();
        let repo = SnapshotRepository::new(root.join("creation-v2.json"));
        let mut value = if version == 3 {
            crate::native_root_authority::migrated_snapshot(&snapshot(1))
        } else {
            snapshot(1)
        };
        value["activeProjectId"] = Value::Null;
        value["projectGroups"] = json!([{"id":"g", "name":"Deleted group", "deletedAt":10}]);
        value["projects"][0]["trashedAt"] = json!(10);
        value["sidebarPreferences"] =
            json!({"sortMode":"priority", "pinnedProjectIds":["p1"], "pinnedGroupIds":["g"]});
        repo.write(value.clone(), None).unwrap();
        let original = fs::read(&repo.path).unwrap();
        assert_eq!(
            SnapshotRepository::new(repo.path.clone())
                .read()
                .unwrap()
                .snapshot
                .unwrap(),
            value
        );
        let revision = value["revision"].as_u64().unwrap();
        for bad in [
            Value::Null,
            json!([]),
            json!({}),
            json!({"sortMode":"alphabetical", "pinnedProjectIds":["p1"], "pinnedGroupIds":["g"]}),
            json!({"sortMode":"manual", "pinnedProjectIds":"p1", "pinnedGroupIds":[]}),
            json!({"sortMode":"manual", "pinnedProjectIds":[], "pinnedGroupIds":[1]}),
            json!({"sortMode":"manual", "pinnedProjectIds":["p1","p1"], "pinnedGroupIds":[]}),
            json!({"sortMode":"manual", "pinnedProjectIds":[], "pinnedGroupIds":["g","g"]}),
            json!({"sortMode":"manual", "pinnedProjectIds":["missing"], "pinnedGroupIds":[]}),
            json!({"sortMode":"manual", "pinnedProjectIds":[], "pinnedGroupIds":["missing"]}),
            json!({"sortMode":"manual", "pinnedProjectIds":[], "pinnedGroupIds":[], "futureSetting":true}),
        ] {
            let mut invalid = value.clone();
            invalid["revision"] = json!(revision + 1);
            invalid["sidebarPreferences"] = bad;
            assert!(repo.write(invalid, Some(revision)).is_err());
            assert_eq!(fs::read(&repo.path).unwrap(), original);
        }
        let mut stale = value.clone();
        stale["revision"] = json!(revision + 1);
        stale["sidebarPreferences"]["sortMode"] = json!("recent");
        assert!(repo.write(stale, Some(revision - 1)).is_err());
        assert_eq!(fs::read(&repo.path).unwrap(), original);
    }
}

#[test]
fn project_lifecycle_metadata_survives_native_storage_and_invalid_references_fail() {
    let f = Fixture::new();
    let mut value = snapshot(1);
    value["activeProjectId"] = Value::Null;
    value["projectGroups"] = json!([{"id":"g", "name":"客户"}]);
    value["projects"][0]["groupId"] = json!("g");
    value["projects"][0]["nameSource"] = json!("manual");
    value["projects"][0]["trashedAt"] = json!(10);
    f.repo.write(value.clone(), None).unwrap();
    assert_eq!(f.repo.read().unwrap().snapshot.unwrap(), value);
    for (field, bad) in [
        ("groupId", json!("missing")),
        ("trashedAt", json!(-1)),
        ("nameSource", json!("invented")),
    ] {
        let mut invalid = value.clone();
        invalid["revision"] = json!(2);
        invalid["projects"][0][field] = bad;
        assert!(f.repo.write(invalid, Some(1)).is_err(), "accepted {field}");
        assert_eq!(f.repo.read().unwrap().snapshot.unwrap(), value);
    }
    let mut duplicate = value.clone();
    duplicate["projectGroups"] = json!([{"id":"g", "name":"客户"}, {"id":"g", "name":"重复"}]);
    assert!(validation::validate(&duplicate).is_err());
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
fn collection_labels_survive_native_backup_and_invalid_writes_preserve_original() {
    let f = Fixture::new();
    let mut value = snapshot(1);
    value["projects"][0]["customTags"] = json!(["客户A"]);
    value["projects"][0]["items"][0]["tags"] = json!(["人物", "最终版"]);
    value["projects"][0]["favoriteIds"] = json!(["n1"]);
    value["projects"][0]["likedIds"] = json!(["n1"]);
    f.repo.write(value.clone(), None).unwrap();
    let mut next = value.clone();
    next["revision"] = json!(2);
    next["projects"][0]["name"] = json!("Renamed");
    f.repo.write(next.clone(), Some(1)).unwrap();
    for labels in [
        json!(["人物", "人物"]),
        json!([" "]),
        json!([" spaced "]),
        json!([42]),
        json!(["😀".repeat(21)]),
        json!(vec!["tag"; 33]),
    ] {
        let mut bad = next.clone();
        bad["revision"] = json!(3);
        bad["projects"][0]["items"][0]["tags"] = labels.clone();
        assert!(f.repo.write(bad, Some(2)).is_err());
        let mut bad = next.clone();
        bad["revision"] = json!(3);
        bad["projects"][0]["customTags"] = labels;
        assert!(f.repo.write(bad, Some(2)).is_err());
        assert_eq!(f.repo.read().unwrap().snapshot.unwrap(), next);
    }
    f.main(&json!({"corrupt": true}));
    assert_eq!(f.repo.read().unwrap().snapshot.unwrap(), value);
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
    future["version"] = json!(4);
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
fn snapshot_v3_validation_accepts_valid_and_rejects_corrupt() {
    let mut v3 = snapshot(10);
    v3["version"] = json!(3);
    v3["projects"][0]["activeChatId"] = json!("chat-main");
    v3["projects"][0]["chats"] = json!({
        "chat-main": {
            "id": "chat-main",
            "name": "Main Chat",
            "createdAt": 1000,
            "updatedAt": 1000,
            "draft": {},
            "messages": [{"id": "m1", "role": "user", "content": "Hello"}],
            "mainAgent": "codex",
            "modelAllowlist": ["gpt-4o"]
        }
    });
    assert!(validation::validate(&v3).is_ok());

    // Rejects missing activeChatId in chats
    let mut bad_active = v3.clone();
    bad_active["projects"][0]["activeChatId"] = json!("chat-missing");
    assert!(validation::validate(&bad_active).is_err());

    // Rejects chat key != chat.id
    let mut bad_key = v3.clone();
    bad_key["projects"][0]["chats"]["chat-main"]["id"] = json!("different-id");
    assert!(validation::validate(&bad_key).is_err());
}

#[test]
fn current_writer_cannot_downgrade_v3_or_replace_mixed_format_backup() {
    let f = Fixture::new();
    let mut future = snapshot(2);
    future["version"] = json!(3);
    future["projects"][0]["activeChatId"] = json!("chat");
    future["projects"][0]["chats"] = json!({"chat":{"id":"chat","name":"history","messages":[]}});
    future["projects"][0]
        .as_object_mut()
        .unwrap()
        .remove("messages");
    future["projects"][0]
        .as_object_mut()
        .unwrap()
        .remove("composerDraft");
    f.repo.write(future.clone(), None).unwrap();
    let upgraded = fs::read(&f.repo.path).unwrap();
    assert!(f
        .repo
        .write(snapshot(3), Some(2))
        .unwrap_err()
        .starts_with("unsupported:"));
    assert_eq!(fs::read(&f.repo.path).unwrap(), upgraded);
    let main = f.main(&snapshot(1));
    let backup = f.backup(&future);
    assert!(f.repo.read().unwrap().read_only_reason.is_some());
    assert!(f
        .repo
        .write(snapshot(2), Some(1))
        .unwrap_err()
        .starts_with("readonly:"));
    assert_eq!(fs::read(&f.repo.path).unwrap(), main);
    assert_eq!(
        fs::read(f.repo.path.with_extension("json.bak")).unwrap(),
        backup
    );
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
