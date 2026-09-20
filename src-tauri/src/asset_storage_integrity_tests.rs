use super::*;

#[test]
fn cross_process_writer_probe() {
    let Some(root) = std::env::var_os("KK_ASSET_TEST_ROOT") else {
        return;
    };
    let repo = AssetRepository::new(PathBuf::from(root));
    let result = repo.store(STANDARD.encode(BYTES), metadata(BYTES, "second-process"));
    if std::env::var("KK_ASSET_TEST_EXPECT_LOCKED").unwrap() == "yes" {
        assert!(result.unwrap_err().starts_with("io:"));
    } else {
        result.unwrap();
    }
}

#[test]
fn cross_process_lock_rejects_competing_writer_then_releases_on_close() {
    let f = Fixture::new();
    let m = f.save(BYTES, metadata(BYTES, "first"));
    let original = fs::read(f.record(&m)).unwrap();
    let run = |locked: bool| {
        let output = std::process::Command::new(std::env::current_exe().unwrap())
            .args([
                "--exact",
                "asset_storage::tests::integrity::cross_process_writer_probe",
                "--nocapture",
            ])
            .env("KK_ASSET_TEST_ROOT", &f.root)
            .env(
                "KK_ASSET_TEST_EXPECT_LOCKED",
                if locked { "yes" } else { "no" },
            )
            .output()
            .unwrap();
        assert!(
            output.status.success(),
            "{}\n{}",
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr)
        );
    };
    let guard = io::lock(&f.root).unwrap();
    run(true);
    assert_eq!(fs::read(f.record(&m)).unwrap(), original);
    drop(guard);
    run(false);
    let result = f
        .repo
        .read(m["assetId"].as_str().unwrap())
        .unwrap()
        .unwrap();
    assert_eq!(result.metadata["origins"].as_array().unwrap().len(), 2);
}

#[test]
fn large_original_is_preserved_outside_small_metadata_record() {
    let f = Fixture::new();
    let bytes = vec![0x71; 17 * 1024 * 1024];
    let mut m = metadata(&bytes, "large-original");
    m["mime"] = json!("video/mp4");
    f.save(&bytes, m.clone());
    assert_eq!(fs::metadata(f.blob(&m)).unwrap().len(), bytes.len() as u64);
    assert!(fs::metadata(f.record(&m)).unwrap().len() < 1024);
    let read = AssetRepository::new(f.root.clone())
        .read(m["assetId"].as_str().unwrap())
        .unwrap()
        .unwrap();
    assert_eq!(STANDARD.decode(read.data_base64).unwrap(), bytes);
}

#[test]
fn corrupt_orphan_blob_cannot_be_silently_overwritten() {
    let f = Fixture::new();
    f.repo.list().unwrap();
    let m = metadata(BYTES, "orphan");
    fs::write(f.blob(&m), b"damaged orphan").unwrap();
    assert!(f
        .repo
        .store(STANDARD.encode(BYTES), m.clone())
        .unwrap_err()
        .starts_with("corrupt:"));
    assert_eq!(fs::read(f.blob(&m)).unwrap(), b"damaged orphan");
    assert!(!f.record(&m).exists());
}

#[test]
fn mismatched_record_identity_and_invalid_nested_fields_are_explicit_errors() {
    let f = Fixture::new();
    let m = f.save(BYTES, metadata(BYTES, "valid"));
    for invalid in [json!({"api_key":"secret"}), json!("invalid-origin")] {
        let mut bad = m.clone();
        bad["origins"] = json!([invalid]);
        assert!(f
            .repo
            .store(STANDARD.encode(BYTES), bad)
            .unwrap_err()
            .starts_with("invalid:"));
    }
    let unrelated = metadata(b"other content", "other");
    let raw = serde_json::to_vec(&json!({"version":1,"metadata":unrelated})).unwrap();
    fs::write(f.record(&m), &raw).unwrap();
    assert!(f.repo.list().unwrap_err().starts_with("corrupt:"));
    assert!(f.repo.store(STANDARD.encode(BYTES), m.clone()).is_err());
    assert_eq!(fs::read(f.record(&m)).unwrap(), raw);
}

#[test]
fn generated_at_requires_real_utc_calendar_date() {
    let f = Fixture::new();
    for date in [
        "2026-02-29T00:00:00Z",
        "2026-09-16T24:00:00Z",
        "+026-09-16T00:00:00Z",
        "2026-09-16T00:00:00+08:00",
    ] {
        let mut m = metadata(BYTES, "invalid-date");
        m["provenance"]["generatedAt"] = json!(date);
        assert!(
            f.repo.store(STANDARD.encode(BYTES), m).is_err(),
            "invalid date {date}"
        );
    }
    let mut m = metadata(BYTES, "leap-date");
    m["provenance"]["generatedAt"] = json!("2024-02-29T00:00:00Z");
    f.save(BYTES, m);
}
