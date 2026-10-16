use super::super::fixture::{server, Root};
use super::*;
use std::sync::atomic::Ordering;
fn response(status: &str, headers: &str, body: &[u8]) -> Vec<u8> {
    [
        format!("HTTP/1.1 {status}\r\nConnection: close\r\n{headers}\r\n").as_bytes(),
        body,
    ]
    .concat()
}
fn spec(url: &str, bytes: &[u8]) -> FileSpec {
    FileSpec {
        relative: "packages/test/model.gguf".into(),
        source: url.into(),
        bytes: bytes.len() as u64,
        sha256: super::super::catalog::hash(bytes),
        archive: false,
    }
}
#[tokio::test]
async fn complete_transfer_is_verified_and_existing_changed_file_never_overwritten() {
    let root = Root::new();
    let directory = paths::Directory::open(&root.0).unwrap();
    let data = vec![7u8; 160000];
    let (url, task) = server(vec![response(
        "200 OK",
        &format!("Content-Length: {}\r\n", data.len()),
        &data,
    )])
    .await;
    let spec = spec(&url, &data);
    let transport = Transport {
        local_fixture: true,
    };
    let cancel = Arc::new(AtomicBool::new(false));
    transfer(&directory, &spec, Arc::clone(&cancel), &transport, |_| ())
        .await
        .unwrap();
    assert_eq!(task.await.unwrap().len(), 1);
    let target = directory.child(&spec.relative, false).unwrap();
    assert_eq!(std::fs::read(&target).unwrap(), data);
    std::fs::write(&target, vec![3u8; data.len()]).unwrap();
    assert!(transfer(&directory, &spec, cancel, &transport, |_| ())
        .await
        .unwrap_err()
        .starts_with("integrity:"));
    assert_eq!(std::fs::read(target).unwrap()[0], 3);
}
#[tokio::test]
async fn interrupted_body_resumes_only_exact_range_after_prefix_verification() {
    let root = Root::new();
    let directory = paths::Directory::open(&root.0).unwrap();
    let data = b"abcdef";
    let (url, task) = server(vec![
        response("200 OK", "Content-Length: 6\r\nETag: \"v1\"\r\n", b"abc"),
        response(
            "206 Partial Content",
            "Content-Length: 3\r\nContent-Range: bytes 3-5/6\r\nETag: \"v1\"\r\n",
            b"def",
        ),
    ])
    .await;
    let spec = spec(&url, data);
    let transport = Transport {
        local_fixture: true,
    };
    let flag = Arc::new(AtomicBool::new(false));
    assert!(
        transfer(&directory, &spec, Arc::clone(&flag), &transport, |_| ())
            .await
            .is_err()
    );
    transfer(&directory, &spec, flag, &transport, |_| ())
        .await
        .unwrap();
    let requests = task.await.unwrap();
    assert!(requests[1].to_ascii_lowercase().contains("range: bytes=3-"));
    assert!(requests[1]
        .to_ascii_lowercase()
        .contains("if-range: \"v1\""));
}
#[tokio::test]
async fn cancelled_full_partial_can_resume_without_second_network_submission() {
    let root = Root::new();
    let directory = paths::Directory::open(&root.0).unwrap();
    let data = b"fixture";
    let (url, task) = server(vec![response("200 OK", "Content-Length: 7\r\n", data)]).await;
    let spec = spec(&url, data);
    let flag = Arc::new(AtomicBool::new(false));
    let transport = Transport {
        local_fixture: true,
    };
    let result = transfer(&directory, &spec, Arc::clone(&flag), &transport, |n| {
        if n == 7 {
            flag.store(true, Ordering::Release);
        }
    })
    .await;
    assert!(result.unwrap_err().starts_with("cancelled:"));
    task.await.unwrap();
    assert!(!directory.child(&spec.relative, false).unwrap().exists());
    flag.store(false, Ordering::Release);
    transfer(&directory, &spec, flag, &transport, |_| ())
        .await
        .unwrap();
}
#[tokio::test]
async fn range_200_wrong_bounds_and_changed_validator_never_append() {
    for reply in [
        response("200 OK", "Content-Length: 6\r\n", b"abcdef"),
        response(
            "206 Partial Content",
            "Content-Length: 3\r\nContent-Range: bytes 2-4/6\r\nETag: \"v1\"\r\n",
            b"def",
        ),
        response(
            "206 Partial Content",
            "Content-Length: 3\r\nContent-Range: bytes 3-5/6\r\nETag: \"v2\"\r\n",
            b"def",
        ),
    ] {
        let root = Root::new();
        let directory = paths::Directory::open(&root.0).unwrap();
        let (url, task) = server(vec![
            response("200 OK", "Content-Length: 6\r\nETag: \"v1\"\r\n", b"abc"),
            reply,
        ])
        .await;
        let spec = spec(&url, b"abcdef");
        let flag = Arc::new(AtomicBool::new(false));
        let transport = Transport {
            local_fixture: true,
        };
        assert!(
            transfer(&directory, &spec, Arc::clone(&flag), &transport, |_| ())
                .await
                .is_err()
        );
        assert!(transfer(&directory, &spec, flag, &transport, |_| ())
            .await
            .is_err());
        task.await.unwrap();
        assert!(!directory.child(&spec.relative, false).unwrap().exists());
    }
}
#[tokio::test]
async fn corrupt_prefix_and_future_metadata_preserve_bytes_and_do_not_fetch() {
    let root = Root::new();
    let directory = paths::Directory::open(&root.0).unwrap();
    let spec = spec("https://github.com/fixed", b"abcdef");
    let part = directory
        .child(&format!(".partials/{}.part", spec.sha256), true)
        .unwrap();
    std::fs::write(&part, b"xyz").unwrap();
    let path = directory
        .child(&format!(".partials/{}.json", spec.sha256), true)
        .unwrap();
    let value = serde_json::json!({"version":1,"source":spec.source,"sha256":spec.sha256,"bytes":6,"completed":3,"prefixSha256":super::super::catalog::hash(b"abc"),"validator":null,"directoryIdentity":directory.identity});
    paths::write_record(&path, &value).unwrap();
    assert!(transfer(
        &directory,
        &spec,
        Arc::new(AtomicBool::new(false)),
        &Transport::default(),
        |_| ()
    )
    .await
    .unwrap_err()
    .starts_with("integrity:"));
    assert_eq!(std::fs::read(&part).unwrap(), b"xyz");
    std::fs::write(&path, b"{\"version\":99}").unwrap();
    assert!(transfer(
        &directory,
        &spec,
        Arc::new(AtomicBool::new(false)),
        &Transport::default(),
        |_| ()
    )
    .await
    .unwrap_err()
    .starts_with("unsupported:"));
    assert_eq!(std::fs::read(path).unwrap(), b"{\"version\":99}");
}
#[tokio::test]
async fn production_transport_rejects_private_unknown_and_non_https_sources() {
    for host in [
        "us.aws.cdn.hf.co",
        "us.gcp.cdn.hf.co",
        "transfer.xethub-eu.hf.co",
        "cdn-lfs-eu-1.hf.co",
        "cas-server.xethub.hf.co",
        "cas-server.xethub-eu.hf.co",
    ] {
        assert!(allowed(host));
    }
    for host in [
        "us.aws.cdn.hf.co.evil.test",
        "evil.hf.co",
        "cas-server.xethub.hf.co.evil.test",
    ] {
        assert!(!allowed(host));
    }
    for source in [
        "http://127.0.0.1/file",
        "https://example.test/file",
        "https://github.com:444/file",
        "https://user:pass@github.com/file",
    ] {
        let spec = spec(source, b"x");
        assert!(Transport::default()
            .response(&spec, 0, None, &AtomicBool::new(false))
            .await
            .is_err());
    }
    assert!(!public("127.0.0.1".parse().unwrap()));
    assert!(!public("169.254.1.1".parse().unwrap()));
    assert!(!public("::ffff:192.168.1.1".parse().unwrap()));
    assert!(!public("100.100.1.1".parse().unwrap()));
    for ip in ["::2", "fec0::1", "2002:7f00:1::1", "2001:db8::1"] {
        assert!(!public(ip.parse().unwrap()));
    }
    assert!(public("2606:4700::1111".parse().unwrap()));
}

#[tokio::test]
async fn explicit_retry_quarantines_bad_complete_partial_and_fetches_fresh_bytes() {
    let root = Root::new();
    let directory = paths::Directory::open(&root.0).unwrap();
    let (url, task) = server(vec![
        response("200 OK", "Content-Length: 6\r\n", b"badbad"),
        response("200 OK", "Content-Length: 6\r\n", b"abcdef"),
    ])
    .await;
    let spec = spec(&url, b"abcdef");
    let transport = Transport {
        local_fixture: true,
    };
    let cancel = Arc::new(AtomicBool::new(false));
    assert!(
        transfer(&directory, &spec, Arc::clone(&cancel), &transport, |_| ())
            .await
            .unwrap_err()
            .starts_with("integrity:")
    );
    assert!(!directory.child(&spec.relative, false).unwrap().exists());
    transfer(&directory, &spec, cancel, &transport, |_| ())
        .await
        .unwrap();
    let requests = task.await.unwrap();
    assert_eq!(requests.len(), 2);
    assert!(!requests[1].to_ascii_lowercase().contains("range:"));
    assert_eq!(
        std::fs::read(directory.child(&spec.relative, false).unwrap()).unwrap(),
        b"abcdef"
    );
    let failures = std::fs::read_dir(root.0.join(".partials"))
        .unwrap()
        .filter_map(|e| {
            let p = e.unwrap().path();
            (p.file_name()
                .unwrap()
                .to_string_lossy()
                .starts_with("rejected-")
                && p.extension().is_some_and(|v| v == "part"))
            .then_some(p)
        })
        .collect::<Vec<_>>();
    assert_eq!(failures.len(), 1);
    assert_eq!(std::fs::read(&failures[0]).unwrap(), b"badbad");
}

#[tokio::test]
async fn cancelling_while_waiting_for_headers_does_not_wait_for_network_timeout() {
    use tokio::io::AsyncReadExt;
    let root = Root::new();
    let directory = paths::Directory::open(&root.0).unwrap();
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let url = format!("http://{}", listener.local_addr().unwrap());
    let flag = Arc::new(AtomicBool::new(false));
    let accepted = Arc::clone(&flag);
    let server = tokio::spawn(async move {
        let (mut stream, _) = listener.accept().await.unwrap();
        let mut request = [0; 4096];
        stream.read(&mut request).await.unwrap();
        accepted.store(true, Ordering::Release);
        tokio::time::sleep(Duration::from_secs(5)).await;
    });
    let result = tokio::time::timeout(
        Duration::from_secs(1),
        transfer(
            &directory,
            &spec(&url, b"x"),
            flag,
            &Transport {
                local_fixture: true,
            },
            |_| (),
        ),
    )
    .await
    .unwrap();
    assert!(result.unwrap_err().starts_with("cancelled:"));
    server.abort();
    let _ = server.await;
}

#[tokio::test]
async fn fixround1_hard_linked_partial_never_mutates_its_original_before_network() {
    for completed in [0, 3] {
        let root = Root::new();
        std::fs::create_dir(root.0.join("selected")).unwrap();
        let directory = paths::Directory::open(&root.0.join("selected")).unwrap();
        let original = root.0.join("outside-original.txt");
        std::fs::write(&original, b"SECRET").unwrap();
        let expected = std::fs::read(&original).unwrap();
        let expected_sha = super::super::catalog::hash(&expected);
        let spec = spec(
            "https://example.invalid/must-not-fetch",
            b"0123456789abcdef",
        );
        let part = directory
            .child(&format!(".partials/{}.part", spec.sha256), true)
            .unwrap();
        std::fs::hard_link(&original, &part).unwrap();
        let record = directory
            .child(&format!(".partials/{}.json", spec.sha256), true)
            .unwrap();
        paths::write_record(&record,&serde_json::json!({"version":1,"source":spec.source,"sha256":spec.sha256,"bytes":spec.bytes,"completed":completed,"prefixSha256":super::super::catalog::hash(&expected[..completed]),"validator":null,"directoryIdentity":directory.identity})).unwrap();
        let error = transfer(
            &directory,
            &spec,
            Arc::new(AtomicBool::new(false)),
            &Transport::default(),
            |_| (),
        )
        .await
        .err()
        .unwrap();
        assert_eq!(
            std::fs::read(&original).unwrap(),
            expected,
            "partial must not truncate or append through an outside hard-link alias"
        );
        assert_eq!(
            paths::file_hash(&original, 6, &AtomicBool::new(false)).unwrap(),
            expected_sha
        );
        assert!(
            error.starts_with("conflict:"),
            "must reject the write handle before a network attempt: {error}"
        );
        // Read-only original access remains valid even when there is another directory entry.
        assert_eq!(
            paths::file_hash(&part, 6, &AtomicBool::new(false)).unwrap(),
            expected_sha
        );
    }
}

#[cfg(windows)]
#[test]
fn fixround1_partial_handle_blocks_replacement_and_detects_new_alias_before_mutation() {
    let root = Root::new();
    let directory = paths::Directory::open(&root.0).unwrap();
    let part = directory.child("partial.part", false).unwrap();
    let (file, identity) = open_partial(&part, false).unwrap();
    assert!(!identity.is_empty());
    assert!(std::fs::rename(&part, root.0.join("replaced")).is_err());
    assert!(paths::partial_identity(&file, &root.0.join("another-path"))
        .unwrap_err()
        .starts_with("conflict:"));
    // Windows permits adding an alias despite share0; a held-handle recheck must detect it.
    std::fs::hard_link(&part, root.0.join("outside-alias")).unwrap();
    assert!(paths::partial_unchanged(&file, &identity)
        .unwrap_err()
        .starts_with("conflict:"));
    assert_eq!(file.metadata().unwrap().len(), 0);
    drop(file);
    assert!(open_partial(&part, true).is_err());
}

#[tokio::test]
async fn fixround1_alias_added_during_network_wait_is_detected_before_chunk_write() {
    let root = Root::new();
    let directory = paths::Directory::open(&root.0).unwrap();
    let (url, http) = server(vec![response("200 OK", "Content-Length: 3\r\n", b"abc")]).await;
    let spec = spec(&url, b"abc");
    let part = directory
        .child(&format!(".partials/{}.part", spec.sha256), true)
        .unwrap();
    let alias = root.0.join("new-alias");
    let error = transfer(
        &directory,
        &spec,
        Arc::new(AtomicBool::new(false)),
        &Transport {
            local_fixture: true,
        },
        |n| {
            if n == 0 && !alias.exists() {
                std::fs::hard_link(&part, &alias).unwrap();
            }
        },
    )
    .await
    .unwrap_err();
    http.await.unwrap();
    assert!(error.starts_with("conflict:"));
    assert_eq!(std::fs::read(&part).unwrap(), b"");
    assert_eq!(std::fs::read(alias).unwrap(), b"");
}

#[tokio::test]
async fn fixround1_changed_partial_identity_never_truncates_the_new_file() {
    let root = Root::new();
    let directory = paths::Directory::open(&root.0).unwrap();
    let spec = spec("https://example.invalid/must-not-fetch", b"abcdef");
    let part = directory
        .child(&format!(".partials/{}.part", spec.sha256), true)
        .unwrap();
    std::fs::write(&part, b"abc").unwrap();
    paths::write_record(&directory.child(&format!(".partials/{}.json",spec.sha256),true).unwrap(),&serde_json::json!({"version":1,"source":spec.source,"sha256":spec.sha256,"bytes":6,"completed":0,"prefixSha256":super::super::catalog::hash(b""),"validator":null,"directoryIdentity":directory.identity,"fileIdentity":"unrelated-file-id"})).unwrap();
    assert!(transfer(
        &directory,
        &spec,
        Arc::new(AtomicBool::new(false)),
        &Transport::default(),
        |_| ()
    )
    .await
    .unwrap_err()
    .starts_with("conflict:"));
    assert_eq!(std::fs::read(part).unwrap(), b"abc");
}
