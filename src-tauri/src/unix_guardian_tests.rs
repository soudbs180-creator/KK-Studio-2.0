use super::{inherit_for_guardian, lock};
use serde_json::{json, Value};
use std::fs;
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

fn directory() -> PathBuf {
    let path = std::env::temp_dir().join(format!(
        "kk-unix-guardian-{}-{}",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    ));
    fs::create_dir(&path).unwrap();
    // A real grandchild ignores TERM, keeps writing, and remains in the group.
    let fixture = r#"
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
const control=createInterface({input:process.stdin});
control.once('line',()=>{
 const child=spawn(process.execPath,['-e',"process.on('SIGTERM',()=>{});const fs=require('fs');let n=0;setInterval(()=>fs.writeFileSync('writes.txt',String(++n)),10)"],{stdio:'ignore'});
 writeFileSync('group.json',JSON.stringify({group:process.pid,grandchild:child.pid}));
 process.stdout.write('KK_AGENT_READY '+JSON.stringify({pid:process.pid,endpoint:'http://127.0.0.1:43123',token:'a'.repeat(64)})+'\n');
});
control.once('close',()=>process.exit(0));
setInterval(()=>process.stdout.write('fixture runtime log\n'),20);
"#;
    fs::write(path.join("fixture.mjs"), fixture).unwrap();
    path
}

fn spawn_guardian(directory: &Path, owner: &fs::File) -> Child {
    let node = std::env::var("KK_TEST_AGENT_NODE").unwrap_or_else(|_| "node".into());
    let guardian = Path::new(env!("CARGO_MANIFEST_DIR")).join("../scripts/agent/unix-guardian.mjs");
    let mut command = tokio::process::Command::new(node);
    command
        .arg(guardian)
        .arg(directory.join("fixture.mjs"))
        .current_dir(directory)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit());
    let inherited_owner = inherit_for_guardian(&mut command, owner).unwrap();
    let child = command.into_std().spawn().unwrap();
    drop(inherited_owner);
    child
}

fn readiness(child: &mut Child) -> Value {
    child.stdin.as_mut().unwrap().write_all(b"start\n").unwrap();
    let stdout = child.stdout.take().unwrap();
    let (send, receive) = std::sync::mpsc::channel();
    std::thread::spawn(move || {
        let mut line = String::new();
        let mut reader = BufReader::new(stdout);
        let result = reader.read_line(&mut line).map(|_| line);
        let _ = send.send(result);
        // Native also drains diagnostics after readiness. The SIGKILL fixture
        // closes this pipe abruptly while the owned child continues logging.
        let _ = std::io::copy(&mut reader, &mut std::io::sink());
    });
    let line = receive
        .recv_timeout(Duration::from_secs(5))
        .unwrap()
        .unwrap();
    serde_json::from_str(line.trim().strip_prefix("KK_AGENT_READY ").unwrap()).unwrap()
}

fn readiness_with_output_disconnect(child: &mut Child) -> (Value, std::sync::mpsc::Sender<()>) {
    child.stdin.as_mut().unwrap().write_all(b"start\n").unwrap();
    let stdout = child.stdout.take().unwrap();
    let (ready_send, ready_receive) = std::sync::mpsc::channel();
    let (disconnect_send, disconnect_receive) = std::sync::mpsc::channel();
    std::thread::spawn(move || {
        let mut line = String::new();
        let mut reader = BufReader::new(stdout);
        let result = reader.read_line(&mut line).map(|_| line);
        let _ = ready_send.send(result);
        // Keep the read end alive until the grandchild has started writing.
        // Closing only this pipe must reclaim the tree while stdin stays open.
        let _ = disconnect_receive.recv();
        drop(reader);
    });
    let line = ready_receive
        .recv_timeout(Duration::from_secs(5))
        .unwrap()
        .unwrap();
    let ready = serde_json::from_str(line.trim().strip_prefix("KK_AGENT_READY ").unwrap()).unwrap();
    (ready, disconnect_send)
}

fn group_exists(group: i32) -> bool {
    let result = unsafe { libc::kill(-group, 0) };
    if result == 0 {
        return true;
    }
    assert_eq!(
        std::io::Error::last_os_error().raw_os_error(),
        Some(libc::ESRCH)
    );
    false
}

fn wait_exit(child: &mut Child) {
    let deadline = Instant::now() + Duration::from_secs(8);
    while child.try_wait().unwrap().is_none() {
        assert!(
            Instant::now() < deadline,
            "owned fixture must exit without releasing a live writer lease"
        );
        std::thread::sleep(Duration::from_millis(25));
    }
}

#[test]
fn eof_keeps_inherited_owner_lock_until_child_and_grandchild_stop() {
    let directory = directory();
    let owner = lock(&directory).unwrap();
    let mut guardian = spawn_guardian(&directory, &owner);
    let ready = readiness(&mut guardian);
    assert_eq!(ready["pid"].as_u64(), Some(guardian.id() as u64));
    let group: Value =
        serde_json::from_slice(&fs::read(directory.join("group.json")).unwrap()).unwrap();
    let group_id = group["group"].as_i64().unwrap() as i32;
    // Let the grandchild install its TERM handler before the EOF scenario.
    let deadline = Instant::now() + Duration::from_secs(3);
    while !directory.join("writes.txt").is_file() {
        assert!(Instant::now() < deadline);
        std::thread::sleep(Duration::from_millis(10));
    }
    drop(owner);
    assert!(
        lock(&directory).is_err(),
        "guardian must retain the actual inherited flock"
    );
    drop(guardian.stdin.take());
    std::thread::sleep(Duration::from_millis(100));
    assert!(
        lock(&directory).is_err(),
        "TERM-ignoring grandchild still owns the writer interval"
    );
    wait_exit(&mut guardian);
    assert!(!group_exists(group_id));
    let final_write = fs::read(directory.join("writes.txt")).unwrap();
    std::thread::sleep(Duration::from_millis(50));
    assert_eq!(fs::read(directory.join("writes.txt")).unwrap(), final_write);
    drop(lock(&directory).unwrap());
    fs::remove_dir_all(directory).unwrap();
}

#[test]
fn stdout_disconnect_reclaims_logging_tree_while_control_input_is_open() {
    let directory = directory();
    let owner = lock(&directory).unwrap();
    let mut guardian = spawn_guardian(&directory, &owner);
    let (ready, disconnect) = readiness_with_output_disconnect(&mut guardian);
    assert_eq!(ready["pid"].as_u64(), Some(guardian.id() as u64));
    let group: Value =
        serde_json::from_slice(&fs::read(directory.join("group.json")).unwrap()).unwrap();
    let group_id = group["group"].as_i64().unwrap() as i32;
    let deadline = Instant::now() + Duration::from_secs(3);
    while !directory.join("writes.txt").is_file() {
        assert!(Instant::now() < deadline);
        std::thread::sleep(Duration::from_millis(10));
    }
    drop(owner);
    assert!(lock(&directory).is_err());
    disconnect.send(()).unwrap();
    std::thread::sleep(Duration::from_millis(100));
    assert!(
        lock(&directory).is_err(),
        "output loss must retain the lease through the TERM-ignoring writer interval"
    );
    // Do not close the control pipe: output loss alone must start cleanup.
    wait_exit(&mut guardian);
    assert!(!group_exists(group_id));
    let final_write = fs::read(directory.join("writes.txt")).unwrap();
    std::thread::sleep(Duration::from_millis(50));
    assert_eq!(fs::read(directory.join("writes.txt")).unwrap(), final_write);
    drop(guardian.stdin.take());
    drop(lock(&directory).unwrap());
    fs::remove_dir_all(directory).unwrap();
}

#[test]
#[ignore = "subprocess fixture, invoked only by the parent SIGKILL test"]
fn owner_parent_process_fixture() {
    let directory = PathBuf::from(
        std::env::var_os("KK_GUARDIAN_PARENT_FIXTURE").expect("fixture directory required"),
    );
    let owner = lock(&directory).unwrap();
    let mut guardian = spawn_guardian(&directory, &owner);
    readiness(&mut guardian);
    fs::write(
        directory.join("parent-ready.json"),
        serde_json::to_vec(&json!({"guardian":guardian.id()})).unwrap(),
    )
    .unwrap();
    loop {
        std::thread::sleep(Duration::from_secs(1));
    }
}

#[test]
fn native_parent_sigkill_triggers_eof_without_killing_an_external_instance() {
    let directory = directory();
    let mut external =
        Command::new(std::env::var("KK_TEST_AGENT_NODE").unwrap_or_else(|_| "node".into()))
            .args(["-e", "setInterval(()=>{},1000)"])
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .unwrap();
    let mut parent = Command::new(std::env::current_exe().unwrap())
        .args([
            "--exact",
            "agent_owner::unix_tests::owner_parent_process_fixture",
            "--ignored",
            "--nocapture",
        ])
        .env("KK_GUARDIAN_PARENT_FIXTURE", &directory)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::inherit())
        .spawn()
        .unwrap();
    let deadline = Instant::now() + Duration::from_secs(5);
    while !directory.join("parent-ready.json").is_file() || !directory.join("writes.txt").is_file()
    {
        assert!(
            Instant::now() < deadline,
            "native parent fixture must become ready"
        );
        std::thread::sleep(Duration::from_millis(20));
    }
    let group: Value =
        serde_json::from_slice(&fs::read(directory.join("group.json")).unwrap()).unwrap();
    let group_id = group["group"].as_i64().unwrap() as i32;
    assert!(lock(&directory).is_err());
    // This is the exact child we spawned, never a PID recovered from user data.
    parent.kill().unwrap();
    parent.wait().unwrap();
    std::thread::sleep(Duration::from_millis(100));
    assert!(
        lock(&directory).is_err(),
        "parent death must not release the surviving guardian lease early"
    );
    let deadline = Instant::now() + Duration::from_secs(8);
    loop {
        if let Ok(owner) = lock(&directory) {
            drop(owner);
            break;
        }
        assert!(Instant::now() < deadline);
        std::thread::sleep(Duration::from_millis(25));
    }
    assert!(!group_exists(group_id));
    assert!(
        external.try_wait().unwrap().is_none(),
        "unrelated Agent process must remain alive"
    );
    external.kill().unwrap();
    external.wait().unwrap();
    fs::remove_dir_all(directory).unwrap();
}
