use super::super::catalog::Selection;
use super::*;
fn report() -> Value {
    serde_json::json!({"status":"supported","platform":"windows","measuredAtMs":now(),"os":{"architecture":"x86_64"},"memory":{"availableBytes":64*1024u64.pow(3)},"gpus":[{"computeBackend":"cuda-reported","freeBytes":16*1024u64.pow(3)}],"cpu":{"logicalCores":24}})
}
#[test]
fn runtime_authorization_is_fresh_and_gpu_needs_real_lease() {
    let p = catalog::prepare(Selection {
        package_ids: vec!["qwen3.5-4b-q4-k-m".into()],
        runtime_backend: "cpu".into(),
    })
    .unwrap();
    let auth = RuntimeAuthorization::from_native_report(&report(), None).unwrap();
    assert!(auth.check(&p.packages[0], "cpu").is_ok());
    assert!(auth
        .check(&p.packages[0], "cuda-13.4")
        .unwrap_err()
        .starts_with("unsupported:"));
    let mut old = report();
    old["measuredAtMs"] = serde_json::json!(now() - 61000);
    assert!(RuntimeAuthorization::from_native_report(&old, None).is_err());
    let mut multi = report();
    multi["gpus"]
        .as_array_mut()
        .unwrap()
        .push(serde_json::json!({"computeBackend":"cuda-reported","freeBytes":24*1024u64.pow(3)}));
    let auth = RuntimeAuthorization::from_native_report(&multi, Some(Box::new(()))).unwrap();
    assert!(auth.check(&p.packages[0], "cuda-13.4").is_err());
}
#[test]
fn launch_parameters_are_offline_private_and_tool_free() {
    let args = arguments(
        Path::new("C:/models/model.gguf"),
        Path::new("C:/models/mmproj.gguf"),
        "fixture",
        12345,
        4096,
        4,
        "cpu",
    )
    .unwrap();
    for flag in [
        "--offline",
        "--no-agent",
        "--no-webui",
        "--no-ui-mcp-proxy",
        "--no-slots",
        "--no-mmproj-auto",
    ] {
        assert!(args.iter().any(|a| a == flag));
    }
    assert!(!args
        .iter()
        .any(|a| a == "--api-key" || a == "--tools" || a == "--hf-repo"));
    assert_eq!(literal("a'b").unwrap(), "'a''b'");
    assert!(literal("x\ny").is_err());
}
#[cfg(windows)]
#[tokio::test]
async fn trusted_fixture_runs_after_gate_and_owned_stop_preserves_external_process() {
    let root = super::super::fixture::Root::new();
    let marker = root.0.join("gate.txt");
    let executable = paths::system_directory()
        .unwrap()
        .join("WindowsPowerShell/v1.0/powershell.exe");
    let text = format!(
        "[IO.File]::WriteAllText({}, 'ready'); Start-Sleep -Seconds 60",
        literal(&marker.to_string_lossy()).unwrap()
    );
    let args = vec![
        "-NoProfile".into(),
        "-NonInteractive".into(),
        "-Command".into(),
        text,
    ];
    let (mut child, job) = spawn(&executable, &args, "fixture-private-session")
        .await
        .unwrap();
    let (mut external, external_job) = spawn(
        &executable,
        &[
            "-NoProfile".into(),
            "-NonInteractive".into(),
            "-Command".into(),
            "Start-Sleep -Seconds 60".into(),
        ],
        "other-private-session",
    )
    .await
    .unwrap();
    for _ in 0..100 {
        if marker.exists() {
            break;
        }
        tokio::time::sleep(Duration::from_millis(30)).await;
    }
    assert_eq!(std::fs::read_to_string(&marker).unwrap(), "ready");
    drop(job);
    tokio::time::timeout(Duration::from_secs(5), child.wait())
        .await
        .unwrap()
        .unwrap();
    assert!(external.try_wait().unwrap().is_none());
    drop(external_job);
    tokio::time::timeout(Duration::from_secs(5), external.wait())
        .await
        .unwrap()
        .unwrap();
}

#[cfg(windows)]
#[tokio::test]
async fn authenticated_health_requires_exact_instance_and_does_not_verify_inference() {
    use super::super::fixture::server;
    let executable = paths::system_directory()
        .unwrap()
        .join("WindowsPowerShell/v1.0/powershell.exe");
    let args = [
        "-NoProfile".into(),
        "-NonInteractive".into(),
        "-Command".into(),
        "Start-Sleep -Seconds 60".into(),
    ];
    let respond = |value: Value| {
        let body = serde_json::to_vec(&value).unwrap();
        [
            format!(
                "HTTP/1.1 200 OK\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                body.len()
            )
            .as_bytes(),
            body.as_slice(),
        ]
        .concat()
    };
    let (endpoint,http)=server(vec![respond(serde_json::json!({"data":[{"id":"kk-fixture"}]})),respond(serde_json::json!({"build_info":"b11429-d812350","total_slots":1,"model_path":"C:/fixture/model.gguf","modalities":{"vision":true}}))]).await;
    let (child, job) = spawn(&executable, &args, "fixture-health-private")
        .await
        .unwrap();
    let mut owned = OwnedRuntime {
        owner: "a".into(),
        status: RuntimeStatus::new(&"a".repeat(32), Some("b".repeat(32)), "starting"),
        endpoint,
        secret: Zeroizing::new("fixture-health-private".into()),
        alias: "kk-fixture".into(),
        model: PathBuf::from("C:/fixture/model.gguf"),
        job: Some(job),
        child,
        _authorization: RuntimeAuthorization::from_native_report(&report(), None).unwrap(),
    };
    assert!(loaded(&owned).await.unwrap());
    for request in http.await.unwrap() {
        assert!(request
            .to_ascii_lowercase()
            .contains("authorization: bearer fixture-health-private"));
    }
    assert_eq!(owned.status.inference, "unverified");
    assert_eq!(owned.status.tools, "unverified");
    let (endpoint, http) = server(vec![respond(
        serde_json::json!({"data":[{"id":"foreign-instance"}]}),
    )])
    .await;
    owned.endpoint = endpoint;
    assert!(loaded(&owned).await.unwrap_err().contains("当前模型实例"));
    http.await.unwrap();
    let root = super::super::fixture::Root::new();
    let manager = LocalModelManager::new(root.0.clone());
    *manager.runtime.lock().await = Some(owned);
    assert!(manager
        .stop_owned("b", &"b".repeat(32))
        .await
        .err()
        .unwrap()
        .starts_with("permission:"));
    assert!(manager
        .stop_owned("a", &"c".repeat(32))
        .await
        .err()
        .unwrap()
        .starts_with("missing:"));
    assert_eq!(
        manager
            .stop_owned("a", &"b".repeat(32))
            .await
            .unwrap()
            .state,
        "stopped"
    );
    assert!(manager.runtime_status().await.is_none());
}

#[tokio::test]
async fn hardware_authorization_is_collected_after_verification_and_must_still_be_fresh() {
    use std::sync::atomic::{AtomicBool, Ordering};
    let verified = AtomicBool::new(false);
    let called = AtomicBool::new(false);
    let invalid = authorize_verified(
        async { Err("integrity: fixture verification failed".into()) },
        || async {
            called.store(true, Ordering::Release);
            RuntimeAuthorization::from_native_report(&report(), None)
        },
    )
    .await;
    assert!(invalid.is_err());
    assert!(!called.load(Ordering::Acquire));
    let valid = authorize_verified(
        async {
            verified.store(true, Ordering::Release);
            Ok(())
        },
        || async {
            assert!(verified.load(Ordering::Acquire));
            called.store(true, Ordering::Release);
            RuntimeAuthorization::from_native_report(&report(), None)
        },
    )
    .await;
    assert!(valid.is_ok());
    assert!(called.load(Ordering::Acquire));
    let mut stale = RuntimeAuthorization::from_native_report(&report(), None).unwrap();
    stale.checked_at = now() - 61000;
    assert!(
        authorize_verified(async { Ok(()) }, || async move { Ok(stale) })
            .await
            .is_err()
    );
}

#[cfg(windows)]
#[tokio::test]
async fn ownership_gate_eof_never_executes_the_target() {
    let root = super::super::fixture::Root::new();
    let marker = root.0.join("must-not-run.txt");
    let executable = paths::system_directory()
        .unwrap()
        .join("WindowsPowerShell/v1.0/powershell.exe");
    let args = vec![
        "-NoProfile".into(),
        "-NonInteractive".into(),
        "-Command".into(),
        format!(
            "[IO.File]::WriteAllText({},'forbidden')",
            literal(&marker.to_string_lossy()).unwrap()
        ),
    ];
    let status = tokio::time::timeout(
        Duration::from_secs(3),
        tokio::process::Command::new(&executable)
            .args([
                "-NoLogo",
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                &launch_script(&executable, &args).unwrap(),
            ])
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .kill_on_drop(true)
            .creation_flags(0x08000000)
            .status(),
    )
    .await
    .unwrap()
    .unwrap();
    assert!(!status.success());
    assert!(!marker.exists());
}
