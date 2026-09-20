use super::*;
use serde_json::json;

thread_local! { static FAILURE: std::cell::RefCell<Option<&'static str>> = const { std::cell::RefCell::new(None) }; }
pub(super) fn fail_at(stage: &str) -> Result<(), String> {
    if FAILURE.with(|point| *point.borrow() == Some(stage)) {
        Err(format!("io: injected {stage}"))
    } else {
        Ok(())
    }
}

struct Fixture {
    root: PathBuf,
    snapshots: SnapshotRepository,
    assets: AssetRepository,
    id: String,
    sha: String,
    snapshot: Value,
}
impl Fixture {
    fn new() -> Self {
        let root = std::env::temp_dir().join(format!(
            "kk-package-fault-{}-{}",
            std::process::id(),
            nonce()
        ));
        fs::create_dir_all(root.join("projects")).unwrap();
        fs::create_dir(root.join("assets")).unwrap();
        let assets = AssetRepository::new(root.join("assets"));
        let bytes = b"complete original";
        let sha = asset_validation::hash(bytes);
        let id = format!("asset-{}", &sha[..24]);
        assets.store(STANDARD.encode(bytes), json!({"assetId":id,"sha256":sha,"mime":"image/png","tags":[],"provenance":{"generatedAt":"2026-09-18T00:00:00Z"}})).unwrap();
        let snapshot = json!({"version":2,"revision":1,"activeProjectId":"p1","homeDraft":{"attachments":[]},"projects":[{
            "id":"p1","name":"Package","items":[{"id":"n1","title":"Image","description":"","kind":"image","assetId":id,"preview":format!("kk-asset:{id}")},{"id":"n2","title":"Edit","description":"","kind":"image","parentAssetId":id}],
            "canvas":{"version":1,"positions":{"n1":{"x":123.5,"y":10},"n2":{"x":420,"y":50}},"edges":[{"id":"e1","source":"n1","target":"n2","kind":"reference"}],"viewport":{"x":24,"y":-16,"scale":0.8}},
            "messages":[{"id":"m1","content":"kk-asset:plain user text","role":"user","createdAt":1}],
            "tasks":[{"id":"t1","prompt":"restore","model":"synthetic","status":"succeeded","outputs":[{"index":0,"status":"succeeded","assetId":id,"model":"synthetic","createdAt":1}]}]
        }]});
        let snapshots = SnapshotRepository::new(root.join("projects/creation-v2.json"));
        snapshots.write(snapshot.clone(), None).unwrap();
        Self {
            root,
            snapshots,
            assets,
            id,
            sha,
            snapshot,
        }
    }
    fn package(&self) -> PathBuf {
        let path = self.root.join("backup.kkproject");
        export_package(&self.snapshots, &self.assets, &path).unwrap();
        path
    }
    fn source_bytes(&self) -> (Vec<u8>, Vec<u8>) {
        (
            fs::read(self.root.join("projects/creation-v2.json")).unwrap(),
            fs::read(self.root.join("assets/blobs").join(&self.sha)).unwrap(),
        )
    }
}
impl Drop for Fixture {
    fn drop(&mut self) {
        FAILURE.with(|point| *point.borrow_mut() = None);
        let _ = fs::remove_dir_all(&self.root);
    }
}

#[test]
fn checksum_matches_shared_utf16_keys_and_ecmascript_numbers() {
    let fixture: Value = serde_json::from_str(include_str!(
        "../../tests/fixtures/project-package/canonical.json"
    ))
    .unwrap();
    let bytes = canonical_bytes(&fixture["input"]).unwrap();
    assert_eq!(
        String::from_utf8(bytes.clone()).unwrap(),
        fixture["canonical"].as_str().unwrap()
    );
    assert_eq!(
        asset_validation::hash(&bytes),
        fixture["sha256"].as_str().unwrap()
    );
}

#[test]
fn duplicate_json_members_and_inflated_zip_directory_fail_closed() {
    assert!(strict_json::parse(br#"{"snapshot":{"x":1,"x":2}}"#).is_err());
    assert!(strict_json::parse(br#"{} {}"#).is_err());
    let mut archive = make_zip(&[("manifest.json".into(), b"{}".to_vec())]).unwrap();
    let end = archive.len() - 22;
    archive[end + 8..end + 12].copy_from_slice(&[255, 255, 255, 255]);
    assert!(read_zip(&archive).unwrap_err().starts_with("quota:"));
}

#[test]
fn raw_zip_traversal_symlink_executable_and_duplicate_are_rejected() {
    fn raw(name: &str, executable: bool, symlink: bool) -> Vec<u8> {
        let mut writer = ZipWriter::new(Cursor::new(Vec::new()));
        let options =
            SimpleFileOptions::default().unix_permissions(if executable { 0o755 } else { 0o644 });
        if symlink {
            writer.add_symlink(name, "outside", options).unwrap();
        } else {
            writer.start_file(name, options).unwrap();
            writer.write_all(b"{}").unwrap();
        }
        writer.finish().unwrap().into_inner()
    }
    assert!(read_zip(&raw("../escape", false, false))
        .unwrap_err()
        .starts_with("path-traversal:"));
    assert!(read_zip(&raw("manifest.json", false, true)).is_err());
    assert!(read_zip(&raw("manifest.json", true, false)).is_err());
    let mut duplicate = make_zip(&[
        ("manifest.json".into(), b"{}".to_vec()),
        ("manifest.jsox".into(), b"{}".to_vec()),
    ])
    .unwrap();
    let matches: Vec<usize> = duplicate
        .windows(13)
        .enumerate()
        .filter_map(|(i, bytes)| (bytes == b"manifest.jsox").then_some(i))
        .collect();
    for start in matches {
        duplicate[start + 12] = b'n';
    }
    assert!(read_zip(&duplicate).is_err());
}

#[test]
fn command_target_guard_blocks_new_files_inside_active_data_root() {
    let f = Fixture::new();
    assert!(require_isolated_target(&f.root.join("assets/new"), &f.root).is_err());
    assert!(require_isolated_target(&f.root.with_extension("new"), &f.root).is_ok());
}

#[test]
fn complete_graph_and_original_survive_independent_repository_reopen() {
    let f = Fixture::new();
    let package = f.package();
    let before = f.source_bytes();
    let target = f.root.join("restored");
    let summary = import_package(&package, &target).unwrap();
    assert_eq!(summary.project_ids, ["p1"]);
    assert_eq!(summary.asset_ids, [f.id.clone()]);
    assert_eq!(
        SnapshotRepository::new(target.join("projects/creation-v2.json"))
            .read()
            .unwrap()
            .snapshot
            .unwrap(),
        f.snapshot
    );
    let loaded = AssetRepository::new(target.join("assets"))
        .read(&f.id)
        .unwrap()
        .unwrap();
    assert_eq!(
        asset_validation::hash(&STANDARD.decode(loaded.data_base64).unwrap()),
        f.sha
    );
    assert_eq!(f.source_bytes(), before);
}

#[test]
fn task_submission_states_and_unknown_outputs_round_trip_without_rewrite() {
    let f = Fixture::new();
    let mut snapshot = f.snapshot.clone();
    snapshot["revision"] = json!(2);
    snapshot["projects"][0]["tasks"] = json!([
        {"id":"intent","prompt":"restore","model":"synthetic","status":"running","submissionState":"intent","submittedAt":0,"idempotencyKey":"stable-intent"},
        {"id":"submitted","prompt":"restore","model":"synthetic","status":"running","submissionState":"submitted","submittedAt":42,"idempotencyKey":"stable-submitted"},
        {"id":"unknown","prompt":"restore","model":"synthetic","status":"unknown","submissionState":"unknown","submittedAt":9007199254740991_u64,"idempotencyKey":"stable-unknown","outputs":[{"index":0,"status":"unknown","model":"synthetic","createdAt":1}]},
        {"id":"terminal","prompt":"restore","model":"synthetic","status":"failed","submissionState":"terminal","idempotencyKey":"stable-terminal"}
    ]);
    f.snapshots.write(snapshot.clone(), Some(1)).unwrap();
    let package = f.package();
    let before = f.source_bytes();
    let target = f.root.join("submission-restored");
    import_package(&package, &target).unwrap();
    let restored = SnapshotRepository::new(target.join("projects/creation-v2.json"))
        .read()
        .unwrap()
        .snapshot
        .unwrap();
    assert_eq!(restored, snapshot);
    assert_eq!(
        restored["projects"][0]["tasks"][0]["submissionState"],
        "intent"
    );
    assert_eq!(
        restored["projects"][0]["tasks"][2]["outputs"][0]["status"],
        "unknown"
    );
    assert_eq!(f.source_bytes(), before);
}

#[test]
fn all_import_faults_preserve_sources_remove_staging_and_allow_retry() {
    for stage in [
        "import-before-assets",
        "import-before-snapshot",
        "import-before-readback",
        "import-before-publish",
    ] {
        let f = Fixture::new();
        let package = f.package();
        let before = f.source_bytes();
        let original = fs::read(&package).unwrap();
        let target = f.root.join("restored");
        FAILURE.with(|point| *point.borrow_mut() = Some(stage));
        assert!(import_package(&package, &target)
            .unwrap_err()
            .contains(stage));
        FAILURE.with(|point| *point.borrow_mut() = None);
        assert!(!target.exists());
        assert_eq!(f.source_bytes(), before);
        assert_eq!(fs::read(&package).unwrap(), original);
        assert!(!fs::read_dir(&f.root).unwrap().flatten().any(|entry| entry
            .file_name()
            .to_string_lossy()
            .contains("kkstudio-import")));
        import_package(&package, &target).unwrap();
    }
}

#[test]
fn all_export_faults_preserve_source_and_leave_no_visible_package() {
    for stage in [
        "export-before-sync",
        "export-before-readback",
        "export-before-publish",
    ] {
        let f = Fixture::new();
        let before = f.source_bytes();
        let target = f.root.join("backup.kkproject");
        FAILURE.with(|point| *point.borrow_mut() = Some(stage));
        assert!(export_package(&f.snapshots, &f.assets, &target)
            .unwrap_err()
            .contains(stage));
        FAILURE.with(|point| *point.borrow_mut() = None);
        assert!(!target.exists());
        assert_eq!(f.source_bytes(), before);
        assert!(!fs::read_dir(&f.root)
            .unwrap()
            .flatten()
            .any(|entry| entry.file_name().to_string_lossy().contains(".tmp.")));
        f.package();
    }
}

#[test]
fn malformed_packages_fail_before_any_destination_write() {
    let f = Fixture::new();
    let source = f.package();
    let before = f.source_bytes();
    let good_entries = read_zip(&fs::read(&source).unwrap()).unwrap();
    for kind in [
        "schema",
        "missing-field",
        "checksum",
        "missing-asset",
        "wrong-hash",
        "secret",
        "unknown-snapshot",
        "mismatch",
        "waiting",
        "bad-output",
        "bad-submission-state",
        "negative-submitted-at",
        "fractional-submitted-at",
        "overflow-submitted-at",
    ] {
        let mut entries = good_entries.clone();
        let index = entries
            .iter()
            .position(|(name, _)| name == "manifest.json")
            .unwrap();
        let mut manifest: Value = serde_json::from_slice(&entries[index].1).unwrap();
        match kind {
            "schema" => manifest["version"] = json!(99),
            "missing-field" => {
                manifest.as_object_mut().unwrap().remove("exportedAt");
            }
            "checksum" => manifest["checksum"] = json!("0".repeat(64)),
            "missing-asset" => {
                entries.retain(|(name, _)| name == "manifest.json");
            }
            "wrong-hash" => {
                let asset = entries
                    .iter_mut()
                    .find(|(name, _)| name.starts_with("assets/"))
                    .unwrap();
                asset.1[0] ^= 1;
            }
            "secret" => manifest["snapshot"]["homeDraft"]["provider-api-key"] = json!("synthetic"),
            "unknown-snapshot" => {
                manifest["snapshot"]["projects"][0]["extra"] = json!("must not disappear")
            }
            "mismatch" => {
                manifest["snapshot"]["projects"][0]["items"][0]["preview"] =
                    json!(format!("kk-asset:asset-{}", "f".repeat(24)))
            }
            "waiting" => {
                manifest["snapshot"]["projects"][0]["tasks"][0]["outputs"][0]["status"] =
                    json!("waiting")
            }
            "bad-output" => {
                manifest["snapshot"]["projects"][0]["tasks"][0]["outputs"][0]["status"] =
                    json!("bogus")
            }
            "bad-submission-state" => {
                manifest["snapshot"]["projects"][0]["tasks"][0]["submissionState"] =
                    json!("accepted")
            }
            "negative-submitted-at" => {
                manifest["snapshot"]["projects"][0]["tasks"][0]["submittedAt"] = json!(-1)
            }
            "fractional-submitted-at" => {
                manifest["snapshot"]["projects"][0]["tasks"][0]["submittedAt"] = json!(0.5)
            }
            "overflow-submitted-at" => {
                manifest["snapshot"]["projects"][0]["tasks"][0]["submittedAt"] =
                    json!(9007199254740992_u64)
            }
            _ => unreachable!(),
        }
        if kind != "checksum" {
            manifest["checksum"] = json!(manifest_checksum(manifest.as_object().unwrap()).unwrap());
        }
        entries
            .iter_mut()
            .find(|(name, _)| name == "manifest.json")
            .unwrap()
            .1 = serde_json::to_vec(&manifest).unwrap();
        let bad = f.root.join(format!("{kind}.kkproject"));
        fs::write(&bad, make_zip(&entries).unwrap()).unwrap();
        let target = f.root.join(format!("restore-{kind}"));
        if kind == "waiting" {
            import_package(&bad, &target).unwrap();
        } else {
            assert!(import_package(&bad, &target).is_err(), "accepted {kind}");
            assert!(!target.exists());
        }
        assert_eq!(f.source_bytes(), before);
    }
}

#[test]
fn existing_targets_and_absolute_dotdot_are_never_replaced() {
    let f = Fixture::new();
    let source = f.package();
    let bytes = fs::read(&source).unwrap();
    assert!(export_package(&f.snapshots, &f.assets, &source)
        .unwrap_err()
        .starts_with("target-not-empty:"));
    let empty = f.root.join("empty");
    fs::create_dir(&empty).unwrap();
    assert!(import_package(&source, &empty)
        .unwrap_err()
        .starts_with("target-not-empty:"));
    assert!(import_package(&source, &f.root.join("..\\escape")).is_err());
    assert_eq!(fs::read(&source).unwrap(), bytes);
    assert!(empty.is_dir());
}
