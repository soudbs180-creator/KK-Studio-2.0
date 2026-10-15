use super::super::fixture::{server, Root};
use super::*;
#[test]
fn explicit_grants_are_owner_scoped_and_prepare_is_read_only() {
    let root = Root::new();
    let registry = Root::new();
    let manager = LocalModelManager::new(registry.0.clone());
    let grant = manager.grant_directory("window-a", &root.0).unwrap();
    assert!(manager.grant("window-b", &grant.grant_id).is_err());
    let selected = manager.grant("window-a", &grant.grant_id).unwrap();
    let prepared = catalog::prepare(Selection {
        package_ids: vec!["qwen3.5-4b-q4-k-m".into()],
        runtime_backend: "cpu".into(),
    })
    .unwrap();
    let plan = manager
        .prepare_checked("window-a", selected, prepared)
        .unwrap();
    assert_eq!(std::fs::read_dir(&root.0).unwrap().count(), 0);
    assert!(manager.cancel("window-b", &plan.operation_id).is_err());
    assert_eq!(
        manager
            .cancel("window-a", &plan.operation_id)
            .unwrap()
            .state,
        "cancelled"
    );
    assert_eq!(manager.list_installed().unwrap().len(), 0);
}
#[test]
fn volume_and_controlled_path_checks_do_not_mutate_existing_files() {
    let root = Root::new();
    let dir = paths::Directory::open(&root.0).unwrap();
    assert!(paths::Volume {
        free_bytes: 5,
        max_file_bytes: 100
    }
    .check(6, 1)
    .is_err());
    assert!(paths::Volume {
        free_bytes: u64::MAX,
        max_file_bytes: u32::MAX as u64
    }
    .check(1, 5 * 1024u64.pow(3))
    .is_err());
    for path in ["../outside", "CON/file", "a\\b", "/root", "a:stream"] {
        assert!(dir.child(path, true).is_err());
    }
    assert_eq!(std::fs::read_dir(&root.0).unwrap().count(), 0);
    std::fs::write(root.0.join("occupied"), b"keep").unwrap();
    assert!(dir.child("occupied/file", true).is_err());
    assert_eq!(std::fs::read(root.0.join("occupied")).unwrap(), b"keep");
}
#[test]
fn future_and_corrupt_records_are_not_replaced() {
    let root = Root::new();
    let path = root.0.join("future.json");
    for bytes in [b"{\"version\":99}".as_slice(), b"broken".as_slice()] {
        std::fs::write(&path, bytes).unwrap();
        assert!(paths::write_record(&path, &serde_json::json!({"version":1})).is_err());
        assert_eq!(std::fs::read(&path).unwrap(), bytes);
    }
}
#[tokio::test]
async fn synthetic_install_status_and_receipt_publish_only_after_integrity() {
    let target = Root::new();
    let registry = Root::new();
    let manager = LocalModelManager::new(registry.0.clone());
    let grant = manager.grant_directory("a", &target.0).unwrap();
    let selected = manager.grant("a", &grant.grant_id).unwrap();
    let (url, task) = server(vec![
        b"HTTP/1.1 200 OK\r\nContent-Length: 3\r\nConnection: close\r\n\r\nabc".to_vec(),
    ])
    .await;
    let mut prepared = catalog::prepare(Selection {
        package_ids: vec!["minimax-h3-16g-hifi-fl2va".into()],
        runtime_backend: "none".into(),
    })
    .unwrap();
    prepared.files = vec![catalog::FileSpec {
        relative: "weights/fixture".into(),
        source: url,
        bytes: 3,
        sha256: catalog::hash(b"abc"),
        archive: false,
    }];
    prepared.download_bytes = 3;
    prepared.required_bytes = 6;
    let plan = manager.prepare_checked("a", selected, prepared).unwrap();
    let status = manager
        .install_with(
            "a",
            &plan.operation_id,
            &Transport {
                local_fixture: true,
            },
            Some(paths::Volume {
                free_bytes: catalog::SPACE_RESERVE + 100,
                max_file_bytes: 100,
            }),
        )
        .await
        .unwrap();
    task.await.unwrap();
    assert_eq!(status.state, "installed");
    assert_eq!(status.installation_ids.len(), 1);
    assert_eq!(manager.list_installed().unwrap().len(), 1);
    // A synthetic transport receipt cannot bypass the real fixed artifact inspection.
    assert!(manager.inspect(&status.installation_ids[0]).is_err());
}
#[cfg(windows)]
#[test]
fn windows_target_lock_and_junction_are_excluded() {
    let root = Root::new();
    let dir = paths::Directory::open(&root.0).unwrap();
    let path = dir.child("lock", true).unwrap();
    let first = paths::lock(&path).unwrap();
    assert!(paths::lock(&path).is_err());
    drop(first);
    assert!(paths::lock(&path).is_ok());
    use std::os::windows::process::CommandExt;
    let target = root.0.join("inside");
    std::fs::create_dir(&target).unwrap();
    let link = root.0.join("alias");
    let mut command = std::process::Command::new("node.exe");
    crate::agent_process::protect_node_startup(&mut command);
    let output = command
        .args([
            "--input-type=module",
            "-e",
            "import fs from 'node:fs';fs.symlinkSync(process.argv[1],process.argv[2],'junction');",
        ])
        .arg(&target)
        .arg(&link)
        .creation_flags(0x08000000)
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{} {} link={} target={}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr),
        link.display(),
        target.display()
    );
    assert!(dir
        .child("alias/file", true)
        .unwrap_err()
        .starts_with("path:"));
    assert!(!target.join("file").exists());
}

#[tokio::test]
async fn active_operation_survives_view_reopen_is_owner_scoped_and_clears_when_finished() {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    let target = Root::new();
    let registry = Root::new();
    let manager = Arc::new(LocalModelManager::new(registry.0.clone()));
    let grant = manager.grant_directory("a", &target.0).unwrap();
    let selected = manager.grant("a", &grant.grant_id).unwrap();
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let source = format!("http://{}", listener.local_addr().unwrap());
    let ready = Arc::new(tokio::sync::Notify::new());
    let release = Arc::new(tokio::sync::Notify::new());
    let go = Arc::clone(&release);
    let accepted = Arc::clone(&ready);
    let server = tokio::spawn(async move {
        let (mut stream, _) = listener.accept().await.unwrap();
        let mut request = [0u8; 4096];
        stream.read(&mut request).await.unwrap();
        accepted.notify_one();
        go.notified().await;
        stream
            .write_all(b"HTTP/1.1 200 OK\r\nContent-Length: 3\r\nConnection: close\r\n\r\nabc")
            .await
            .unwrap();
    });
    let mut p = catalog::prepare(Selection {
        package_ids: vec!["minimax-h3-16g-hifi-fl2va".into()],
        runtime_backend: "none".into(),
    })
    .unwrap();
    p.files = vec![catalog::FileSpec {
        relative: "weights/fixture".into(),
        source,
        bytes: 3,
        sha256: catalog::hash(b"abc"),
        archive: false,
    }];
    p.download_bytes = 3;
    p.required_bytes = 6;
    let plan = manager.prepare_checked("a", selected, p).unwrap();
    let id = plan.operation_id.clone();
    let worker = Arc::clone(&manager);
    let operation = tokio::spawn(async move {
        worker
            .install_with(
                "a",
                &id,
                &Transport {
                    local_fixture: true,
                },
                Some(paths::Volume {
                    free_bytes: catalog::SPACE_RESERVE + 100,
                    max_file_bytes: 100,
                }),
            )
            .await
            .unwrap()
    });
    ready.notified().await;
    assert_eq!(
        manager
            .current_operation("a")
            .unwrap()
            .unwrap()
            .operation_id,
        plan.operation_id
    );
    assert!(manager.current_operation("b").unwrap().is_none());
    release.notify_one();
    assert_eq!(operation.await.unwrap().state, "installed");
    server.await.unwrap();
    assert!(manager.current_operation("a").unwrap().is_none());
}

#[test]
fn matching_qwen_pairs_are_read_only_and_never_accept_another_models_projector() {
    let root = Root::new();
    let directory = paths::Directory::open(&root.0).unwrap();
    let mut p = catalog::prepare(Selection {
        package_ids: vec!["qwen3.5-4b-q4-k-m".into()],
        runtime_backend: "cpu".into(),
    })
    .unwrap()
    .packages
    .remove(0);
    for (a, bytes) in p
        .artifacts
        .iter_mut()
        .zip([b"model".as_slice(), b"projector".as_slice()])
    {
        a.bytes = bytes.len() as u64;
        a.sha256 = catalog::hash(bytes);
        std::fs::write(directory.child(&a.path, true).unwrap(), bytes).unwrap();
    }
    assert!(
        paths::matching_pairs(&directory, &[p.clone()], &AtomicBool::new(false))
            .unwrap()
            .contains(&p.id)
    );
    let before = std::fs::read(directory.child(&p.artifacts[1].path, false).unwrap()).unwrap();
    p.artifacts[1].sha256 = catalog::hash(b"other matching-name projector");
    assert!(
        paths::matching_pairs(&directory, &[p.clone()], &AtomicBool::new(false))
            .unwrap_err()
            .starts_with("conflict:")
    );
    assert_eq!(
        std::fs::read(directory.child(&p.artifacts[1].path, false).unwrap()).unwrap(),
        before
    );
    assert!(!root.0.join("KK-Studio-models").exists());
}

#[test]
fn h3_wrapper_detection_reads_bounded_source_and_rejects_external_core_paths() {
    let root = Root::new();
    let directory = paths::Directory::open(&root.0).unwrap();
    std::fs::write(
        root.0.join("backend-state.json"),
        br#"{"backendDirectory":"installed","port":18188}"#,
    )
    .unwrap();
    let version = directory
        .child("backend/installed/ComfyUI/comfyui_version.py", true)
        .unwrap();
    std::fs::write(
        &version,
        "__version__ = '0.34.1'\nraise RuntimeError('must never execute')",
    )
    .unwrap();
    std::fs::write(
        directory
            .child(
                "backend/installed/ComfyUI/comfy_extras/nodes_minimax_h3.py",
                true,
            )
            .unwrap(),
        b"raise RuntimeError('do not import')",
    )
    .unwrap();
    let facts = paths::comfy_dependencies(&directory).unwrap();
    assert!(facts.iter().any(|f| f == "comfyui-source-version:0.34.1"));
    assert!(facts.iter().any(|f| f == "comfyui-h3-node-source-present"));
    assert!(facts.iter().any(|f| f == "h3-workflow-not-validated"));
    for backend in ["../outside", "C:/outside", "installed/subdir"] {
        std::fs::write(
            root.0.join("backend-state.json"),
            serde_json::to_vec(&serde_json::json!({"backendDirectory":backend})).unwrap(),
        )
        .unwrap();
        assert!(paths::comfy_dependencies(&directory)
            .unwrap_err()
            .starts_with("path:"));
    }
    std::fs::write(root.0.join("backend-state.json"), vec![b' '; 65537]).unwrap();
    assert!(paths::comfy_dependencies(&directory)
        .unwrap_err()
        .starts_with("corrupt:"));
}

#[tokio::test]
async fn dropping_install_future_releases_active_operation_without_claiming_success() {
    use tokio::io::AsyncReadExt;
    let root = Root::new();
    let registry = Root::new();
    let manager = Arc::new(LocalModelManager::new(registry.0.clone()));
    let grant = manager.grant_directory("a", &root.0).unwrap();
    let directory = manager.grant("a", &grant.grant_id).unwrap();
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let source = format!("http://{}", listener.local_addr().unwrap());
    let ready = Arc::new(tokio::sync::Notify::new());
    let ready2 = Arc::clone(&ready);
    let server = tokio::spawn(async move {
        let (mut stream, _) = listener.accept().await.unwrap();
        let mut request = [0; 4096];
        stream.read(&mut request).await.unwrap();
        ready2.notify_one();
        tokio::time::sleep(Duration::from_secs(5)).await;
    });
    let mut prepared = catalog::prepare(Selection {
        package_ids: vec!["minimax-h3-16g-hifi-fl2va".into()],
        runtime_backend: "none".into(),
    })
    .unwrap();
    prepared.files = vec![catalog::FileSpec {
        relative: "weights/fixture".into(),
        source,
        bytes: 3,
        sha256: catalog::hash(b"abc"),
        archive: false,
    }];
    prepared.download_bytes = 3;
    prepared.required_bytes = 6;
    let plan = manager.prepare_checked("a", directory, prepared).unwrap();
    let worker = Arc::clone(&manager);
    let id = plan.operation_id.clone();
    let operation = tokio::spawn(async move {
        worker
            .install_with(
                "a",
                &id,
                &Transport {
                    local_fixture: true,
                },
                Some(paths::Volume {
                    free_bytes: catalog::SPACE_RESERVE + 100,
                    max_file_bytes: 100,
                }),
            )
            .await
    });
    ready.notified().await;
    operation.abort();
    assert!(operation.await.err().unwrap().is_cancelled());
    assert!(manager.current_operation("a").unwrap().is_none());
    let status = manager.status("a", &plan.operation_id).unwrap();
    assert!(manager.state.lock().unwrap().operations[&plan.operation_id]
        .cancel
        .load(Ordering::Acquire));
    assert_eq!(status.state, "failed");
    assert!(status.error.unwrap().starts_with("interrupted:"));
    assert!(manager.list_installed().unwrap().is_empty());
    server.abort();
    let _ = server.await;
}

#[tokio::test]
async fn fixround1_resume_budget_counts_only_verified_remaining_bytes() {
    let root = Root::new();
    let registry = Root::new();
    let manager = LocalModelManager::new(registry.0.clone());
    let grant = manager.grant_directory("a", &root.0).unwrap();
    let selected = manager.grant("a", &grant.grant_id).unwrap();
    let directory = selected.managed(true).unwrap();
    let data = b"0123456789abcdefgh";
    let completed = 17usize;
    let(url,http)=server(vec![b"HTTP/1.1 206 Partial Content\r\nContent-Length: 1\r\nContent-Range: bytes 17-17/18\r\nETag: \"v1\"\r\nConnection: close\r\n\r\nh".to_vec()]).await;
    let file = catalog::FileSpec {
        relative: "weights/resume-fixture".into(),
        source: url,
        bytes: data.len() as u64,
        sha256: catalog::hash(data),
        archive: false,
    };
    std::fs::write(
        directory
            .child(&format!(".partials/{}.part", file.sha256), true)
            .unwrap(),
        &data[..completed],
    )
    .unwrap();
    paths::write_record(&directory.child(&format!(".partials/{}.json",file.sha256),true).unwrap(),&serde_json::json!({"version":1,"source":file.source,"sha256":file.sha256,"bytes":file.bytes,"completed":completed,"prefixSha256":catalog::hash(&data[..completed]),"validator":"\"v1\"","directoryIdentity":directory.identity})).unwrap();
    let mut prepared = catalog::prepare(Selection {
        package_ids: vec!["minimax-h3-16g-hifi-fl2va".into()],
        runtime_backend: "none".into(),
    })
    .unwrap();
    prepared.files = vec![file.clone()];
    prepared.download_bytes = 18;
    prepared.required_bytes = 2 * 18 + 2 * 1024u64.pow(3);
    let plan = manager.prepare_checked("a", selected, prepared).unwrap();
    // Scale the review's 40/17/23 GB case to bytes above the fixed safety reserve.
    let status = manager
        .install_with(
            "a",
            &plan.operation_id,
            &Transport {
                local_fixture: true,
            },
            Some(paths::Volume {
                free_bytes: 2 * 1024u64.pow(3) + 22,
                max_file_bytes: 100,
            }),
        )
        .await
        .unwrap();
    assert_eq!(
        status.state, "installed",
        "resumable bytes must not be charged again: {:?}",
        status.error
    );
    assert_eq!(
        std::fs::read(directory.child(&file.relative, false).unwrap()).unwrap(),
        data
    );
    assert!(http.await.unwrap()[0]
        .to_ascii_lowercase()
        .contains("range: bytes=17-"));
}

#[test]
fn fixround1_space_budget_only_credits_verified_targets_and_valid_partial_prefixes() {
    let root = Root::new();
    let selected = paths::Directory::open(&root.0).unwrap();
    let spec = catalog::FileSpec {
        relative: "weights/fixture".into(),
        source: "https://github.com/fixed".into(),
        bytes: 6,
        sha256: catalog::hash(b"abcdef"),
        archive: false,
    };
    let mut prepared = catalog::prepare(Selection {
        package_ids: vec!["minimax-h3-16g-hifi-fl2va".into()],
        runtime_backend: "none".into(),
    })
    .unwrap();
    prepared.files = vec![spec.clone()];
    prepared.download_bytes = 6;
    let flag = AtomicBool::new(false);
    assert_eq!(
        space_budget(&selected, &prepared, &flag).unwrap().0,
        catalog::SPACE_RESERVE + 6
    );
    assert_eq!(std::fs::read_dir(&root.0).unwrap().count(), 0);
    let directory = selected.managed(true).unwrap();
    let part = directory
        .child(&format!(".partials/{}.part", spec.sha256), true)
        .unwrap();
    let record = directory
        .child(&format!(".partials/{}.json", spec.sha256), true)
        .unwrap();
    std::fs::write(&part, b"abc").unwrap();
    assert_eq!(
        space_budget(&selected, &prepared, &flag).unwrap().0,
        catalog::SPACE_RESERVE + 6,
        "unknown partial receives no credit"
    );
    let mut meta = serde_json::json!({"version":1,"source":spec.source,"sha256":spec.sha256,"bytes":6,"completed":3,"prefixSha256":catalog::hash(b"abc"),"validator":null,"directoryIdentity":directory.identity});
    paths::write_record(&record, &meta).unwrap();
    assert_eq!(
        space_budget(&selected, &prepared, &flag).unwrap().0,
        catalog::SPACE_RESERVE + 3
    );
    std::fs::write(&part, b"xyz").unwrap();
    assert_eq!(
        space_budget(&selected, &prepared, &flag).unwrap().0,
        catalog::SPACE_RESERVE + 6
    );
    assert_eq!(std::fs::read(&part).unwrap(), b"xyz");
    std::fs::write(&part, b"xyzxyz").unwrap();
    meta["completed"] = serde_json::json!(6);
    meta["prefixSha256"] = serde_json::json!(catalog::hash(b"xyzxyz"));
    paths::write_record(&record, &meta).unwrap();
    assert_eq!(
        space_budget(&selected, &prepared, &flag).unwrap().0,
        catalog::SPACE_RESERVE + 6,
        "completed but wrong full SHA receives no credit"
    );
    let target = directory.child(&spec.relative, true).unwrap();
    std::fs::write(&target, b"abcdef").unwrap();
    assert_eq!(
        space_budget(&selected, &prepared, &flag).unwrap().0,
        catalog::SPACE_RESERVE
    );
    std::fs::write(&target, b"xxxxxx").unwrap();
    assert!(space_budget(&selected, &prepared, &flag).is_err());
    assert_eq!(std::fs::read(target).unwrap(), b"xxxxxx");
}
