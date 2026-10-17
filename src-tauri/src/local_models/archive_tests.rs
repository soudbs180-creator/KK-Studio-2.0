use super::super::fixture::Root;
use super::*;
use std::io::Cursor;
fn zip(entries: &[(&str, &[u8])]) -> Vec<u8> {
    let mut writer = zip::ZipWriter::new(Cursor::new(Vec::new()));
    for (name, bytes) in entries {
        writer
            .start_file(*name, zip::write::SimpleFileOptions::default())
            .unwrap();
        writer.write_all(bytes).unwrap();
    }
    writer.finish().unwrap().into_inner()
}
fn install_zip(directory: &paths::Directory, bytes: &[u8]) -> FileSpec {
    let sha = catalog::hash(bytes);
    let relative = format!("archives/{sha}.zip");
    std::fs::write(directory.child(&relative, true).unwrap(), bytes).unwrap();
    FileSpec {
        relative,
        source: "https://github.com/fixed".into(),
        bytes: bytes.len() as u64,
        sha256: sha,
        archive: true,
    }
}
#[test]
fn fixed_runtime_extracts_only_server_dll_and_notices() {
    let root = Root::new();
    let directory = paths::Directory::open(&root.0).unwrap();
    let bytes = zip(&[
        ("llama-server.exe", b"fixture server"),
        ("ggml.dll", b"fixture library"),
        ("LICENSE.txt", b"fixture license"),
        ("llama-cli.exe", b"unused"),
    ]);
    let spec = install_zip(&directory, &bytes);
    let relative = unpack(&directory, &[spec.clone()], "cpu", &AtomicBool::new(false)).unwrap();
    let receipt = validate(
        &directory,
        &relative,
        &[spec],
        "cpu",
        &AtomicBool::new(false),
    )
    .unwrap();
    assert_eq!(receipt.files.len(), 3);
    assert!(!directory
        .child(&format!("{relative}/llama-cli.exe"), false)
        .unwrap()
        .exists());
}
#[test]
fn unsafe_or_unknown_zip_layout_never_publishes_runtime() {
    for name in [
        "../llama-server.exe",
        "C:/evil.dll",
        "evil:stream",
        "NUL.dll",
        "nested/llama-server.exe",
        "/evil.dll",
    ] {
        let root = Root::new();
        let directory = paths::Directory::open(&root.0).unwrap();
        let spec = install_zip(&directory, &zip(&[(name, b"fixture")]));
        assert!(unpack(&directory, &[spec.clone()], "cpu", &AtomicBool::new(false)).is_err());
        assert!(!directory
            .child(&runtime_relative("cpu", &[spec]), false)
            .unwrap()
            .exists());
    }
}
#[test]
fn case_duplicate_and_cuda_member_collision_are_rejected() {
    for entries in [
        vec![
            ("llama-server.exe", &b"a"[..]),
            ("LLAMA-SERVER.EXE", &b"b"[..]),
        ],
        vec![("ggml.dll", &b"a"[..]), ("GGML.dll", &b"b"[..])],
    ] {
        let root = Root::new();
        let directory = paths::Directory::open(&root.0).unwrap();
        let spec = install_zip(&directory, &zip(&entries));
        assert!(unpack(&directory, &[spec], "cpu", &AtomicBool::new(false)).is_err());
    }
    let root = Root::new();
    let directory = paths::Directory::open(&root.0).unwrap();
    let a = install_zip(
        &directory,
        &zip(&[("llama-server.exe", b"a"), ("lib.dll", b"one")]),
    );
    let b = install_zip(&directory, &zip(&[("lib.dll", b"two")]));
    assert!(
        unpack(&directory, &[a, b], "cuda-13.4", &AtomicBool::new(false))
            .unwrap_err()
            .starts_with("conflict:")
    );
}
#[test]
fn archive_digest_and_future_receipt_prevent_reuse() {
    let root = Root::new();
    let directory = paths::Directory::open(&root.0).unwrap();
    let mut spec = install_zip(&directory, &zip(&[("llama-server.exe", b"a")]));
    spec.sha256 = "0".repeat(64);
    assert!(unpack(&directory, &[spec], "cpu", &AtomicBool::new(false)).is_err());
    let spec = install_zip(&directory, &zip(&[("llama-server.exe", b"future")]));
    let relative = unpack(&directory, &[spec.clone()], "cpu", &AtomicBool::new(false)).unwrap();
    let record = directory
        .child(&format!("{relative}/receipt.json"), false)
        .unwrap();
    std::fs::write(&record, b"{\"version\":99}").unwrap();
    assert!(unpack(&directory, &[spec], "cpu", &AtomicBool::new(false))
        .unwrap_err()
        .starts_with("unsupported:"));
    assert_eq!(std::fs::read(record).unwrap(), b"{\"version\":99}");
}

#[test]
fn encrypted_crc_corrupt_and_declared_bomb_members_never_publish() {
    for fault in 0..3 {
        let root = Root::new();
        let directory = paths::Directory::open(&root.0).unwrap();
        let mut bytes = zip(&[("llama-server.exe", b"fixture")]);
        let central = bytes.windows(4).position(|b| b == b"PK\x01\x02").unwrap();
        match fault {
            0 => {
                bytes[6] |= 1;
                bytes[central + 8] |= 1;
            }
            1 => {
                bytes[14..18].fill(0);
                bytes[central + 16..central + 20].fill(0);
            }
            _ => {
                bytes[central + 24..central + 28].copy_from_slice(&u32::MAX.to_le_bytes());
            }
        }
        let spec = install_zip(&directory, &bytes);
        let relative = runtime_relative("cpu", &[spec.clone()]);
        assert!(unpack(&directory, &[spec], "cpu", &AtomicBool::new(false)).is_err());
        assert!(!directory.child(&relative, false).unwrap().exists());
    }
}

#[test]
fn fixround1_runtime_budget_keeps_actual_extract_peak_and_reuses_verified_installation() {
    let root = Root::new();
    let directory = paths::Directory::open(&root.0).unwrap();
    let spec = install_zip(
        &directory,
        &zip(&[
            ("llama-server.exe", b"server"),
            ("ggml.dll", b"lib"),
            ("unused-tool.exe", b"not extracted"),
        ]),
    );
    assert_eq!(
        staging_bytes(None, &[spec.clone()], "cpu", &AtomicBool::new(false)).unwrap(),
        catalog::MAX_ARCHIVE_EXPANSION
    );
    assert_eq!(
        staging_bytes(
            Some(&directory),
            &[spec.clone()],
            "cpu",
            &AtomicBool::new(false)
        )
        .unwrap(),
        9
    );
    unpack(&directory, &[spec.clone()], "cpu", &AtomicBool::new(false)).unwrap();
    assert_eq!(
        staging_bytes(Some(&directory), &[spec], "cpu", &AtomicBool::new(false)).unwrap(),
        0
    );
}

#[test]
fn editable_receipt_cannot_authorize_changed_code_or_an_extra_dll() {
    let root = Root::new();
    let directory = paths::Directory::open(&root.0).unwrap();
    let spec = install_zip(&directory, &zip(&[("llama-server.exe", b"trusted")]));
    let relative = unpack(&directory, &[spec.clone()], "cpu", &AtomicBool::new(false)).unwrap();
    let server = directory
        .child(&format!("{relative}/llama-server.exe"), false)
        .unwrap();
    std::fs::write(&server, b"changed").unwrap();
    let record = directory
        .child(&format!("{relative}/receipt.json"), false)
        .unwrap();
    let mut value = paths::read_record(&record).unwrap().unwrap();
    value["files"][0]["sha256"] = serde_json::json!(catalog::hash(b"changed"));
    paths::write_record(&record, &value).unwrap();
    assert!(validate(
        &directory,
        &relative,
        &[spec.clone()],
        "cpu",
        &AtomicBool::new(false)
    )
    .unwrap_err()
    .starts_with("integrity:"));
    std::fs::write(&server, b"trusted").unwrap();
    value["files"][0]["sha256"] = serde_json::json!(catalog::hash(b"trusted"));
    paths::write_record(&record, &value).unwrap();
    std::fs::write(
        directory
            .child(&format!("{relative}/ggml-injected.dll"), false)
            .unwrap(),
        b"untrusted",
    )
    .unwrap();
    assert!(validate(
        &directory,
        &relative,
        &[spec],
        "cpu",
        &AtomicBool::new(false)
    )
    .unwrap_err()
    .starts_with("integrity:"));
}
