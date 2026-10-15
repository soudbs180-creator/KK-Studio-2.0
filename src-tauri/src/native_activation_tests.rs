use super::*;
use crate::native_root_authority::tests::Fixture;
use serde_json::json;
use std::sync::atomic::{AtomicUsize, Ordering};

#[tokio::test]
async fn activation_requires_native_shape_identity_epoch_and_ready_focus() {
    let f = Fixture::new();
    let server = ActivationServer::start(f.owner()).await.unwrap();
    let client = reqwest::Client::builder().no_proxy().build().unwrap();
    let base = format!("http://127.0.0.1:{}", server.descriptor.port);
    let request = json!({"repositoryId": server.descriptor.repository_id, "authorityEpoch": server.descriptor.authority_epoch});
    let calls = Arc::new(AtomicUsize::new(0));
    let counted = Arc::clone(&calls);
    server
        .focus
        .register(Arc::new(move || {
            counted.fetch_add(1, Ordering::SeqCst);
            Ok(())
        }))
        .unwrap();
    let health: Value = client
        .get(format!("{base}/health"))
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    assert_eq!(health["repositoryId"], request["repositoryId"]);
    assert!(health.get("root").is_none());
    for (header, value) in [
        ("Origin", "https://kkai.plus"),
        ("Sec-Fetch-Site", "none"),
        ("Host", "evil.invalid"),
    ] {
        let response = client
            .post(format!("{base}/activate"))
            .header(header, value)
            .json(&request)
            .send()
            .await
            .unwrap();
        assert_eq!(response.status(), 403);
        assert!(!response
            .headers()
            .contains_key("access-control-allow-origin"));
    }
    for payload in [
        json!({"repositoryId":request["repositoryId"],"authorityEpoch":"0".repeat(32)}),
        json!({"repositoryId":request["repositoryId"],"authorityEpoch":request["authorityEpoch"],"path":"C:/private"}),
        json!({}),
    ] {
        assert!(!client
            .post(format!("{base}/activate"))
            .json(&payload)
            .send()
            .await
            .unwrap()
            .status()
            .is_success());
    }
    assert_eq!(
        client
            .post(format!("{base}/activate"))
            .header("Content-Type", "application/json")
            .body("x".repeat(2048))
            .send()
            .await
            .unwrap()
            .status(),
        413
    );
    assert_eq!(
        client
            .post(format!("{base}/activate?path=anything"))
            .json(&request)
            .send()
            .await
            .unwrap()
            .status(),
        400
    );
    assert_eq!(
        client
            .get(format!("{base}/snapshot"))
            .send()
            .await
            .unwrap()
            .status(),
        404
    );
    assert_eq!(calls.load(Ordering::SeqCst), 0);
    activate_existing(&f.0, Duration::from_secs(2))
        .await
        .unwrap();
    assert_eq!(calls.load(Ordering::SeqCst), 1);
    server.shutdown().await;
}

#[tokio::test]
async fn secondary_queues_one_focus_before_ui_is_ready_without_recovery() {
    let f = Fixture::new();
    let owner = f.owner();
    let journal = f.0.join("tasks/native-host/submitted-fixture.json");
    let raw = serde_json::to_vec(&json!({"taskId":"submitted-fixture","idempotencyKey":"submitted-fixture-idem","outputIndices":[0],"status":"submitted","assetIds":[],"outputs":[{"index":0,"status":"submitted"}],"updatedAt":1,"fingerprint":"a".repeat(64)})).unwrap();
    fs::write(&journal, &raw).unwrap();
    let server = ActivationServer::start(owner).await.unwrap();
    let calls = Arc::new(AtomicUsize::new(0));
    let root = f.0.clone();
    let first = tokio::spawn(async move { activate_existing(&root, Duration::from_secs(3)).await });
    let root = f.0.clone();
    let second =
        tokio::spawn(async move { activate_existing(&root, Duration::from_secs(3)).await });
    tokio::time::sleep(Duration::from_millis(80)).await;
    assert!(!first.is_finished());
    let counted = Arc::clone(&calls);
    server
        .focus
        .register(Arc::new(move || {
            counted.fetch_add(1, Ordering::SeqCst);
            Ok(())
        }))
        .unwrap();
    first.await.unwrap().unwrap();
    second.await.unwrap().unwrap();
    assert_eq!(calls.load(Ordering::SeqCst), 1);
    assert_eq!(fs::read(journal).unwrap(), raw);
    server.shutdown().await;
}

#[tokio::test]
async fn stale_descriptor_and_owner_startup_wait_fail_closed_and_bounded() {
    let f = Fixture::new();
    let owner = f.owner();
    let started = std::time::Instant::now();
    assert!(activate_existing(&f.0, Duration::from_millis(80))
        .await
        .is_err());
    assert!(started.elapsed() < Duration::from_secs(1));
    let server = ActivationServer::start(Arc::clone(&owner)).await.unwrap();
    let path = f.0.join("app/authority-endpoint.json");
    let mut descriptor = serde_json::to_value(&server.descriptor).unwrap();
    descriptor["authorityEpoch"] = json!("f".repeat(32));
    fs::write(&path, serde_json::to_vec(&descriptor).unwrap()).unwrap();
    assert!(activate_existing(&f.0, Duration::from_millis(100))
        .await
        .is_err());
    assert!(NativeRootAuthority::elect(&f.paths()).unwrap().is_none());
    assert!(fs::read_dir(f.0.join("tasks/native-host"))
        .unwrap()
        .all(|entry| entry
            .unwrap()
            .path()
            .extension()
            .map_or(true, |extension| extension != "json")));
    server.shutdown().await;
}

#[tokio::test]
async fn focus_failure_returns_fixed_safe_error() {
    let f = Fixture::new();
    let server = ActivationServer::start(f.owner()).await.unwrap();
    server
        .focus
        .register(Arc::new(|| Err("private C:/user API_KEY".into())))
        .unwrap();
    let error = activate_existing(&f.0, Duration::from_secs(1))
        .await
        .unwrap_err();
    assert!(!error.contains("API_KEY"));
    assert!(!error.contains("C:/user"));
    server.shutdown().await;
}
