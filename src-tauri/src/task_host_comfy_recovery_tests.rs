use super::*;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

async fn recover(partial_failure: bool) {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let endpoint = format!("http://{}", listener.local_addr().unwrap());
    let history = json!({"original-prompt": {"status": {"completed": !partial_failure, "status_str": if partial_failure { "error" } else { "success" }}, "outputs": {"first": {"images": [{"filename":"result.png","type":"output"}]}}}});
    let server = tokio::spawn(async move {
        let replies = [
            (503, "application/json", b"{}".to_vec()),
            (
                200,
                "application/json",
                serde_json::to_vec(&history).unwrap(),
            ),
            (200, "image/png", b"archived image receipt fixture".to_vec()),
        ];
        let mut requests = Vec::new();
        for (status, mime, body) in replies {
            let (mut socket, _) = listener.accept().await.unwrap();
            let mut bytes = Vec::new();
            loop {
                let mut buffer = [0; 1024];
                let size = socket.read(&mut buffer).await.unwrap();
                assert!(size > 0 && bytes.len() + size <= 16_384);
                bytes.extend_from_slice(&buffer[..size]);
                if bytes.windows(4).any(|value| value == b"\r\n\r\n") {
                    break;
                }
            }
            requests.push(String::from_utf8(bytes).unwrap());
            let headers = format!("HTTP/1.1 {status} fixture\r\nContent-Type: {mime}\r\nConnection: close\r\nContent-Length: {}\r\n\r\n", body.len());
            socket.write_all(headers.as_bytes()).await.unwrap();
            socket.write_all(&body).await.unwrap();
        }
        requests
    });
    let path = std::env::temp_dir().join(format!("kk-comfy-recovery-{}", uuid::Uuid::new_v4()));
    fs::create_dir_all(&path).unwrap();
    let assets = Arc::new(AssetRepository::new(path.join("assets")));
    let host = TaskHost::new(path.join("tasks"), Arc::clone(&assets)).unwrap();
    let receipt = ComfyReceipt {
        endpoint,
        prompt_id: "original-prompt".into(),
        output_node_ids: if partial_failure {
            vec!["first".into(), "failed".into()]
        } else {
            vec!["first".into()]
        },
        model: "ComfyUI".into(),
        provider_name: None,
        prompt_hash: None,
    };
    let indices = if partial_failure { vec![0, 1] } else { vec![0] };
    let journal: JournalRecord = serde_json::from_value(json!({"taskId":"recovered", "idempotencyKey":"original-idempotency", "outputIndices":indices, "status":"submitted", "assetIds":[], "outputs":indices.iter().map(|i| json!({"index":i,"status":"submitted"})).collect::<Vec<_>>(), "updatedAt":1, "fingerprint":"a".repeat(64), "comfyReceipt":receipt})).unwrap();
    host.write_one(&journal).unwrap();
    drop(host);
    let host = Arc::new(TaskHost::new(path.join("tasks"), Arc::clone(&assets)).unwrap());
    assert_eq!(host.get("recovered").unwrap().unwrap().status, "unknown");
    Arc::clone(&host).recover_comfy("recovered").unwrap();
    Arc::clone(&host).recover_comfy("recovered").unwrap();
    tokio::time::timeout(Duration::from_secs(8), async {
        while host.jobs.lock().unwrap().contains_key("recovered") {
            tokio::time::sleep(Duration::from_millis(20)).await;
        }
    })
    .await
    .unwrap();
    let record = host.get("recovered").unwrap().unwrap();
    assert_eq!(
        record.status,
        if partial_failure {
            "failed"
        } else {
            "succeeded"
        }
    );
    assert_eq!(record.outputs[0].status, "succeeded");
    assert_eq!(record.asset_ids.len(), 1);
    assert!(assets.read(&record.asset_ids[0]).unwrap().is_some());
    if partial_failure {
        assert_eq!(record.outputs[1].status, "failed");
    }
    let requests = server.await.unwrap();
    assert!(requests.iter().all(|request| request.starts_with("GET ")
        && !request.to_ascii_lowercase().contains("authorization:")));
    assert!(requests[0].starts_with("GET /history/original-prompt "));
    assert!(requests[1].starts_with("GET /history/original-prompt "));
    drop(host);
    drop(assets);
    fs::remove_dir_all(path).unwrap();
}

#[tokio::test]
async fn restart_and_temporary_history_failure_recover_original_without_a_post() {
    recover(false).await;
}

#[tokio::test]
async fn failed_branch_still_archives_successful_output_after_restart() {
    recover(true).await;
}

#[test]
fn recovery_receipt_rejects_remote_or_unbounded_identity() {
    let mut receipt = ComfyReceipt {
        endpoint: "https://remote.test".into(),
        prompt_id: "original".into(),
        output_node_ids: vec!["save".into()],
        model: "ComfyUI".into(),
        provider_name: None,
        prompt_hash: None,
    };
    assert!(receipt.validate().is_err());
    receipt.endpoint = "http://127.0.0.1:8188".into();
    assert!(receipt.validate().is_ok());
    receipt.prompt_id = "../history/other".into();
    assert!(receipt.validate().is_err());
}
