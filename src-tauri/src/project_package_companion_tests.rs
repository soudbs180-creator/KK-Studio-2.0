use super::*;
use serde_json::json;
use std::sync::atomic::{AtomicU64, Ordering};

static NEXT: AtomicU64 = AtomicU64::new(0);

struct Fixture(PathBuf);
impl Fixture {
    fn new(version: u64) -> Self {
        let root = std::env::temp_dir().join(format!(
            "kk-companion-import-{}-{}",
            std::process::id(),
            NEXT.fetch_add(1, Ordering::Relaxed)
        ));
        let source = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join(format!("../tests/fixtures/companion-backup-v1/v{version}"));
        copy_tree(&source, &root.join("backup"));
        Self(root)
    }
    fn source(&self) -> PathBuf {
        self.0.join("backup/manifest.json")
    }
    fn snapshot(&self) -> Value {
        strict_json::parse(&fs::read(self.0.join("backup/projects/creation-v2.json")).unwrap())
            .unwrap()
    }
    fn manifest(&self) -> Value {
        strict_json::parse(&fs::read(self.source()).unwrap()).unwrap()
    }
    fn write_manifest(&self, mut value: Value) {
        value.as_object_mut().unwrap().remove("manifestSha256");
        value["manifestSha256"] = json!(asset_validation::hash(&canonical_bytes(&value).unwrap()));
        fs::write(self.source(), serde_json::to_vec(&value).unwrap()).unwrap();
    }
    fn replace_file(&self, name: &str, bytes: &[u8]) {
        fs::write(self.0.join("backup").join(name), bytes).unwrap();
        let mut manifest = self.manifest();
        let entry = manifest["files"]
            .as_array_mut()
            .unwrap()
            .iter_mut()
            .find(|entry| entry["path"] == name)
            .unwrap();
        entry["sha256"] = json!(asset_validation::hash(bytes));
        entry["size"] = json!(bytes.len());
        self.write_manifest(manifest);
    }
    fn rejected(&self, code: &str) {
        let before = self.source_bytes();
        let target = self.0.join("rejected");
        assert!(preflight_package(&self.source())
            .unwrap_err()
            .starts_with(code));
        assert!(import_package(&self.source(), &target)
            .unwrap_err()
            .starts_with(code));
        assert!(!target.exists());
        assert_eq!(self.source_bytes(), before);
        assert!(!fs::read_dir(&self.0)
            .unwrap()
            .flatten()
            .any(|e| e.file_name().to_string_lossy().contains("kkstudio-import")));
    }
    fn source_bytes(&self) -> BTreeMap<PathBuf, Vec<u8>> {
        fn visit(root: &Path, path: &Path, files: &mut BTreeMap<PathBuf, Vec<u8>>) {
            for entry in fs::read_dir(path).unwrap().flatten() {
                if entry.file_type().unwrap().is_dir() {
                    visit(root, &entry.path(), files);
                } else {
                    files.insert(
                        entry.path().strip_prefix(root).unwrap().into(),
                        fs::read(entry.path()).unwrap(),
                    );
                }
            }
        }
        let mut files = BTreeMap::new();
        visit(&self.0.join("backup"), &self.0.join("backup"), &mut files);
        files
    }
}
impl Drop for Fixture {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}
fn copy_tree(source: &Path, target: &Path) {
    fs::create_dir_all(target).unwrap();
    for entry in fs::read_dir(source).unwrap().flatten() {
        if entry.file_type().unwrap().is_dir() {
            copy_tree(&entry.path(), &target.join(entry.file_name()));
        } else {
            let name = entry.file_name();
            let name = name.to_str().unwrap();
            fs::copy(
                entry.path(),
                target.join(name.strip_suffix(".fixture").unwrap_or(name)),
            )
            .unwrap();
        }
    }
}

#[test]
fn real_node_v2_v3_backups_restore_all_assets_chats_and_extensions() {
    for version in [2, 3] {
        let f = Fixture::new(version);
        let before = f.source_bytes();
        let expected = f.snapshot();
        let summary = preflight_package(&f.source()).unwrap();
        assert_eq!(summary.asset_ids.len(), 2);
        assert_eq!(summary.project_ids, project_ids(&expected));
        assert_eq!(f.source_bytes(), before);
        let target = f.0.join("restored");
        assert_eq!(
            import_package(&f.source(), &target).unwrap().checksum,
            summary.checksum
        );
        let actual = SnapshotRepository::new(target.join("projects/creation-v2.json"))
            .read()
            .unwrap()
            .snapshot
            .unwrap();
        assert_eq!(
            actual,
            crate::native_root_authority::migrated_snapshot(&expected)
        );
        assert_eq!(
            actual["projects"][0]["chats"]["chat-default"],
            expected["projects"][0]["chats"]["chat-default"]
        );
        for id in summary.asset_ids {
            let metadata =
                strict_json::parse(&before[&PathBuf::from(format!("assets/records/{id}.json"))])
                    .unwrap();
            let loaded = AssetRepository::new(target.join("assets"))
                .read(&id)
                .unwrap()
                .unwrap();
            let mut native_metadata = metadata.clone();
            native_metadata.as_object_mut().unwrap().remove("size");
            assert_eq!(loaded.metadata, native_metadata);
            assert_eq!(
                STANDARD.decode(loaded.data_base64).unwrap(),
                before[&PathBuf::from(format!(
                    "assets/blobs/{}",
                    metadata["sha256"].as_str().unwrap()
                ))]
            );
            let record = strict_json::parse(
                &fs::read(target.join(format!("assets/records/{id}.json"))).unwrap(),
            )
            .unwrap();
            assert_eq!(record["version"], json!(1));
        }
        assert_eq!(f.source_bytes(), before);
    }
}

#[test]
fn invalid_manifests_fail_before_writes_and_preserve_sources() {
    for (field, value, code) in [
        ("protocolVersion", json!(9), "unsupported:"),
        ("snapshotRevision", json!(8), "conflict:"),
        ("createdAt", json!("2026-02-30T00:00:00Z"), "corrupt:"),
        ("unexpected", json!(true), "corrupt:"),
    ] {
        let f = Fixture::new(2);
        let mut manifest = f.manifest();
        manifest[field] = value;
        f.write_manifest(manifest);
        f.rejected(code);
    }
    let f = Fixture::new(3);
    let mut manifest = f.manifest();
    manifest["manifestSha256"] = json!("0".repeat(64));
    fs::write(f.source(), serde_json::to_vec(&manifest).unwrap()).unwrap();
    f.rejected("checksum-mismatch:");
}

#[test]
fn duplicate_json_members_are_never_discarded() {
    for name in [
        "manifest.json",
        "projects/creation-v2.json",
        "assets/records/asset-c707e60a684bf51be53aff5b.json",
    ] {
        let f = Fixture::new(3);
        let bytes = if name == "manifest.json" {
            b"{\"protocolVersion\":1,\"protocolVersion\":9}".to_vec()
        } else {
            let source = fs::read(f.0.join("backup").join(name)).unwrap();
            let field = if name.starts_with("projects/") {
                "version"
            } else {
                "assetId"
            };
            let mut duplicate = format!("{{\"{field}\":null,").into_bytes();
            duplicate.extend_from_slice(&source[1..]);
            duplicate
        };
        if name == "manifest.json" {
            fs::write(f.source(), bytes).unwrap();
        } else {
            f.replace_file(name, &bytes);
        }
        f.rejected("corrupt:");
    }
}

#[test]
fn paths_collisions_unknown_files_and_limits_are_rejected() {
    for name in [
        "../escape",
        "assets\\blobs\\escape",
        "/absolute",
        "assets/blobs/C:stream",
        "assets/records/./x",
        "app/repository.json",
        "projects/creation-v2.json.",
    ] {
        let f = Fixture::new(3);
        let mut manifest = f.manifest();
        manifest["files"][0]["path"] = json!(name);
        f.write_manifest(manifest);
        assert!(preflight_package(&f.source()).is_err());
        assert!(!f.0.join("rejected").exists());
    }
    for uppercase in [false, true] {
        let f = Fixture::new(3);
        let mut manifest = f.manifest();
        let mut duplicate = manifest["files"][0].clone();
        if uppercase {
            duplicate["path"] = json!(duplicate["path"].as_str().unwrap().to_uppercase());
        }
        manifest["files"].as_array_mut().unwrap().push(duplicate);
        f.write_manifest(manifest);
        f.rejected("duplicate-entry:");
    }
    let f = Fixture::new(3);
    let mut manifest = f.manifest();
    manifest["files"][0]["size"] = json!(MAX_ENTRY_BYTES + 1);
    f.write_manifest(manifest);
    f.rejected("quota:");
    let f = Fixture::new(3);
    let mut manifest = f.manifest();
    manifest["files"] = json!(vec![manifest["files"][0].clone(); MAX_ENTRIES + 1]);
    f.write_manifest(manifest);
    f.rejected("quota:");
}

#[test]
fn file_hash_size_and_missing_records_are_checked() {
    for change in [
        "hash",
        "size",
        "missing-file",
        "missing-record",
        "missing-blob",
        "missing-snapshot",
    ] {
        let f = Fixture::new(3);
        let mut manifest = f.manifest();
        let path = manifest["files"][0]["path"].as_str().unwrap().to_string();
        let code = match change {
            "hash" => {
                fs::write(f.0.join("backup").join(&path), b"tampered").unwrap();
                "checksum-mismatch:"
            }
            "size" => {
                manifest["files"][0]["size"] = json!(1);
                "checksum-mismatch:"
            }
            "missing-file" => {
                fs::remove_file(f.0.join("backup").join(&path)).unwrap();
                "missing-asset:"
            }
            "missing-record" => {
                manifest["files"]
                    .as_array_mut()
                    .unwrap()
                    .retain(|e| !e["path"].as_str().unwrap().starts_with("assets/records/"));
                "corrupt:"
            }
            "missing-blob" => {
                manifest["files"]
                    .as_array_mut()
                    .unwrap()
                    .retain(|e| !e["path"].as_str().unwrap().starts_with("assets/blobs/"));
                "corrupt:"
            }
            _ => {
                manifest["files"]
                    .as_array_mut()
                    .unwrap()
                    .retain(|e| e["path"] != "projects/creation-v2.json");
                "corrupt:"
            }
        };
        f.write_manifest(manifest);
        f.rejected(code);
    }
}

#[test]
fn future_snapshots_incomplete_provenance_native_records_and_secrets_are_refused() {
    let f = Fixture::new(3);
    let mut snapshot = f.snapshot();
    snapshot["version"] = json!(9);
    f.replace_file(
        "projects/creation-v2.json",
        &serde_json::to_vec(&snapshot).unwrap(),
    );
    f.rejected("unsupported:");
    for change in [
        "no-provenance",
        "no-time",
        "bad-time",
        "native",
        "record-id",
        "record-size",
        "secret",
    ] {
        let f = Fixture::new(3);
        let name = "assets/records/asset-c707e60a684bf51be53aff5b.json";
        let mut record =
            strict_json::parse(&fs::read(f.0.join("backup").join(name)).unwrap()).unwrap();
        let code = match change {
            "no-provenance" => {
                record.as_object_mut().unwrap().remove("provenance");
                "unsupported:"
            }
            "no-time" => {
                record["provenance"]
                    .as_object_mut()
                    .unwrap()
                    .remove("generatedAt");
                "unsupported:"
            }
            "bad-time" => {
                record["provenance"]["generatedAt"] = json!("yesterday");
                "corrupt:"
            }
            "native" => {
                record = json!({"version":1,"metadata":record});
                "unsupported:"
            }
            "record-id" => {
                record["assetId"] = json!("asset-000000000000000000000000");
                "corrupt:"
            }
            "record-size" => {
                record["size"] = json!(1);
                "asset-hash-mismatch:"
            }
            _ => {
                record["apiKey"] = json!("synthetic-secret-only");
                "secret-present:"
            }
        };
        f.replace_file(name, &serde_json::to_vec(&record).unwrap());
        f.rejected(code);
    }
}

#[test]
fn legacy_message_asset_references_must_have_records() {
    let f = Fixture::new(2);
    let mut snapshot = f.snapshot();
    snapshot["projects"][0]["messages"][0]["assetIds"] = json!(["asset-000000000000000000000000"]);
    f.replace_file(
        "projects/creation-v2.json",
        &serde_json::to_vec(&snapshot).unwrap(),
    );
    f.rejected("missing-asset:");
}

#[test]
fn undeclared_assets_cannot_be_silently_omitted_from_restore() {
    let f = Fixture::new(3);
    let mut manifest = f.manifest();
    manifest["files"].as_array_mut().unwrap().retain(|entry| {
        !entry["path"]
            .as_str()
            .unwrap()
            .contains("ef1955ae757c8b966c832483")
    });
    f.write_manifest(manifest);
    f.rejected("corrupt:");
}

#[test]
fn ambiguous_legacy_threads_fail_without_publication() {
    for multiple in [false, true] {
        let f = Fixture::new(2);
        let mut snapshot = f.snapshot();
        if multiple {
            let mut chat = snapshot["projects"][0]["chats"]["chat-default"].clone();
            chat["id"] = json!("other-chat");
            snapshot["projects"][0]["chats"]["other-chat"] = chat;
        } else {
            snapshot["projects"][0]["chats"]["chat-default"]["mainAgent"] = json!("direct");
        }
        f.replace_file(
            "projects/creation-v2.json",
            &serde_json::to_vec(&snapshot).unwrap(),
        );
        let before = f.source_bytes();
        let target = f.0.join("restored");
        assert!(import_package(&f.source(), &target)
            .unwrap_err()
            .starts_with("corrupt:"));
        assert!(!target.exists());
        assert_eq!(f.source_bytes(), before);
    }
}

#[test]
fn total_quota_manifest_quota_and_orphan_blobs_fail_safely() {
    let f = Fixture::new(3);
    let mut manifest = f.manifest();
    manifest["files"] = json!((0..6)
        .map(|i| {
            let sha = format!("{i:064x}");
            json!({"path":format!("assets/blobs/{sha}"),"sha256":sha,"size":MAX_ENTRY_BYTES})
        })
        .collect::<Vec<_>>());
    f.write_manifest(manifest);
    f.rejected("quota:");
    let f = Fixture::new(3);
    fs::write(f.source(), format!("{{{}", " ".repeat(4 * 1024 * 1024))).unwrap();
    f.rejected("quota:");
    let f = Fixture::new(3);
    let record = "assets/records/asset-ef1955ae757c8b966c832483.json";
    let mut manifest = f.manifest();
    manifest["files"]
        .as_array_mut()
        .unwrap()
        .retain(|entry| entry["path"] != record);
    fs::remove_file(f.0.join("backup").join(record)).unwrap();
    f.write_manifest(manifest);
    f.rejected("unreferenced-asset:");
}

#[test]
fn import_faults_remove_only_owned_staging_and_can_retry() {
    for stage in [
        "import-before-assets",
        "import-before-snapshot",
        "import-before-readback",
        "import-before-publish",
    ] {
        let f = Fixture::new(3);
        let before = f.source_bytes();
        let target = f.0.join("restored");
        failure_tests::FAILURE.with(|point| *point.borrow_mut() = Some(stage));
        let result = import_package(&f.source(), &target);
        failure_tests::FAILURE.with(|point| *point.borrow_mut() = None);
        assert!(result.unwrap_err().contains(stage));
        assert!(!target.exists());
        assert_eq!(f.source_bytes(), before);
        assert!(!fs::read_dir(&f.0)
            .unwrap()
            .flatten()
            .any(|e| e.file_name().to_string_lossy().contains("kkstudio-import")));
        import_package(&f.source(), &target).unwrap();
        let restored = fs::read(target.join("projects/creation-v2.json")).unwrap();
        assert!(import_package(&f.source(), &target)
            .unwrap_err()
            .starts_with("target-not-empty:"));
        assert_eq!(
            fs::read(target.join("projects/creation-v2.json")).unwrap(),
            restored
        );
    }
}

#[cfg(any(windows, unix))]
#[test]
fn selected_root_controlled_directory_and_file_links_are_rejected() {
    for item in [
        "backup",
        "backup/assets",
        "backup/assets/records",
        "backup/assets/blobs",
        "backup/manifest.json",
        "backup/assets/blobs/c707e60a684bf51be53aff5b5ff1d0e700ef0806045d139ef569d80f0c9222ec",
    ] {
        let f = Fixture::new(3);
        let original = f.0.join(item);
        let moved = f.0.join("original");
        let directory = original.is_dir();
        fs::rename(&original, &moved).unwrap();
        #[cfg(windows)]
        {
            // Junctions exercise the Windows reparse guard without symlink privileges.
            let destination = if directory {
                moved.clone()
            } else {
                let dir = f.0.join("link-target");
                fs::create_dir(&dir).unwrap();
                dir
            };
            let result = std::process::Command::new("cmd")
                .args(["/c", "mklink", "/J"])
                .arg(original.to_string_lossy().replace('/', "\\"))
                .arg(destination.to_string_lossy().replace('/', "\\"))
                .output()
                .unwrap();
            assert!(
                result.status.success(),
                "{}",
                String::from_utf8_lossy(&result.stderr)
            );
        }
        #[cfg(unix)]
        std::os::unix::fs::symlink(&moved, &original).unwrap();
        assert!(preflight_package(&f.source()).is_err());
        assert!(import_package(&f.source(), &f.0.join("restored")).is_err());
        assert!(!f.0.join("restored").exists());
        #[cfg(windows)]
        fs::remove_dir(&original).unwrap();
        #[cfg(unix)]
        fs::remove_file(&original).unwrap();
        fs::rename(&moved, &original).unwrap();
        assert!(preflight_package(&f.source()).is_ok());
    }
}
