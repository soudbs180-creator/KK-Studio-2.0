use super::*;
#[test]
fn fixed_catalog_pairing_and_h3_dedup_preserve_current_ids() {
    let c = parse(SOURCE).unwrap();
    assert_eq!(c.chat.len(), 3);
    assert_eq!(c.video.len(), 2);
    let selection = Selection {
        package_ids: c.chat.iter().map(|p| p.id.clone()).collect(),
        runtime_backend: "cpu".into(),
    };
    let plan = prepare(selection).unwrap();
    let projectors = plan
        .files
        .iter()
        .filter(|f| f.relative.ends_with("/mmproj-F16.gguf"))
        .collect::<Vec<_>>();
    assert_eq!(projectors.len(), 3);
    assert_ne!(projectors[0].relative, projectors[1].relative);
    assert_ne!(projectors[1].sha256, projectors[2].sha256);
    let h3 = prepare(Selection {
        package_ids: c.video.iter().map(|p| p.id.clone()).collect(),
        runtime_backend: "none".into(),
    })
    .unwrap();
    assert_eq!(h3.download_bytes, 93_133_757_881);
    assert_eq!(h3.files.len(), 5);
    assert!(plan
        .files
        .iter()
        .filter(|f| f.archive)
        .all(|f| f.source.contains("/b11429/")));
}
#[test]
fn untrusted_ids_and_contradictory_catalog_fail() {
    for ids in [
        vec![],
        vec!["../bad".into()],
        vec!["qwen3.5-4b-q4-k-m".into(); 2],
    ] {
        assert!(prepare(Selection {
            package_ids: ids,
            runtime_backend: "cpu".into()
        })
        .is_err());
    }
    let mut value: serde_json::Value = serde_json::from_str(SOURCE).unwrap();
    value["chat"][0]["artifacts"][1]["sha256"] = serde_json::json!("0".repeat(64));
    assert!(parse(&value.to_string()).is_err());
    value = serde_json::from_str(SOURCE).unwrap();
    value["runtimes"][0]["sourceUrl"] = serde_json::json!("https://evil.example/file");
    assert!(parse(&value.to_string()).is_err());
    for path in [
        "../a",
        "a/../b",
        "C:/a",
        "a\\b",
        "a:stream",
        "NUL.txt",
        "a/COM1.dll",
        "/abs",
        "x.",
        "x ",
        "a//b",
    ] {
        assert!(!safe_relative(path), "{path}");
    }
}

#[test]
fn stable_installation_identity_and_selected_fingerprint_ignore_unrelated_catalog_entries() {
    let c = parse(SOURCE).unwrap();
    let selection = Selection {
        package_ids: vec![c.chat[0].id.clone()],
        runtime_backend: "cpu".into(),
    };
    let first = prepare_from(c.clone(), selection.clone()).unwrap();
    let mut changed = c.clone();
    changed.video[0].name.push_str(" unrelated");
    assert_eq!(
        first.fingerprint,
        prepare_from(changed, selection.clone())
            .unwrap()
            .fingerprint
    );
    let cuda = prepare_from(
        c.clone(),
        Selection {
            runtime_backend: "cuda-13.4".into(),
            ..selection
        },
    )
    .unwrap();
    assert_ne!(first.fingerprint, cuda.fingerprint);
    assert_eq!(
        installation_id("volume:file", &first.packages[0]),
        installation_id("volume:file", &cuda.packages[0])
    );
    assert_ne!(
        installation_id("volume:file", &first.packages[0]),
        installation_id("other:file", &first.packages[0])
    );
    assert!(prepare(Selection {
        package_ids: vec![c.video[0].id.clone()],
        runtime_backend: "cpu".into()
    })
    .is_err());
    assert!(prepare(Selection {
        package_ids: vec![c.chat[0].id.clone()],
        runtime_backend: "none".into()
    })
    .is_err());
}
