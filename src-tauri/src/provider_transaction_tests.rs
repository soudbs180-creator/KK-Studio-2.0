use super::*;
use serde_json::json;
use std::collections::HashMap;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::{
    atomic::{AtomicBool, AtomicUsize, Ordering},
    mpsc, Arc, Mutex,
};
use std::time::{Duration, Instant};

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
    let _isolation = provider_test_guard();
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
    let _isolation = provider_test_guard();
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
    let _isolation = provider_test_guard();
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
    let _isolation = provider_test_guard();
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
    let _isolation = provider_test_guard();
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
    let _isolation = provider_test_guard();
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
    let _isolation = provider_test_guard();
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

// A file fixture survives the killed child; it never calls the real OS vault.
struct ProcessVault {
    root: PathBuf,
    pause_at: String,
}
impl ProcessVault {
    fn pause(&self, stage: &str) {
        if self.pause_at == stage {
            std::fs::write(self.root.join("stage"), stage).unwrap();
            loop {
                std::thread::park();
            }
        }
    }
}
impl CredentialVault for ProcessVault {
    fn set(&self, id: &str, secret: &str) -> Result<(), String> {
        assert_eq!(id, "synthetic_account");
        self.pause("after-metadata");
        let mut file = std::fs::File::create(self.root.join("fixture-vault"))
            .map_err(|_| "Fixture vault open failed")?;
        file.write_all(secret.as_bytes())
            .and_then(|_| file.sync_all())
            .map_err(|_| "Fixture vault write failed")?;
        let mut writes = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(self.root.join("vault-writes"))
            .map_err(|_| "Fixture counter open failed")?;
        writes
            .write_all(b"set\n")
            .and_then(|_| writes.sync_all())
            .map_err(|_| "Fixture counter write failed")?;
        self.pause("after-vault");
        Ok(())
    }
    fn delete(&self, _id: &str) -> Result<(), String> {
        Err("Unexpected fixture vault deletion".into())
    }
}

struct OwnedProcess(Child);
impl OwnedProcess {
    fn start(root: &Path, stage: &str, revision: u64) -> Self {
        Self(
            Command::new(std::env::current_exe().unwrap())
                .args([
                    "--exact",
                    "provider_transaction::tests::credential_process_child_probe",
                    "--nocapture",
                ])
                .env("KK_PROVIDER_PROCESS_ROOT", root)
                .env("KK_PROVIDER_PROCESS_STAGE", stage)
                .env("KK_PROVIDER_PROCESS_REVISION", revision.to_string())
                .env_remove("OPENAI_API_KEY")
                .env_remove("CODEX_API_KEY")
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .spawn()
                .unwrap(),
        )
    }
    fn wait_for_marker(&mut self, marker: &Path) {
        let deadline = Instant::now() + Duration::from_secs(5);
        while !marker.exists() {
            assert!(
                self.0.try_wait().unwrap().is_none(),
                "Owned child exited before its stage"
            );
            assert!(
                Instant::now() < deadline,
                "Owned child did not reach its stage"
            );
            std::thread::sleep(Duration::from_millis(20));
        }
    }
    fn wait_for_success(&mut self, outcome_path: &Path) {
        let deadline = Instant::now() + Duration::from_secs(5);
        loop {
            if let Some(status) = self.0.try_wait().unwrap() {
                let diagnostic = std::fs::read(outcome_path)
                    .ok()
                    .and_then(|bytes| serde_json::from_slice::<Value>(&bytes).ok());
                let kind = diagnostic
                    .as_ref()
                    .and_then(|value| value["failureKind"].as_str())
                    .unwrap_or("no diagnostic");
                assert!(status.success(), "Owned contender failed: {kind}");
                return;
            }
            assert!(Instant::now() < deadline, "Owned contender did not finish");
            std::thread::sleep(Duration::from_millis(20));
        }
    }
}
impl Drop for OwnedProcess {
    fn drop(&mut self) {
        if self.0.try_wait().ok().flatten().is_none() {
            let _ = self.0.kill();
        }
        let _ = self.0.wait();
    }
}

fn process_test_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("target/provider-transaction-tests")
}
struct OwnedProcessDirectory(PathBuf);
impl Drop for OwnedProcessDirectory {
    fn drop(&mut self) {
        if let (Ok(root), Ok(allowed)) = (
            std::fs::canonicalize(&self.0),
            std::fs::canonicalize(process_test_root()),
        ) {
            if root != allowed && root.starts_with(allowed) {
                let _ = std::fs::remove_dir_all(root);
            }
        }
    }
}
fn process_secret(root: &Path, stage: &str) -> String {
    format!(
        "synthetic-secret-{stage}-{}",
        root.file_name().unwrap().to_string_lossy()
    )
}
fn vault_write_count(root: &Path) -> usize {
    match std::fs::read_to_string(root.join("vault-writes")) {
        Ok(value) => value.lines().count(),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => 0,
        Err(_) => panic!("Fixture counter must remain readable"),
    }
}
fn assert_process_records_omit_secrets(root: &Path) {
    for entry in std::fs::read_dir(root).unwrap() {
        let entry = entry.unwrap();
        if entry.file_name() != "fixture-vault" {
            let bytes = std::fs::read(entry.path()).unwrap();
            assert!(
                !String::from_utf8_lossy(&bytes).contains("synthetic-secret-"),
                "Metadata, backup, stage and outcome records must omit fixture secrets"
            );
        }
    }
}

#[test]
fn credential_process_child_probe() {
    let Some(root) = std::env::var_os("KK_PROVIDER_PROCESS_ROOT") else {
        return;
    };
    let root = std::fs::canonicalize(root).unwrap();
    let allowed = std::fs::canonicalize(process_test_root()).unwrap();
    assert!(
        root != allowed && root.starts_with(allowed),
        "Fixture path must be owned"
    );
    let stage = std::env::var("KK_PROVIDER_PROCESS_STAGE").unwrap();
    assert!(matches!(
        stage.as_str(),
        "after-metadata" | "after-vault" | "contender-A" | "contender-B"
    ));
    let revision = std::env::var("KK_PROVIDER_PROCESS_REVISION")
        .unwrap()
        .parse()
        .unwrap();
    if stage.starts_with("contender-") {
        std::fs::write(root.join(format!("{stage}.ready")), b"ready").unwrap();
        let deadline = Instant::now() + Duration::from_secs(5);
        while !root.join("release").exists() {
            assert!(Instant::now() < deadline, "Contenders were not released");
            std::thread::sleep(Duration::from_millis(20));
        }
    }
    let repository = ProviderConfigRepository::new(root.join("connections.json"));
    let vault = ProcessVault {
        root: root.clone(),
        pause_at: stage.clone(),
    };
    let outcome = match commit_provider_connection(
        &repository,
        &vault,
        metadata(&stage),
        Some(revision),
        Some("synthetic_account"),
        Some(&process_secret(&root, &stage)),
        false,
    ) {
        Ok(receipt) => json!({ "status":"committed", "receipt":receipt }),
        Err(error) if error.starts_with("conflict:") => json!({ "status":"conflict" }),
        Err(error) => {
            let kind = if error.starts_with("lock: 上次凭据保存异常中断") {
                "abandoned-mutex"
            } else if error.starts_with("lock:") {
                "lock"
            } else {
                "unexpected-commit-error"
            };
            let diagnostic = json!({ "status":"failed", "failureKind":kind });
            std::fs::write(
                root.join(format!("{stage}.outcome")),
                serde_json::to_vec(&diagnostic).unwrap(),
            )
            .unwrap();
            panic!("Owned child commit failed: {kind}");
        }
    };
    std::fs::write(
        root.join(format!("{stage}.outcome")),
        serde_json::to_vec(&outcome).unwrap(),
    )
    .unwrap();
}

#[test]
fn killed_writer_preserves_complete_records_without_claiming_atomic_rollback() {
    let _isolation = provider_test_guard();
    for stage in ["after-metadata", "after-vault"] {
        let (root, repository) = repository(stage);
        let _directory = OwnedProcessDirectory(root.clone());
        repository.write(metadata("old"), None).unwrap();
        std::fs::write(root.join("fixture-vault"), process_secret(&root, "old")).unwrap();
        let mut child = OwnedProcess::start(&root, stage, 1);
        child.wait_for_marker(&root.join("stage"));
        assert_eq!(std::fs::read_to_string(root.join("stage")).unwrap(), stage);
        assert!(
            child.0.try_wait().unwrap().is_none(),
            "Fault stage must precede process completion"
        );
        child.0.kill().unwrap();
        assert!(
            !child.0.wait().unwrap().success(),
            "Owned child must be forcibly stopped"
        );
        assert!(
            !root.join(format!("{stage}.outcome")).exists(),
            "A killed writer must have no success receipt"
        );
        // Abandonment is observable only while another handle keeps the mutex alive.
        let observed = match repository.read() {
            Ok(value) => value,
            Err(error) => {
                assert!(error.starts_with("lock: 上次凭据保存异常中断"));
                repository.read().unwrap()
            }
        };
        assert_eq!(observed.revision, Some(2));
        assert_eq!(observed.connections, metadata(stage));
        let backup = ProviderConfigRepository::new(root.join("connections.json.bak"))
            .read()
            .unwrap();
        assert_eq!(backup.revision, Some(1));
        assert_eq!(backup.connections, metadata("old"));
        let expected_secret = process_secret(
            &root,
            if stage == "after-metadata" {
                "old"
            } else {
                stage
            },
        );
        assert!(
            std::fs::read_to_string(root.join("fixture-vault")).unwrap() == expected_secret,
            "The completed vault value must survive"
        );
        let writes = vault_write_count(&root);
        assert_eq!(writes, usize::from(stage == "after-vault"));
        for _ in 0..2 {
            assert_eq!(repository.read().unwrap().connections, metadata(stage));
            assert!(
                std::fs::read_to_string(root.join("fixture-vault")).unwrap() == expected_secret,
                "Re-reading must preserve the vault value"
            );
            assert_eq!(
                vault_write_count(&root),
                writes,
                "Recovery reads must not write the vault"
            );
        }
        assert_process_records_omit_secrets(&root);
    }
}

#[test]
fn same_revision_process_contenders_commit_one_matching_pair_and_never_touch_the_losers_vault() {
    let _isolation = provider_test_guard();
    let (root, repository) = repository("process-contenders");
    let _directory = OwnedProcessDirectory(root.clone());
    repository.write(metadata("old"), None).unwrap();
    std::fs::write(root.join("fixture-vault"), process_secret(&root, "old")).unwrap();
    let mut a = OwnedProcess::start(&root, "contender-A", 1);
    let mut b = OwnedProcess::start(&root, "contender-B", 1);
    a.wait_for_marker(&root.join("contender-A.ready"));
    b.wait_for_marker(&root.join("contender-B.ready"));
    std::fs::write(root.join("release"), b"release").unwrap();
    a.wait_for_success(&root.join("contender-A.outcome"));
    b.wait_for_success(&root.join("contender-B.outcome"));
    let outcomes: Vec<(String, Value)> = ["contender-A", "contender-B"]
        .into_iter()
        .map(|stage| {
            (
                stage.to_string(),
                serde_json::from_slice(
                    &std::fs::read(root.join(format!("{stage}.outcome"))).unwrap(),
                )
                .unwrap(),
            )
        })
        .collect();
    let winners: Vec<_> = outcomes
        .iter()
        .filter(|(_, value)| value["status"] == "committed")
        .collect();
    assert_eq!(winners.len(), 1);
    assert_eq!(
        outcomes
            .iter()
            .filter(|(_, value)| value["status"] == "conflict")
            .count(),
        1
    );
    let (winner, outcome) = winners[0];
    assert_eq!(outcome["receipt"]["revision"], 2);
    assert_eq!(outcome["receipt"]["credentialState"], "saved");
    assert_eq!(repository.read().unwrap().connections, metadata(winner));
    assert!(
        std::fs::read_to_string(root.join("fixture-vault")).unwrap()
            == process_secret(&root, winner),
        "Metadata and vault must belong to the same winner"
    );
    assert_eq!(
        vault_write_count(&root),
        1,
        "A stale revision must not reach the vault"
    );
    assert_process_records_omit_secrets(&root);
}
