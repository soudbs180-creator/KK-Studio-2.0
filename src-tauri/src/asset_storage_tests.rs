use super::*;
use base64::{engine::general_purpose::STANDARD, Engine};
use serde_json::json;
use sha2::{Digest, Sha256};
use std::sync::{Arc, Barrier};

#[path = "asset_storage_integrity_tests.rs"]
mod integrity;

thread_local! { static FAILURE: std::cell::RefCell<Option<&'static str>> = const { std::cell::RefCell::new(None) }; }
pub(super) fn fail_at(stage: &str) -> Result<(), String> {
    if FAILURE.with(|f| *f.borrow() == Some(stage)) {
        Err(format!("io: injected {stage}"))
    } else {
        Ok(())
    }
}
struct Fixture {
    root: PathBuf,
    repo: AssetRepository,
}
impl Fixture {
    fn new() -> Self {
        static NEXT: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
        let root = std::env::temp_dir().join(format!(
            "kk-assets-{}-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos(),
            NEXT.fetch_add(1, std::sync::atomic::Ordering::Relaxed)
        ));
        fs::create_dir_all(&root).unwrap();
        let repo = AssetRepository::new(root.clone());
        Self { root, repo }
    }
    fn save(&self, bytes: &[u8], metadata: Value) -> Value {
        self.repo.store(STANDARD.encode(bytes), metadata).unwrap()
    }
    fn record(&self, metadata: &Value) -> PathBuf {
        self.root
            .join("records")
            .join(format!("{}.json", metadata["assetId"].as_str().unwrap()))
    }
    fn blob(&self, metadata: &Value) -> PathBuf {
        self.root
            .join("blobs")
            .join(metadata["sha256"].as_str().unwrap())
    }
}
impl Drop for Fixture {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.root);
    }
}
fn metadata(bytes: &[u8], job: &str) -> Value {
    let hash = format!("{:x}", Sha256::digest(bytes));
    json!({"assetId":format!("asset-{}", &hash[..24]),"sha256":hash,"mime":"image/png","tags":["AI生成"],
        "sourceJobId":job,"promptHash":"prompt-hash","isAiGenerated":true,"source":"provider",
        "provenance":{"provider":"test","model":"test-model","generatedAt":"2026-09-16T00:00:00.000Z","c2paPresent":true,"synthIdSignal":false}})
}
const BYTES: &[u8] = b"synthetic image bytes used only to verify archival";

#[test]
fn metadata_pages_cover_large_archive_without_truncating_full_integrity_list() {
    let f = Fixture::new();
    for index in 0..125 {
        let bytes = format!("synthetic original {index}").into_bytes();
        f.save(&bytes, metadata(&bytes, &format!("job-{index}")));
    }
    fs::write(
        f.root.join("records").join("000-interrupted.tmp"),
        b"partial",
    )
    .unwrap();
    let complete = f.repo.list().unwrap();
    assert_eq!(complete.len(), 125);
    let mut pages = Vec::new();
    for offset in [0, 40, 80, 120] {
        pages.extend(f.repo.list_page(offset, 40).unwrap());
    }
    assert_eq!(pages, complete);
    assert_eq!(f.repo.list_page(0, 999).unwrap().len(), 100);
    assert!(f.repo.list_page(125, 40).unwrap().is_empty());
    let first = &complete[0];
    fs::write(f.blob(first), b"corrupted bytes").unwrap();
    // Metadata navigation does not hash all originals. Every actual read still does.
    assert_eq!(f.repo.list_page(0, 40).unwrap().len(), 40);
    assert!(f
        .repo
        .read(first["assetId"].as_str().unwrap())
        .unwrap_err()
        .starts_with("corrupt:"));
    assert!(f.repo.list().unwrap_err().starts_with("corrupt:"));
    fs::remove_file(f.blob(first)).unwrap();
    assert!(f.repo.list_page(0, 40).unwrap_err().starts_with("missing:"));
}

#[test]
fn stores_raw_blob_and_versioned_metadata_then_reopens_without_preview() {
    let f = Fixture::new();
    let m = metadata(BYTES, "job1");
    assert_eq!(f.save(BYTES, m.clone()), m);
    assert_eq!(fs::read(f.blob(&m)).unwrap(), BYTES);
    let record: Value = serde_json::from_slice(&fs::read(f.record(&m)).unwrap()).unwrap();
    assert_eq!(record["version"], 1);
    assert_eq!(record["metadata"], m);
    assert!(!record.to_string().contains("preview"));
    let reopened = AssetRepository::new(f.root.clone());
    let read = reopened
        .read(m["assetId"].as_str().unwrap())
        .unwrap()
        .unwrap();
    assert_eq!(read.metadata, m);
    assert_eq!(STANDARD.decode(read.data_base64).unwrap(), BYTES);
    assert_eq!(reopened.list().unwrap(), vec![m]);
}

#[test]
fn rejects_untrusted_hash_id_mime_base64_and_sensitive_or_unknown_metadata() {
    let f = Fixture::new();
    let original = metadata(BYTES, "job1");
    for (key, value) in [
        ("sha256", json!("0".repeat(64))),
        ("assetId", json!("../escape")),
        ("mime", json!("image/svg+xml")),
        ("apiKey", json!("secret")),
        ("preview", json!("data:image/png;base64,AAAA")),
        ("path", json!("C:/outside")),
    ] {
        let mut m = original.clone();
        m[key] = value;
        assert!(f
            .repo
            .store(STANDARD.encode(BYTES), m)
            .unwrap_err()
            .starts_with("invalid:"));
    }
    let mut nested = original.clone();
    nested["provenance"]["accessToken"] = json!("secret");
    assert!(f.repo.store(STANDARD.encode(BYTES), nested).is_err());
    assert!(f
        .repo
        .store("not-base64!".into(), original)
        .unwrap_err()
        .starts_with("invalid:"));
    assert!(f
        .repo
        .read("../escape")
        .unwrap_err()
        .starts_with("invalid:"));
    assert!(f.repo.list().unwrap().is_empty());
}

#[test]
fn duplicate_upload_keeps_ai_provenance_and_merges_tags_and_origins() {
    let f = Fixture::new();
    let first = f.save(BYTES, metadata(BYTES, "first"));
    let mut upload = metadata(BYTES, "upload");
    upload["source"] = json!("upload");
    upload["isAiGenerated"] = json!(false);
    upload["tags"] = json!(["local"]);
    upload["provenance"] = json!({"generatedAt":"2026-09-17T00:00:00.000Z"});
    let merged = f.save(BYTES, upload.clone());
    assert_eq!(merged["provenance"], first["provenance"]);
    assert_eq!(merged["sourceJobId"], "first");
    assert_eq!(merged["isAiGenerated"], true);
    assert_eq!(merged["tags"], json!(["AI生成", "local"]));
    assert_eq!(merged["origins"].as_array().unwrap().len(), 2);
    assert_eq!(f.save(BYTES, upload), merged);
    assert_eq!(fs::read_dir(f.root.join("blobs")).unwrap().count(), 1);
}

#[test]
fn ai_metadata_promotes_previous_upload_and_retains_first_ai_afterward() {
    let f = Fixture::new();
    let mut upload = metadata(BYTES, "upload");
    upload["isAiGenerated"] = json!(false);
    upload["source"] = json!("upload");
    f.save(BYTES, upload);
    assert_eq!(
        f.save(BYTES, metadata(BYTES, "first-ai"))["sourceJobId"],
        "first-ai"
    );
    assert_eq!(
        f.save(BYTES, metadata(BYTES, "later-ai"))["sourceJobId"],
        "first-ai"
    );
}

#[test]
fn missing_record_is_none_but_missing_or_corrupt_original_is_error() {
    let f = Fixture::new();
    let m = metadata(BYTES, "job1");
    let id = m["assetId"].as_str().unwrap();
    assert!(f.repo.read(id).unwrap().is_none());
    f.save(BYTES, m.clone());
    fs::remove_file(f.blob(&m)).unwrap();
    assert!(f.repo.read(id).unwrap_err().starts_with("missing:"));
    assert!(f.repo.list().unwrap_err().starts_with("missing:"));
    assert!(f
        .repo
        .store(STANDARD.encode(BYTES), m.clone())
        .unwrap_err()
        .starts_with("missing:"));
    fs::write(f.blob(&m), b"corrupt").unwrap();
    assert!(f.repo.read(id).unwrap_err().starts_with("corrupt:"));
    assert!(f.repo.list().unwrap_err().starts_with("corrupt:"));
    assert!(f
        .repo
        .store(STANDARD.encode(BYTES), m.clone())
        .unwrap_err()
        .starts_with("corrupt:"));
    assert_eq!(fs::read(f.blob(&m)).unwrap(), b"corrupt");
}

#[test]
fn malformed_or_future_record_is_not_replaced_or_hidden() {
    let f = Fixture::new();
    let m = f.save(BYTES, metadata(BYTES, "job1"));
    for (raw, prefix) in [
        (b"{broken".to_vec(), "corrupt:"),
        (
            serde_json::to_vec(&json!({"version":2,"metadata":m})).unwrap(),
            "unsupported:",
        ),
    ] {
        fs::write(f.record(&m), &raw).unwrap();
        assert!(f
            .repo
            .read(m["assetId"].as_str().unwrap())
            .unwrap_err()
            .starts_with(prefix));
        assert!(f.repo.list().unwrap_err().starts_with(prefix));
        assert!(f
            .repo
            .store(STANDARD.encode(BYTES), m.clone())
            .unwrap_err()
            .starts_with(prefix));
        assert_eq!(fs::read(f.record(&m)).unwrap(), raw);
    }
}

#[test]
fn failed_metadata_commit_preserves_previous_record_and_durable_blob() {
    let f = Fixture::new();
    let m = f.save(BYTES, metadata(BYTES, "job1"));
    let old = fs::read(f.record(&m)).unwrap();
    for stage in ["record-before-sync", "record-before-commit"] {
        FAILURE.with(|flag| *flag.borrow_mut() = Some(stage));
        let result = f
            .repo
            .store(STANDARD.encode(BYTES), metadata(BYTES, "job2"));
        FAILURE.with(|flag| *flag.borrow_mut() = None);
        assert!(result.unwrap_err().starts_with("io:"));
        assert_eq!(fs::read(f.record(&m)).unwrap(), old);
        assert_eq!(fs::read(f.blob(&m)).unwrap(), BYTES);
        assert_eq!(fs::read_dir(f.root.join("records")).unwrap().count(), 1);
    }
}

#[test]
fn failed_first_commit_does_not_create_record_and_retry_reuses_verified_orphan_blob() {
    let f = Fixture::new();
    let m = metadata(BYTES, "job1");
    FAILURE.with(|flag| *flag.borrow_mut() = Some("record-before-commit"));
    let result = f.repo.store(STANDARD.encode(BYTES), m.clone());
    FAILURE.with(|flag| *flag.borrow_mut() = None);
    assert!(result.is_err());
    assert!(!f.record(&m).exists());
    assert_eq!(fs::read(f.blob(&m)).unwrap(), BYTES);
    assert_eq!(f.save(BYTES, m.clone()), m);
}

#[test]
fn concurrent_writers_on_one_repository_keep_all_origins() {
    let f = Fixture::new();
    let repo = Arc::new(AssetRepository::new(f.root.clone()));
    let barrier = Arc::new(Barrier::new(8));
    let workers: Vec<_> = (0..8)
        .map(|i| {
            let repo = repo.clone();
            let barrier = barrier.clone();
            std::thread::spawn(move || {
                barrier.wait();
                repo.store(STANDARD.encode(BYTES), metadata(BYTES, &format!("job{i}")))
                    .unwrap();
            })
        })
        .collect();
    for worker in workers {
        worker.join().unwrap();
    }
    let list = f.repo.list().unwrap();
    assert_eq!(list.len(), 1);
    assert_eq!(list[0]["origins"].as_array().unwrap().len(), 8);
}

#[test]
fn empty_and_oversize_payloads_are_rejected_before_persistence() {
    let f = Fixture::new();
    assert!(f
        .repo
        .store(String::new(), metadata(b"", "empty"))
        .unwrap_err()
        .starts_with("invalid:"));
    let oversized = "A".repeat((100 * 1024 * 1024 / 3 + 1) * 4 + 4);
    assert!(f
        .repo
        .store(oversized, metadata(BYTES, "large"))
        .unwrap_err()
        .starts_with("invalid:"));
    assert!(f.repo.list().unwrap().is_empty());
}
