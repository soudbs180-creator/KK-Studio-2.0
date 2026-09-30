use std::fs;
use std::path::{Path, PathBuf};

/// Canonical desktop data layout. Runtime files must never be written to the repo.
#[derive(Debug)]
pub struct AppPaths {
    pub config: PathBuf,
    pub conversations: PathBuf,
    pub creation: PathBuf,
    pub assets: PathBuf,
    pub tasks: PathBuf,
    pub memory: PathBuf,
}

const DATA_DIRECTORIES: [&str; 13] = [
    "app",
    "providers",
    "profile",
    "memory",
    "projects",
    "conversations",
    "assets",
    "models",
    "comfyui",
    "cache",
    "backups",
    "logs",
    "tasks",
];

impl AppPaths {
    pub fn initialize() -> Result<Self, String> {
        if let Some(root) = explicit_data_root(std::env::args_os().skip(1))? {
            return Self::initialize_at(&root);
        }
        let root = dirs::data_dir()
            .ok_or_else(|| "无法确定用户应用数据目录".to_string())?
            .join("kk-studio");
        Self::initialize_at(&root)
    }

    /// Initialize a caller-selected root. Kept private to production callers so tests can
    /// exercise the directory contract without touching the real user profile.
    fn initialize_at(root: &Path) -> Result<Self, String> {
        fs::create_dir_all(root).map_err(|error| format!("无法创建应用数据目录：{error}"))?;
        for directory in DATA_DIRECTORIES {
            fs::create_dir_all(root.join(directory))
                .map_err(|error| format!("无法创建数据目录 {directory}：{error}"))?;
        }

        let config = root.join("providers").join("config.json");
        let conversations = root.join("conversations").join("index.json");
        let creation = root.join("projects").join("creation-v2.json");
        let assets = root.join("assets");
        let tasks = root.join("tasks");
        let memory = root.join("memory").join("memory.json");

        Ok(Self {
            config,
            conversations,
            creation,
            assets,
            tasks,
            memory,
        })
    }
}

/// A user-selected local data root also permits isolated packaged-client verification.
/// Environment variable overrides are intentionally not used.
fn explicit_data_root(
    args: impl Iterator<Item = std::ffi::OsString>,
) -> Result<Option<PathBuf>, String> {
    let mut args = args;
    let mut selected = None;
    while let Some(arg) = args.next() {
        if arg != "--data-dir" {
            continue;
        }
        if selected.is_some() {
            return Err("--data-dir 只能指定一次".to_string());
        }
        let root = PathBuf::from(
            args.next()
                .ok_or_else(|| "--data-dir 需要绝对路径".to_string())?,
        );
        if !root.is_absolute() {
            return Err("--data-dir 必须使用绝对路径".to_string());
        }
        selected = Some(root);
    }
    Ok(selected)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn explicit_root_requires_absolute_path_and_keeps_default_when_absent() {
        assert_eq!(explicit_data_root(std::iter::empty()).unwrap(), None);
        assert!(
            explicit_data_root(["--data-dir", "relative"].into_iter().map(Into::into)).is_err()
        );
        assert!(explicit_data_root(["--data-dir"].into_iter().map(Into::into)).is_err());
        let selected = std::env::temp_dir().join("kk-isolated-selected-root");
        assert_eq!(
            explicit_data_root(
                ["--data-dir".into(), selected.clone().into_os_string()].into_iter()
            )
            .unwrap(),
            Some(selected)
        );
    }

    struct TestRoot(PathBuf);

    impl TestRoot {
        fn new(label: &str) -> Self {
            let nonce = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("system clock")
                .as_nanos();
            let root = std::env::temp_dir().join(format!("kk-studio-storage-{label}-{nonce}"));
            fs::create_dir_all(&root).expect("create test root");
            Self(root)
        }
        fn path(&self, child: &str) -> PathBuf {
            self.0.join(child)
        }
    }

    impl Drop for TestRoot {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    #[test]
    fn initialize_creates_canonical_directories_and_paths() {
        let root = TestRoot::new("layout");
        let paths = AppPaths::initialize_at(&root.0).expect("initialize");
        for directory in DATA_DIRECTORIES {
            assert!(root.path(directory).is_dir(), "missing {directory}");
        }
        assert_eq!(paths.config, root.path("providers/config.json"));
        assert_eq!(paths.conversations, root.path("conversations/index.json"));
        assert_eq!(paths.creation, root.path("projects/creation-v2.json"));
        assert_eq!(paths.assets, root.path("assets"));
        assert_eq!(paths.tasks, root.path("tasks"));
        assert_eq!(paths.memory, root.path("memory/memory.json"));
        assert!(!paths.config.exists());
        assert!(!paths.conversations.exists());
        assert!(!paths.memory.exists());
    }

    #[test]
    fn leaves_legacy_config_for_explicit_user_approved_migration() {
        let root = TestRoot::new("config");
        let legacy = root.path("config.json");
        let raw = serde_json::to_vec(&json!({
            "provider": "test", "api_key": "secret", "base_url": "https://example.test/v1",
            "default_model": "demo", "temperature": 0.2, "max_tokens": 32,
            "comfyui_url": "http://127.0.0.1:8188", "h3_model": "demo-video"
        }))
        .expect("json");
        fs::write(&legacy, &raw).expect("write legacy");
        let paths = AppPaths::initialize_at(&root.0).expect("initialize");
        assert!(!paths.config.exists());
        assert_eq!(fs::read(&legacy).expect("read legacy"), raw);
    }

    #[test]
    fn leaves_legacy_conversations_for_explicit_user_approved_migration() {
        let root = TestRoot::new("conversations");
        let legacy = root.path("conversations.json");
        let raw = br#"[{"id":"c1","title":"test","messages":[{"role":"user","content":"hello"}],"created_at":1,"updated_at":2}]"#;
        fs::write(&legacy, raw).expect("write legacy");
        let paths = AppPaths::initialize_at(&root.0).expect("initialize");
        assert!(!paths.conversations.exists());
        assert_eq!(fs::read(&legacy).expect("read legacy"), raw);
    }

    #[test]
    fn malformed_legacy_file_does_not_block_startup_or_create_destination() {
        let root = TestRoot::new("malformed");
        fs::write(root.path("config.json"), b"not-json").expect("write legacy");
        AppPaths::initialize_at(&root.0).expect("initialize");
        assert!(!root.path("providers/config.json").exists());
    }

    #[test]
    fn existing_destination_is_preserved_without_reading_legacy() {
        let root = TestRoot::new("winner");
        let paths = AppPaths::initialize_at(&root.0).expect("initialize");
        fs::write(&paths.config, b"canonical").expect("write destination");
        fs::write(root.path("config.json"), b"malformed legacy").expect("write legacy");
        let paths_again = AppPaths::initialize_at(&root.0).expect("initialize again");
        assert_eq!(
            fs::read(paths_again.config).expect("read destination"),
            b"canonical"
        );
    }
}
