use super::*;
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

#[test]
fn only_exact_loopback_models_and_protocol_pagination_are_accepted() {
    for url in [
        "http://127.0.0.1:1234/v1/models",
        "http://LOCALHOST:1234/models",
        "http://[::1]:1234/v1/models",
    ] {
        assert!(local_models_url(url, "openai-compatible").is_ok());
    }
    for url in [
        "http://127.1/models",
        "http://2130706433/models",
        "http://127.0.0.2/models",
        "http://localhost.example/models",
        "http://user@localhost/models",
        "http://localhost/models#x",
        "http://localhost/files/models/download",
        "http://localhost/models?api_key=synthetic",
        "http://localhost/models?x=y",
        "file://localhost/models",
        "http://localhost/models?after_id=a&after_id=b",
    ] {
        assert!(local_models_url(url, "openai-compatible").is_err(), "{url}");
    }
    assert!(local_models_url(
        "http://localhost/v1/models?after_id=next",
        "anthropic-messages"
    )
    .is_ok());
    assert!(local_models_url("http://localhost/v1beta/models?pageToken=next", "gemini").is_ok());
    assert!(local_models_url("http://localhost/models", "unrecognized").is_err());
}

async fn response(
    status: &str,
    headers: &str,
    body: Vec<u8>,
    host: &str,
) -> (String, tokio::task::JoinHandle<String>) {
    let server = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let port = server.local_addr().unwrap().port();
    let header = format!(
        "HTTP/1.1 {status}\r\n{headers}Content-Length: {}\r\nConnection: close\r\n\r\n",
        body.len()
    );
    let task = tokio::spawn(async move {
        let (mut stream, _) = server.accept().await.unwrap();
        let mut bytes = vec![0; 8192];
        let size = stream.read(&mut bytes).await.unwrap();
        stream.write_all(header.as_bytes()).await.unwrap();
        let _ = stream.write_all(&body).await;
        String::from_utf8(bytes[..size].to_vec()).unwrap()
    });
    (format!("http://{host}:{port}/v1/models"), task)
}

#[tokio::test]
async fn real_loopback_get_has_no_origin_cookie_or_authorization_and_localhost_is_pinned() {
    let (url, server) = response(
        "200 OK",
        "",
        br#"{"data":[{"id":"opaque-model"}]}"#.to_vec(),
        "localhost",
    )
    .await;
    let service = ModelDiscovery::default();
    let page = service
        .read("model-page-owned", &url, "openai-compatible")
        .await
        .unwrap();
    assert_eq!(page.status, 200);
    assert!(page.body.contains("opaque-model"));
    let wire = server.await.unwrap().to_ascii_lowercase();
    assert!(wire.starts_with("get /v1/models http/1.1"));
    for forbidden in ["authorization:", "cookie:", "origin:"] {
        assert!(!wire.contains(forbidden));
    }
    assert!(service.pending.lock().unwrap().active.is_empty());
}

#[tokio::test]
async fn redirect_and_rejection_bodies_are_not_followed_or_exposed() {
    for (status, header, expected) in [
        (
            "302 Found",
            "Location: https://must-not-contact.example/models\r\n",
            302,
        ),
        ("401 Unauthorized", "", 401),
    ] {
        let (url, server) = response(
            status,
            header,
            b"api_key=synthetic-private-server-body".to_vec(),
            "127.0.0.1",
        )
        .await;
        let page = ModelDiscovery::default()
            .read("model-page-reject", &url, "openai-compatible")
            .await
            .unwrap();
        assert_eq!(page.status, expected);
        assert!(page.body.is_empty());
        server.await.unwrap();
    }
}

#[tokio::test]
async fn oversize_and_invalid_utf8_are_rejected_without_retaining_requests() {
    for body in [vec![b'x'; MAX_BODY + 1], vec![0xff, 0xfe]] {
        let (url, server) = response("200 OK", "", body, "127.0.0.1").await;
        let service = ModelDiscovery::default();
        assert!(service
            .read("model-page-body", &url, "openai-compatible")
            .await
            .is_err());
        server.await.unwrap();
        assert!(service.pending.lock().unwrap().active.is_empty());
    }
}

#[tokio::test]
async fn cancel_disconnects_the_real_pending_socket_and_precancel_never_connects() {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let url = format!("http://{}/models", listener.local_addr().unwrap());
    let service = Arc::new(ModelDiscovery::default());
    assert!(service.cancel("model-page-early").unwrap());
    assert!(service
        .read("model-page-early", &url, "openai-compatible")
        .await
        .unwrap_err()
        .starts_with("cancelled:"));
    assert!(
        tokio::time::timeout(Duration::from_millis(50), listener.accept())
            .await
            .is_err()
    );
    let request_service = Arc::clone(&service);
    let request = tokio::spawn(async move {
        request_service
            .read("model-page-active", &url, "openai-compatible")
            .await
    });
    let (mut socket, _) = listener.accept().await.unwrap();
    let mut bytes = [0; 4096];
    assert!(socket.read(&mut bytes).await.unwrap() > 0);
    socket
        .write_all(b"HTTP/1.1 200 OK\r\nContent-Length: 1000\r\n\r\n{")
        .await
        .unwrap();
    assert!(service.cancel("model-page-active").unwrap());
    assert!(request
        .await
        .unwrap()
        .unwrap_err()
        .starts_with("cancelled:"));
    assert_eq!(
        tokio::time::timeout(Duration::from_secs(2), socket.read(&mut bytes))
            .await
            .unwrap()
            .unwrap(),
        0
    );
    assert!(service.pending.lock().unwrap().active.is_empty());
}

#[tokio::test]
async fn capacity_and_precancel_tombstones_are_bounded_and_expire() {
    let service = ModelDiscovery::default();
    for index in 0..MAX_CANCELLED {
        assert!(service.cancel(&format!("model-page-{index}")).unwrap());
    }
    assert!(!service.cancel("model-page-extra").unwrap());
    assert_eq!(
        service.pending.lock().unwrap().cancelled.len(),
        MAX_CANCELLED
    );
    assert!(service
        .read(
            "model-page-new",
            "http://localhost:9/models",
            "openai-compatible"
        )
        .await
        .unwrap_err()
        .starts_with("capacity:"));
    {
        let mut pending = service.pending.lock().unwrap();
        for at in pending.cancelled.values_mut() {
            *at = Instant::now() - CANCEL_TTL - Duration::from_secs(1);
        }
    }
    assert!(service.cancel("model-page-extra").unwrap());
    assert_eq!(service.pending.lock().unwrap().cancelled.len(), 1);
    assert!(service.cancel("../bad").is_err());
    let (sender, _) = watch::channel(false);
    {
        let mut pending = service.pending.lock().unwrap();
        for index in 0..MAX_ACTIVE {
            pending
                .active
                .insert(format!("model-page-active-{index}"), sender.clone());
        }
    }
    assert!(service
        .read(
            "model-page-over-cap",
            "http://localhost:9/models",
            "openai-compatible"
        )
        .await
        .unwrap_err()
        .starts_with("capacity:"));
}
