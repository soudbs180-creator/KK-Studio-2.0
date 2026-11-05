use super::*;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

#[test]
fn media_receipt_rejects_credential_echo_and_encoded_query_before_retention() {
    let secret = "fixture-secret";
    for value in [
        "fixture-secret".to_owned(),
        "https://cdn.12ai.org/x?token=fixture-secret".to_owned(),
        "https://cdn.12ai.org/x?token=%66ixture-secret".to_owned(),
    ] {
        assert!(credential_echo(&value, secret));
    }
    assert!(!credential_echo("job-safe", secret));
    assert!(!credential_echo(
        "https://cdn.12ai.org/x?signature=opaque",
        secret
    ));
    assert!(safe_speech_request_id(secret, secret).is_none());
    assert_eq!(
        safe_speech_request_id("request-safe", secret).as_deref(),
        Some("request-safe")
    );
    for payload in [
        json!({"id":secret,"status":"queued"}),
        json!({"id":"job-safe","status":"completed","outputs":["https://cdn.12ai.org/x?token=fixture-secret"]}),
    ] {
        let error = check_receipt_credentials(&payload, secret).unwrap_err();
        assert!(error.request_started);
        assert!(!error.failure.message.contains(secret));
    }
}

#[tokio::test]
async fn recovered_credential_echo_is_rejected_before_any_query() {
    let (root, _, host) = fixture();
    let req = request("video");
    let journal = journal(&req);
    host.write_one(&journal).unwrap();
    let receipt: VideoReceipt = serde_json::from_value(json!({"endpoint":"https://api.12ai.org/v1","model":req.model,"credentialRef":"fixture","slots":[{"index":0,"acceptance":"accepted","jobId":"fixture-secret"}]})).unwrap();
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let base =
        reqwest::Url::parse(&format!("http://{}/v1", listener.local_addr().unwrap())).unwrap();
    let result = host
        .poll_video_receipt(
            &journal.record,
            &journal.fingerprint,
            &control(),
            &receipt,
            &Client::builder().no_proxy().build().unwrap(),
            &base,
            "fixture-secret",
        )
        .await;
    assert!(result.is_err());
    assert!(
        tokio::time::timeout(Duration::from_millis(30), listener.accept())
            .await
            .is_err()
    );
    fs::remove_dir_all(root).unwrap();
}

#[tokio::test]
async fn echoed_submit_identifier_is_never_persisted_or_polled() {
    let (root, _, host) = fixture();
    let req = request("video");
    let journal = journal(&req);
    host.write_one(&journal).unwrap();
    let (base, server) = serve(vec![(
        200,
        "application/json",
        br#"{"id":"fixture-secret","status":"queued"}"#.to_vec(),
    )])
    .await;
    let result = host
        .perform_video(
            &req,
            &journal.fingerprint,
            &control(),
            &Client::builder().no_proxy().build().unwrap(),
            &base,
            "fixture-secret",
        )
        .await;
    assert!(result.is_err());
    assert!(
        !String::from_utf8_lossy(&fs::read(host.path(&req.task_id)).unwrap())
            .contains("fixture-secret")
    );
    assert_eq!(server.await.unwrap().len(), 1);
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn full_protocol_job_identifiers_archive_and_read_back_without_truncation() {
    for length in [200, 201, 240] {
        let (root, assets, host) = fixture();
        let req = request("video");
        let journal = journal(&req);
        host.write_one(&journal).unwrap();
        let job_id = "j".repeat(length);
        let receipt: VideoReceipt = serde_json::from_value(json!({"endpoint":"https://api.12ai.org/v1","model":req.model,"credentialRef":"fixture","slots":[{"index":0,"acceptance":"accepted","jobId":job_id}]})).unwrap();
        receipt.validate(&journal.record).unwrap();
        let bytes = b"0000ftypisom";
        let id = expect_ok(host.archive_media(
            &req.task_id,
            &journal.fingerprint,
            0,
            bytes,
            receipt.metadata(&req.task_id, bytes, "video/mp4", &job_id),
        ));
        assert_eq!(
            assets.read(&id).unwrap().unwrap().metadata["provenance"]["providerRequestId"],
            job_id
        );
        fs::remove_dir_all(root).unwrap();
    }
    assert!(!valid_job_id(&"j".repeat(241)));
}

fn request(kind: &str) -> TaskHostRequest {
    serde_json::from_value(json!({"taskId":"media-fixture","idempotencyKey":"media-idem","kind":kind,"baseUrl":if kind=="video" {"https://api.12ai.org/v1"} else {"http://127.0.0.1:1/v1"},"credentialRef":"fixture","model":if kind=="video" {"veo-3.1-generate-preview"} else {"tts-1"},"prompt":"synthetic fixture","outputIndices":[0],"media":if kind=="video" {json!({"kind":"video","duration":6,"aspectRatio":"16:9","resolution":"1080p","audio":false})} else {json!({"kind":"audio","voice":"coral","format":"mp3","speed":1.25})}})).unwrap()
}
fn control() -> JobControl {
    JobControl {
        cancelled: Arc::new(AtomicBool::new(false)),
        wake: Arc::new(Notify::new()),
        capacity_key: "fixture".into(),
    }
}
fn fixture() -> (PathBuf, Arc<AssetRepository>, Arc<TaskHost>) {
    let root = std::env::temp_dir().join(format!("kk-media-{}", uuid::Uuid::new_v4()));
    fs::create_dir_all(&root).unwrap();
    let assets = Arc::new(AssetRepository::new(root.join("assets")));
    let host = Arc::new(TaskHost::new(root.join("tasks"), Arc::clone(&assets)).unwrap());
    (root, assets, host)
}
fn journal(request: &TaskHostRequest) -> JournalRecord {
    serde_json::from_value(json!({"taskId":request.task_id,"idempotencyKey":request.idempotency_key,"outputIndices":request.output_indices,"outputs":request.output_indices.iter().map(|i|json!({"index":i,"status":"submitted"})).collect::<Vec<_>>(),"assetIds":[],"status":"submitted","updatedAt":1,"fingerprint":fingerprint(request).unwrap()})).unwrap()
}
async fn serve(
    replies: Vec<(u16, &'static str, Vec<u8>)>,
) -> (reqwest::Url, tokio::task::JoinHandle<Vec<Vec<u8>>>) {
    serve_observe(replies, |_| {}).await
}
async fn serve_observe(
    replies: Vec<(u16, &'static str, Vec<u8>)>,
    observe: impl Fn(&[u8]) + Send + 'static,
) -> (reqwest::Url, tokio::task::JoinHandle<Vec<Vec<u8>>>) {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let base =
        reqwest::Url::parse(&format!("http://{}/v1", listener.local_addr().unwrap())).unwrap();
    let server = tokio::spawn(async move {
        let mut requests = Vec::new();
        for (status, mime, body) in replies {
            let (mut socket, _) = listener.accept().await.unwrap();
            let mut raw = Vec::new();
            loop {
                let mut buffer = [0; 4096];
                let n = socket.read(&mut buffer).await.unwrap();
                assert!(n > 0 && raw.len() + n < 1024 * 1024);
                raw.extend_from_slice(&buffer[..n]);
                if let Some(end) = raw.windows(4).position(|v| v == b"\r\n\r\n") {
                    let headers = String::from_utf8_lossy(&raw[..end]).to_lowercase();
                    let len = headers
                        .lines()
                        .find_map(|line| line.strip_prefix("content-length: "))
                        .map(|s| s.parse::<usize>().unwrap())
                        .unwrap_or(0);
                    if raw.len() >= end + 4 + len {
                        break;
                    }
                }
            }
            observe(&raw);
            requests.push(raw);
            let headers=format!("HTTP/1.1 {status} fixture\r\nContent-Type: {mime}\r\nConnection: close\r\nContent-Length: {}\r\n\r\n",body.len());
            socket.write_all(headers.as_bytes()).await.unwrap();
            socket.write_all(&body).await.unwrap();
        }
        requests
    });
    (base, server)
}

#[tokio::test]
async fn video_receipts_survive_restart_and_completed_slots_never_resubmit() {
    let (root, assets, host) = fixture();
    let mut req = request("video");
    req.output_indices = vec![0, 1];
    let original = journal(&req);
    host.write_one(&original).unwrap();
    let journal_path = host.path(&req.task_id);
    let (base, server) = serve_observe(
        vec![
            (
                200,
                "application/json",
                br#"{"id":"job-0","status":"queued"}"#.to_vec(),
            ),
            (
                200,
                "application/json",
                br#"{"id":"job-1","status":"queued"}"#.to_vec(),
            ),
            (503, "application/json", b"{}".to_vec()),
        ],
        move |raw| {
            if raw.starts_with(b"GET ") {
                let persisted: Value =
                    serde_json::from_slice(&fs::read(&journal_path).unwrap()).unwrap();
                assert_eq!(
                    persisted["videoReceipt"]["endpoint"],
                    "https://api.12ai.org/v1"
                );
                assert_eq!(persisted["videoReceipt"]["slots"][0]["jobId"], "job-0");
                assert_eq!(persisted["videoReceipt"]["slots"][1]["jobId"], "job-1");
                assert!(!String::from_utf8_lossy(&fs::read(&journal_path).unwrap())
                    .contains("fixture-secret"));
            }
        },
    )
    .await;
    let ctl = control();
    let result = host
        .perform_video(
            &req,
            &original.fingerprint,
            &ctl,
            &Client::builder().no_proxy().build().unwrap(),
            &base,
            "fixture-secret",
        )
        .await;
    assert!(result.is_err());
    host.finish_run(&req.task_id, &original.fingerprint, ctl, result);
    let requests = server.await.unwrap();
    assert_eq!(
        requests
            .iter()
            .filter(|r| r.starts_with(b"POST /v1/task/submit "))
            .count(),
        2
    );
    assert!(requests[2].starts_with(b"GET /v1/task/job-0 "));
    drop(host);
    let host = Arc::new(TaskHost::new(root.join("tasks"), Arc::clone(&assets)).unwrap());
    let saved = host.read_one(&req.task_id).unwrap().unwrap();
    assert_eq!(saved.record.status, "unknown");
    let receipt = saved.video_receipt.unwrap();
    let bytes = b"0000ftypisomfixture";
    let id = expect_ok(host.archive_media(
        &req.task_id,
        &original.fingerprint,
        0,
        bytes,
        receipt.metadata(&req.task_id, bytes, "video/mp4", "job-0"),
    ));
    assert_eq!(
        assets.read(&id).unwrap().unwrap().metadata["mime"],
        "video/mp4"
    );
    let record = host.get(&req.task_id).unwrap().unwrap();
    let (base, server) = serve(vec![(
        200,
        "application/json",
        br#"{"id":"job-1","status":"failed","error":"synthetic failure"}"#.to_vec(),
    )])
    .await;
    let ctl = control();
    let result = host
        .poll_video_receipt(
            &record,
            &original.fingerprint,
            &ctl,
            &receipt,
            &Client::builder().no_proxy().build().unwrap(),
            &base,
            "fixture-secret",
        )
        .await;
    assert!(result.is_err());
    host.finish_run(&req.task_id, &original.fingerprint, ctl, result);
    let requests = server.await.unwrap();
    assert_eq!(requests.len(), 1);
    assert!(requests[0].starts_with(b"GET /v1/task/job-1 "));
    let record = host.get(&req.task_id).unwrap().unwrap();
    assert_eq!(record.status, "failed");
    assert_eq!(record.outputs[0].asset_id.as_deref(), Some(id.as_str()));
    assert_eq!(record.outputs[1].status, "failed");
    assert_eq!(
        Arc::clone(&host).submit(req.clone()).await.unwrap().status,
        "failed"
    );
    assert_eq!(
        Arc::clone(&host).submit(req).await.unwrap().status,
        "failed"
    );
    fs::remove_dir_all(root).unwrap();
}

#[tokio::test]
async fn video_cancel_after_acceptance_is_unknown_and_does_not_resume_automatically() {
    let (root, _assets, host) = fixture();
    let req = request("video");
    let journal = journal(&req);
    host.write_one(&journal).unwrap();
    let ctl = control();
    let cancel = ctl.cancelled.clone();
    let wake = ctl.wake.clone();
    let (base, server) = serve_observe(
        vec![
            (
                200,
                "application/json",
                br#"{"id":"job-cancel","status":"queued"}"#.to_vec(),
            ),
            (
                200,
                "application/json",
                br#"{"id":"job-cancel","status":"processing"}"#.to_vec(),
            ),
        ],
        move |raw| {
            if raw.starts_with(b"GET ") {
                cancel.store(true, Ordering::Release);
                wake.notify_waiters();
            }
        },
    )
    .await;
    let result = host
        .perform_video(
            &req,
            &journal.fingerprint,
            &ctl,
            &Client::builder().no_proxy().build().unwrap(),
            &base,
            "fixture-secret",
        )
        .await;
    assert!(result.is_err());
    host.finish_run(&req.task_id, &journal.fingerprint, ctl, result);
    let record = host.get(&req.task_id).unwrap().unwrap();
    assert_eq!(record.status, "unknown");
    assert_eq!(record.failure.unwrap().failure_class, "cancelled");
    Arc::clone(&host).recover_comfy(&req.task_id).unwrap();
    assert!(host.jobs.lock().unwrap().is_empty());
    let requests = server.await.unwrap();
    assert_eq!(requests.len(), 2);
    assert!(!requests.iter().any(|r| r.starts_with(b"DELETE ")));
    fs::remove_dir_all(root).unwrap();
}

#[tokio::test]
async fn video_unknown_submit_is_claimed_before_post_and_never_retried() {
    let (root, _assets, host) = fixture();
    let req = request("video");
    let journal = journal(&req);
    host.write_one(&journal).unwrap();
    let journal_path = host.path(&req.task_id);
    let (base, server) = serve_observe(
        vec![(
            200,
            "application/json",
            br#"{"id":"invalid id","status":"queued"}"#.to_vec(),
        )],
        move |_| {
            let raw: Value = serde_json::from_slice(&fs::read(&journal_path).unwrap()).unwrap();
            assert_eq!(raw["videoReceipt"]["slots"][0]["acceptance"], "unknown");
            assert!(raw["videoReceipt"]["slots"][0].get("jobId").is_none());
        },
    )
    .await;
    let ctl = control();
    let result = host
        .perform_video(
            &req,
            &journal.fingerprint,
            &ctl,
            &Client::builder().no_proxy().build().unwrap(),
            &base,
            "fixture-secret",
        )
        .await;
    assert!(result.as_ref().err().unwrap().request_started);
    host.finish_run(&req.task_id, &journal.fingerprint, ctl, result);
    assert_eq!(
        Arc::clone(&host).submit(req.clone()).await.unwrap().status,
        "unknown"
    );
    Arc::clone(&host).recover_comfy(&req.task_id).unwrap();
    assert!(host.jobs.lock().unwrap().is_empty());
    assert_eq!(server.await.unwrap().len(), 1);
    fs::remove_dir_all(root).unwrap();
}

#[tokio::test]
async fn video_failure_does_not_abandon_other_accepted_slots() {
    let (root, _assets, host) = fixture();
    let mut req = request("video");
    req.output_indices = vec![0, 1];
    let mut journal = journal(&req);
    journal.video_receipt=Some(serde_json::from_value(json!({"endpoint":"https://api.12ai.org/v1","model":req.model,"credentialRef":"fixture","slots":[{"index":0,"acceptance":"accepted","jobId":"failed-0"},{"index":1,"acceptance":"accepted","jobId":"failed-1"}]})).unwrap());
    host.write_one(&journal).unwrap();
    let receipt = journal.video_receipt.unwrap();
    let (base, server) = serve(vec![
        (
            200,
            "application/json",
            br#"{"id":"failed-0","status":"failed"}"#.to_vec(),
        ),
        (
            200,
            "application/json",
            br#"{"id":"failed-1","status":"failed"}"#.to_vec(),
        ),
    ])
    .await;
    let ctl = control();
    let result = host
        .poll_video_receipt(
            &journal.record,
            &journal.fingerprint,
            &ctl,
            &receipt,
            &Client::builder().no_proxy().build().unwrap(),
            &base,
            "fixture-secret",
        )
        .await;
    assert!(result.is_err());
    assert_eq!(
        host.get(&req.task_id).unwrap().unwrap().outputs[0].status,
        "failed"
    );
    host.finish_run(&req.task_id, &journal.fingerprint, ctl, result);
    assert_eq!(server.await.unwrap().len(), 2);
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn video_and_audio_reference_limits_are_explicit() {
    let mut req = request("video");
    req.attachments = serde_json::from_value(
        json!([{"assetId":"asset-1","name":"ref.png","mime":"image/png","role":"构图"}]),
    )
    .unwrap();
    assert!(validate_request(&req).is_ok());
    req.model = "veo-3.1-fast-generate-preview".into();
    assert!(validate_request(&req).is_err());
    req.model = "veo-3.1-generate-preview".into();
    req.attachments = vec![req.attachments[0].clone(); 4];
    assert!(validate_request(&req).is_err());
    req.attachments.truncate(1);
    req.attachments[0].mime = Some("video/mp4".into());
    assert!(validate_request(&req).is_err());
    let mut audio = request("audio");
    audio.attachments = req.attachments;
    assert!(validate_request(&audio).is_err());
    audio.attachments.clear();
    for media in [
        json!({"kind":"audio","voice":"custom","format":"mp3","speed":1}),
        json!({"kind":"audio","voice":"alloy","format":"opus","speed":1}),
        json!({"kind":"audio","voice":"alloy","format":"mp3","speed":0.24}),
        json!({"kind":"audio","voice":"alloy","format":"mp3","speed":4.01}),
    ] {
        audio.media = Some(serde_json::from_value(media).unwrap());
        assert!(validate_request(&audio).is_err());
    }
}

#[tokio::test]
async fn bounded_media_reads_reject_empty_and_oversized_responses() {
    for bytes in [Vec::new(), b"five!".to_vec()] {
        let (base, server) = serve(vec![(200, "audio/mpeg", bytes)]).await;
        let response = Client::builder()
            .no_proxy()
            .build()
            .unwrap()
            .get(base)
            .send()
            .await
            .unwrap();
        assert!(read_bounded(response, 4, &control()).await.is_err());
        server.await.unwrap();
    }
}

#[tokio::test]
async fn archived_mime_mismatch_fails_before_any_provider_connection() {
    let (root, assets, host) = fixture();
    let mut req = request("video");
    let bytes = b"ID3audio-reference";
    let asset = assets
        .store(
            STANDARD.encode(bytes),
            image_output_metadata(&req, bytes, "audio/mpeg", &None),
        )
        .unwrap();
    req.attachments = serde_json::from_value(
        json!([{"assetId":asset["assetId"],"name":"reference.png","mime":"image/png"}]),
    )
    .unwrap();
    let error = host
        .perform(&req, &fingerprint(&req).unwrap(), &control())
        .await
        .err()
        .unwrap();
    assert!(!error.request_started);
    assert_eq!(error.failure.failure_class, "invalid_request");
    fs::remove_dir_all(root).unwrap();
}

#[tokio::test]
async fn audio_archive_failure_remains_unknown_and_does_not_retry_post() {
    let (root, assets, host) = fixture();
    let (base, server) = serve(vec![(200, "audio/mpeg", b"ID3archive-fixture".to_vec())]).await;
    let mut req = request("audio");
    req.base_url = base.to_string();
    let journal = journal(&req);
    host.write_one(&journal).unwrap();
    fs::write(root.join("assets"), b"cannot create asset directory").unwrap();
    let ctl = control();
    let result = host
        .perform_media(
            &req,
            &journal.fingerprint,
            &ctl,
            Client::builder().no_proxy().build().unwrap(),
            "fixture-secret",
        )
        .await;
    assert!(result.as_ref().err().unwrap().request_started);
    host.finish_run(&req.task_id, &journal.fingerprint, ctl, result);
    assert_eq!(
        Arc::clone(&host).submit(req).await.unwrap().status,
        "unknown"
    );
    assert_eq!(server.await.unwrap().len(), 1);
    assert!(assets.list().is_err());
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn video_urls_and_receipts_reject_credentials_private_hosts_and_rebinding() {
    for url in [
        "https://127.0.0.1/media",
        "https://10.0.0.1/media",
        "https://[::1]/media",
        "https://metadata.internal/media",
        "https://user:secret@cdn.12ai.org/media",
        "https://cdn.12ai.org:444/media",
        "https://cdn.12ai.org/media#fragment",
        "http://cdn.12ai.org/media",
    ] {
        assert!(result_url(url).is_err());
    }
    for url in [
        "https://api.12ai.org.evil.com/v1",
        "https://api.12ai.org/v2",
        "https://api.12ai.org/v1?secret=x",
        "http://127.0.0.1/v1",
    ] {
        assert!(video_base(url).is_err());
    }
    let req = request("video");
    let record = journal(&req).record;
    let base = json!({"endpoint":"https://api.12ai.org/v1","model":req.model,"credentialRef":"fixture","slots":[{"index":0,"acceptance":"accepted","jobId":"original-id"}]});
    let mut extra = base.clone();
    extra["prompt"] = json!("must not persist prompt");
    assert!(serde_json::from_value::<VideoReceipt>(extra).is_err());
    for slots in [
        json!([{"index":1,"acceptance":"accepted","jobId":"original-id"}]),
        json!([{"index":0,"acceptance":"accepted"}]),
        json!([{"index":0,"acceptance":"unknown","jobId":"original-id"}]),
    ] {
        let mut bad = base.clone();
        bad["slots"] = slots;
        assert!(serde_json::from_value::<VideoReceipt>(bad)
            .unwrap()
            .validate(&record)
            .is_err());
    }
}

#[test]
fn video_recovery_reuses_connection_capacity_before_spawning() {
    let (root, _assets, host) = fixture();
    let req = request("video");
    let mut journal = journal(&req);
    journal.record.status = "unknown".into();
    journal.video_receipt=Some(serde_json::from_value(json!({"endpoint":"https://api.12ai.org/v1","model":req.model,"credentialRef":"fixture","slots":[{"index":0,"acceptance":"accepted","jobId":"original-id"}]})).unwrap());
    host.write_one(&journal).unwrap();
    host.jobs
        .lock()
        .unwrap()
        .insert("already-active".into(), control());
    Arc::clone(&host).recover_comfy(&req.task_id).unwrap();
    assert_eq!(host.jobs.lock().unwrap().len(), 1);
    assert_eq!(host.get(&req.task_id).unwrap().unwrap().status, "unknown");
    fs::remove_dir_all(root).unwrap();
}

#[tokio::test]
async fn result_download_sends_no_credentials_and_rejects_redirects() {
    for (status, mime) in [
        (200, "video/mp4"),
        (302, "video/mp4\r\nLocation: http://127.0.0.1:1/redirected"),
    ] {
        let bytes = b"0000ftypisomdownload-fixture".to_vec();
        let (base, server) = serve(vec![(status, mime, bytes.clone())]).await;
        let client = pinned_download_client(&base).await.unwrap();
        let result = download_video(&client, base, &control()).await;
        if status == 200 {
            assert_eq!(expect_ok(result).0, bytes);
        } else {
            assert!(result.is_err());
        }
        let requests = server.await.unwrap();
        assert_eq!(requests.len(), 1);
        let headers = String::from_utf8_lossy(&requests[0]).to_ascii_lowercase();
        assert!(headers.starts_with("get "));
        assert!(
            !headers.contains("authorization:")
                && !headers.contains("api-key:")
                && !headers.contains("cookie:")
        );
    }
}

#[tokio::test]
async fn partial_video_receipt_never_becomes_wholly_successful_after_reopen() {
    let (root, _assets, host) = fixture();
    let req = request("video");
    let mut journal = journal(&req);
    journal.video_receipt=Some(serde_json::from_value(json!({"endpoint":"https://api.12ai.org/v1","model":req.model,"credentialRef":"fixture","slots":[{"index":0,"acceptance":"accepted","jobId":"partial-job","partial":true}]})).unwrap_or_else(|_|panic!("partial receipt must be durable")));
    journal.record.outputs[0].status = "succeeded".into();
    journal.record.outputs[0].asset_id = Some("asset-result".into());
    journal.record.asset_ids = vec!["asset-result".into()];
    host.write_one(&journal).unwrap();
    drop(host);
    let host = Arc::new(
        TaskHost::new(
            root.join("tasks"),
            Arc::new(AssetRepository::new(root.join("assets"))),
        )
        .unwrap(),
    );
    let journal = host.read_one(&req.task_id).unwrap().unwrap();
    let ctl = control();
    let result = host
        .poll_video_receipt(
            &journal.record,
            &journal.fingerprint,
            &ctl,
            &journal.video_receipt.unwrap(),
            &Client::builder().no_proxy().build().unwrap(),
            &reqwest::Url::parse("http://127.0.0.1:1/v1").unwrap(),
            "fixture-secret",
        )
        .await;
    assert!(!result.as_ref().err().unwrap().request_started);
    host.finish_run(&req.task_id, &journal.fingerprint, ctl, result);
    assert_eq!(host.get(&req.task_id).unwrap().unwrap().status, "failed");
    fs::remove_dir_all(root).unwrap();
}
fn body(raw: &[u8]) -> Value {
    let pos = raw.windows(4).position(|v| v == b"\r\n\r\n").unwrap() + 4;
    serde_json::from_slice(&raw[pos..]).unwrap()
}
fn expect_ok<T>(value: Result<T, RunError>) -> T {
    value.unwrap_or_else(|e| panic!("{}", e.failure.message))
}

#[test]
fn video_payload_uses_archived_originals_and_exact_parameters() {
    let (root, assets, _host) = fixture();
    let mut req = request("video");
    let bytes = b"image fixture";
    let metadata = image_output_metadata(&req, bytes, "image/png", &None);
    let asset = assets.store(STANDARD.encode(bytes), metadata).unwrap();
    req.attachments=serde_json::from_value(json!([{"assetId":asset["assetId"],"name":"first.png","role":"主体","mime":"image/png","referenceFrame":"first"},{"assetId":asset["assetId"],"name":"last.png","referenceFrame":"last"}])).unwrap();
    let payload = expect_ok(video_body(&req, &assets));
    assert_eq!(
        payload,
        json!({"model":"veo-3.1-generate-preview","input":{"prompt":"synthetic fixture","n":1,"duration":6,"aspect_ratio":"16:9","resolution":"1080p","audio":false,"start_frames":["data:image/png;base64,aW1hZ2UgZml4dHVyZQ=="],"end_frames":["data:image/png;base64,aW1hZ2UgZml4dHVyZQ=="]}})
    );
    req.attachments[0].mime = Some("image/jpeg".into());
    assert!(video_body(&req, &assets).is_err());
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn video_task_parser_binds_id_and_requires_valid_terminal_output() {
    let task = expect_ok(parse_task(
        &json!({"id":"job-1","status":"completed","outputs":["https://cdn.12ai.org/result.mp4?signature=fixture"]}),
        Some("job-1"),
    ));
    assert_eq!(task.1, "completed");
    for value in [
        json!({"id":"other","status":"queued"}),
        json!({"id":"job-1","status":"completed","outputs":[]}),
        json!({"id":"job-1","status":"queued","outputs":["https://cdn.12ai.org/x"]}),
        json!({"id":"job-1","status":"made-up"}),
        json!({"id":"job-1","status":"completed","outputs":["http://127.0.0.1/x"]}),
    ] {
        assert!(parse_task(&value, Some("job-1")).is_err());
    }
}

#[tokio::test]
async fn audio_archives_real_bytes_and_exact_speech_parameters() {
    let (root, assets, host) = fixture();
    let bytes = b"ID3synthetic speech fixture".to_vec();
    let (base, server) = serve(vec![(200, "audio/mpeg", bytes.clone())]).await;
    let mut req = request("audio");
    req.base_url = base.to_string();
    let journal = journal(&req);
    host.write_one(&journal).unwrap();
    let ids = expect_ok(
        host.perform_media(
            &req,
            &journal.fingerprint,
            &control(),
            Client::builder().no_proxy().build().unwrap(),
            "fixture-secret",
        )
        .await,
    );
    assert_eq!(ids.len(), 1);
    let asset = assets.read(&ids[0]).unwrap().unwrap();
    assert_eq!(asset.metadata["mime"], "audio/mpeg");
    assert_eq!(STANDARD.decode(asset.data_base64).unwrap(), bytes);
    assert_eq!(
        host.get(&req.task_id).unwrap().unwrap().outputs[0]
            .asset_id
            .as_deref(),
        Some(ids[0].as_str())
    );
    let requests = server.await.unwrap();
    assert!(String::from_utf8_lossy(&requests[0]).starts_with("POST /v1/audio/speech "));
    assert_eq!(
        body(&requests[0]),
        json!({"model":"tts-1","input":"synthetic fixture","voice":"coral","response_format":"mp3","speed":1.25})
    );
    fs::remove_dir_all(root).unwrap();
}

#[tokio::test]
async fn media_mime_and_bounds_reject_json_and_wrong_binary() {
    for (mime, bytes, kind, format) in [
        (
            "application/json",
            b"{\"error\":\"failed\"}".to_vec(),
            "audio",
            Some("mp3"),
        ),
        ("audio/mpeg", b"not mp3".to_vec(), "audio", Some("mp3")),
        ("video/mp4", b"not mp4".to_vec(), "video", None),
        (
            "audio/wav",
            b"RIFF0000WAVEfixture".to_vec(),
            "audio",
            Some("mp3"),
        ),
    ] {
        let (base, server) = serve(vec![(200, mime, bytes)]).await;
        let response = Client::builder()
            .no_proxy()
            .build()
            .unwrap()
            .get(base)
            .send()
            .await
            .unwrap();
        assert!(read_media_response(response, kind, format, &control())
            .await
            .is_err());
        server.await.unwrap();
    }
    for (mime, bytes, kind, format) in [
        ("video/mp4", b"0000ftypisomfixture".to_vec(), "video", None),
        (
            "video/webm",
            b"\x1a\x45\xdf\xa3fixture".to_vec(),
            "video",
            None,
        ),
        (
            "audio/wav",
            b"RIFF0000WAVEfixture".to_vec(),
            "audio",
            Some("wav"),
        ),
    ] {
        let (base, server) = serve(vec![(200, mime, bytes.clone())]).await;
        let response = Client::builder()
            .no_proxy()
            .build()
            .unwrap()
            .get(base)
            .send()
            .await
            .unwrap();
        assert_eq!(
            expect_ok(read_media_response(response, kind, format, &control()).await).0,
            bytes
        );
        server.await.unwrap();
    }
}
