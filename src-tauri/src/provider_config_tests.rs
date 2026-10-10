use super::*;
use serde_json::json;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;

static NEXT: AtomicU64 = AtomicU64::new(0);

fn temp_repository(label: &str) -> (PathBuf, Arc<ProviderConfigRepository>) {
    let root = std::env::temp_dir().join(format!(
        "kk-provider-config-{label}-{}-{}-{}",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos(),
        NEXT.fetch_add(1, Ordering::Relaxed)
    ));
    fs::create_dir_all(&root).expect("create temp root");
    (
        root.clone(),
        Arc::new(ProviderConfigRepository::new(root.join("connections.json"))),
    )
}

fn connection(overrides: serde_json::Map<String, Value>) -> Value {
    let mut entry = json!({
        "id": "my-openai",
        "provider": "OpenAI 兼容",
        "kind": "user_byok",
        "displayName": "我的 API",
        "baseUrl": "https://api.example.com/v1",
        "credentialRef": "provider-abc123",
        "model": "gpt-5.5",
        "capabilities": { "modalities": ["text"], "operations": ["generate"], "async": false },
        "state": "active",
        "concurrencyLimit": 2,
        "verificationStatus": "unverified"
    });
    if let Some(object) = entry.as_object_mut() {
        for (key, value) in overrides {
            object.insert(key, value);
        }
    }
    entry
}

#[test]
fn missing_then_roundtrip() {
    let (_root, repo) = temp_repository("roundtrip");
    let read = repo.read().expect("read missing");
    assert_eq!(read.status, "missing");
    assert_eq!(read.revision, None);
    assert_eq!(read.connections, json!([]));

    let connections = json!([connection(serde_json::Map::new())]);
    let revision = repo.write(connections.clone(), None).expect("write");
    assert_eq!(revision, 1);

    let read = repo.read().expect("read loaded");
    assert_eq!(read.status, "loaded");
    assert_eq!(read.revision, Some(1));
    assert_eq!(read.connections, connections);

    let next = repo.write(connections.clone(), Some(1)).expect("write again");
    assert_eq!(next, 2);
}

#[test]
fn conflict_rejects_without_overwriting() {
    let (_root, repo) = temp_repository("conflict");
    let connections = json!([connection(serde_json::Map::new())]);
    repo.write(connections.clone(), None).expect("first write");

    let error = repo
        .write(connections.clone(), Some(99))
        .expect_err("stale revision must conflict");
    assert!(error.starts_with("conflict:"), "unexpected error: {error}");

    let read = repo.read().expect("original preserved");
    assert_eq!(read.revision, Some(1));
    assert_eq!(read.connections, connections);
}

#[test]
fn corrupt_main_recovers_from_backup() {
    let (_root, repo) = temp_repository("recovery");
    let first = json!([connection(serde_json::Map::new())]);
    repo.write(first.clone(), None).expect("first write");
    let second = json!([connection(
        serde_json::from_str(r#"{"model":"gpt-6"}"#).expect("override")
    )]);
    repo.write(second.clone(), Some(1)).expect("second write");

    // Corrupt the main file; the backup must carry the previous successful value.
    fs::write(&repo.path, b"not json at all").expect("corrupt main");

    let read = repo.read().expect("recovered from backup");
    assert_eq!(read.status, "recovered");
    assert_eq!(read.revision, Some(1));
    assert_eq!(read.connections, first);
}

#[test]
fn secret_fields_are_rejected_before_write() {
    let (_root, repo) = temp_repository("secrets");
    let leaked = json!([connection(serde_json::from_str(
        r#"{"apiKey":"sk-abcdef1234567890"}"#
    )
    .expect("override"))]);
    let error = repo
        .write(leaked, None)
        .expect_err("secret field must be rejected");
    assert!(error.starts_with("unsupported:"), "unexpected error: {error}");
    assert!(!repo.path.exists(), "no file may be written");

    let lowercase = json!([connection(serde_json::from_str(
        r#"{"token":"t-1"}"#
    )
    .expect("override"))]);
    let error = repo
        .write(lowercase, None)
        .expect_err("token field must be rejected");
    assert!(error.starts_with("unsupported:"));
    assert!(!repo.path.exists());
}

#[test]
fn malformed_shape_is_rejected() {
    let (_root, repo) = temp_repository("malformed");
    let error = repo
        .write(json!({"connections": "not-an-array"}), None)
        .expect_err("non-array connections must be rejected");
    assert!(error.starts_with("corrupt:"));
    assert!(!repo.path.exists());
}

#[test]
fn credential_ref_and_metadata_pass_through() {
    let (_root, repo) = temp_repository("metadata");
    let mut map = serde_json::Map::new();
    map.insert(
        "credentialRef".to_string(),
        json!("provider-abc123"),
    );
    let connections = json!([connection(map)]);
    let revision = repo.write(connections.clone(), None).expect("write");
    assert_eq!(revision, 1);
    let read = repo.read().expect("read");
    let saved = read.connections.as_array().expect("array").first().expect("entry");
    assert_eq!(
        saved.get("credentialRef").and_then(Value::as_str),
        Some("provider-abc123")
    );
    assert!(read.connections.to_string().contains("provider-abc123"));
}
