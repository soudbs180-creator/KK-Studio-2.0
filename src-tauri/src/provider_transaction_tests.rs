use super::*;
use serde_json::json;
use std::collections::HashMap;
use std::sync::{
    atomic::{AtomicBool, AtomicUsize, Ordering},
    mpsc, Arc, Mutex,
};
use std::time::Duration;

#[derive(Default)]
struct FixtureVault {
    values: Mutex<HashMap<String, String>>,
    writes: AtomicUsize,
    fail: AtomicBool,
    pause: Mutex<Option<(mpsc::Sender<()>, mpsc::Receiver<()>)>>,
}
impl CredentialVault for FixtureVault {
    fn set(&self, id: &str, secret: &str) -> Result<(), String> {
        self.writes.fetch_add(1, Ordering::SeqCst);
        if self.fail.load(Ordering::SeqCst) {
            return Err("synthetic vault unavailable".into());
        }
        if secret == "synthetic-A" {
            if let Some((started, resume)) = self.pause.lock().unwrap().take() {
                started.send(()).unwrap();
                resume.recv().unwrap();
            }
        }
        self.values.lock().unwrap().insert(id.into(), secret.into());
        Ok(())
    }
    fn delete(&self, id: &str) -> Result<(), String> {
        self.writes.fetch_add(1, Ordering::SeqCst);
        if self.fail.load(Ordering::SeqCst) {
            return Err("synthetic vault unavailable".into());
        }
        self.values.lock().unwrap().remove(id);
        Ok(())
    }
}
fn repository(label: &str) -> (std::path::PathBuf, Arc<ProviderConfigRepository>) {
    let root = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("target/provider-transaction-tests")
        .join(format!(
            "{label}-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
    std::fs::create_dir_all(&root).unwrap();
    (
        root.clone(),
        Arc::new(ProviderConfigRepository::new(root.join("connections.json"))),
    )
}
fn metadata(model: &str) -> Value {
    json!([{ "id":"synthetic-account", "credentialRef":"synthetic_account", "model":model }])
}

#[test]
fn cas_failure_never_touches_the_old_vault() {
    let (_, repo) = repository("cas");
    repo.write(metadata("old"), None).unwrap();
    let vault = FixtureVault::default();
    vault
        .values
        .lock()
        .unwrap()
        .insert("synthetic_account".into(), "synthetic-old".into());
    assert!(commit_provider_connection(
        &repo,
        &vault,
        metadata("new"),
        Some(99),
        Some("synthetic_account"),
        Some("synthetic-new"),
        false
    )
    .is_err());
    assert_eq!(vault.writes.load(Ordering::SeqCst), 0);
    assert_eq!(repo.read().unwrap().connections, metadata("old"));
    assert_eq!(
        vault
            .values
            .lock()
            .unwrap()
            .get("synthetic_account")
            .map(String::as_str),
        Some("synthetic-old")
    );
}

#[test]
fn vault_failure_restores_the_owned_metadata_without_rewriting_the_key() {
    let (_, repo) = repository("vault-failure");
    repo.write(metadata("old"), None).unwrap();
    let vault = FixtureVault::default();
    vault
        .values
        .lock()
        .unwrap()
        .insert("synthetic_account".into(), "synthetic-old".into());
    vault.fail.store(true, Ordering::SeqCst);
    let error = commit_provider_connection(
        &repo,
        &vault,
        metadata("new"),
        Some(1),
        Some("synthetic_account"),
        Some("synthetic-new"),
        false,
    )
    .unwrap_err();
    assert!(error.starts_with("credential:"));
    assert_eq!(repo.read().unwrap().connections, metadata("old"));
    assert_eq!(vault.writes.load(Ordering::SeqCst), 1);
    assert_eq!(
        vault
            .values
            .lock()
            .unwrap()
            .get("synthetic_account")
            .map(String::as_str),
        Some("synthetic-old")
    );
}

#[test]
fn first_save_vault_failure_restores_missing_metadata() {
    let (_, repo) = repository("first-failure");
    let vault = FixtureVault::default();
    vault.fail.store(true, Ordering::SeqCst);
    assert!(commit_provider_connection(
        &repo,
        &vault,
        metadata("new"),
        None,
        Some("synthetic_account"),
        Some("synthetic-new"),
        false
    )
    .is_err());
    assert_eq!(repo.read().unwrap().status, "missing");
}

#[test]
fn receipt_and_metadata_never_contain_the_request_secret() {
    let (root, repo) = repository("secret-isolation");
    let vault = FixtureVault::default();
    let receipt = commit_provider_connection(
        &repo,
        &vault,
        metadata("new"),
        None,
        Some("synthetic_account"),
        Some("synthetic-request-secret"),
        false,
    )
    .unwrap();
    assert_eq!(receipt.credential_state, "saved");
    assert!(!serde_json::to_string(&receipt)
        .unwrap()
        .contains("synthetic-request-secret"));
    assert!(!std::fs::read_to_string(root.join("connections.json"))
        .unwrap()
        .contains("synthetic-request-secret"));
    let removed = commit_provider_connection(
        &repo,
        &vault,
        metadata("new"),
        Some(receipt.revision),
        Some("synthetic_account"),
        None,
        true,
    )
    .unwrap();
    assert_eq!(removed.credential_state, "missing");
    assert!(!vault
        .values
        .lock()
        .unwrap()
        .contains_key("synthetic_account"));
}

#[test]
fn independent_handles_cannot_read_or_write_between_metadata_and_vault_commit() {
    let (_, repo) = repository("interleaving");
    let vault = Arc::new(FixtureVault::default());
    let (started, waiting) = mpsc::channel();
    let (resume, released) = mpsc::channel();
    *vault.pause.lock().unwrap() = Some((started, released));
    let a_repo = Arc::clone(&repo);
    let a_vault = Arc::clone(&vault);
    let a = std::thread::spawn(move || {
        commit_provider_connection(
            &a_repo,
            a_vault.as_ref(),
            metadata("model-A"),
            None,
            Some("synthetic_account"),
            Some("synthetic-A"),
            false,
        )
        .unwrap()
    });
    waiting.recv_timeout(Duration::from_secs(2)).unwrap();
    let (read, observed) = mpsc::channel();
    let b_repo = Arc::clone(&repo);
    let b_vault = Arc::clone(&vault);
    let b = std::thread::spawn(move || {
        let previous = b_repo.read().unwrap();
        read.send(()).unwrap();
        commit_provider_connection(
            &b_repo,
            b_vault.as_ref(),
            metadata("model-B"),
            previous.revision,
            Some("synthetic_account"),
            Some("synthetic-B"),
            false,
        )
        .unwrap()
    });
    assert!(observed.recv_timeout(Duration::from_millis(50)).is_err());
    resume.send(()).unwrap();
    a.join().unwrap();
    b.join().unwrap();
    assert_eq!(repo.read().unwrap().connections, metadata("model-B"));
    assert_eq!(
        vault
            .values
            .lock()
            .unwrap()
            .get("synthetic_account")
            .map(String::as_str),
        Some("synthetic-B")
    );
}

#[test]
fn invalid_or_nested_secret_metadata_is_rejected_before_vault_io() {
    let (_, repo) = repository("invalid");
    let vault = FixtureVault::default();
    assert!(commit_provider_connection(&repo, &vault, json!([{ "credentialRef":"synthetic_account", "capabilities": { "secret":"synthetic-secret" } }]), None, Some("synthetic_account"), Some("synthetic-request"), false).is_err());
    assert_eq!(vault.writes.load(Ordering::SeqCst), 0);
    assert_eq!(repo.read().unwrap().status, "missing");
}

#[test]
fn mutex_child_probe() {
    let Some(marker) = std::env::var_os("KK_PROVIDER_MUTEX_PROBE") else {
        return;
    };
    let marker = std::path::PathBuf::from(marker);
    let allowed = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("target/provider-transaction-tests");
    assert!(
        marker.starts_with(&allowed),
        "Probe path must remain in the owned test directory"
    );
    std::fs::write(marker.with_extension("started"), b"started").unwrap();
    let _guard = ProviderTransactionGuard::acquire().unwrap();
    std::fs::write(marker, b"acquired").unwrap();
}

#[test]
fn named_mutex_blocks_an_independent_process_until_the_owner_releases_it() {
    let (root, _) = repository("process-lock");
    let marker = root.join("child-acquired");
    let guard = ProviderTransactionGuard::acquire().unwrap();
    let mut child = std::process::Command::new(std::env::current_exe().unwrap())
        .args([
            "--exact",
            "provider_transaction::tests::mutex_child_probe",
            "--nocapture",
        ])
        .env("KK_PROVIDER_MUTEX_PROBE", &marker)
        .env_remove("OPENAI_API_KEY")
        .env_remove("CODEX_API_KEY")
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn()
        .unwrap();
    for _ in 0..80 {
        if marker.with_extension("started").exists() {
            break;
        }
        std::thread::sleep(Duration::from_millis(25));
    }
    if !marker.with_extension("started").exists() {
        let _ = child.kill();
        let _ = child.wait();
        panic!("Owned child did not reach its lock probe");
    }
    std::thread::sleep(Duration::from_millis(50));
    assert!(
        !marker.exists(),
        "Another process must not enter the held transaction"
    );
    drop(guard);
    for _ in 0..80 {
        if child.try_wait().unwrap().is_some() {
            break;
        }
        std::thread::sleep(Duration::from_millis(25));
    }
    if child.try_wait().unwrap().is_none() {
        let _ = child.kill();
        let _ = child.wait();
        panic!("Owned child did not finish after lock release");
    }
    assert!(child.wait().unwrap().success());
    assert!(marker.exists());
}
