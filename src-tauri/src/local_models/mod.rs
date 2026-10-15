//! Explicit local package installation; no startup downloads or model/tool execution.
mod archive;
mod catalog;
mod download;
mod installation;
mod paths;
mod runtime;
pub use catalog::Selection;
pub use installation::LocalModelManager;
pub use runtime::{RuntimeAuthorization, RuntimeStatus};

use serde::{Deserialize, Serialize};
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DirectoryGrant {
    pub version: u8,
    pub grant_id: String,
    pub display_path: String,
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallPlan {
    pub version: u8,
    pub operation_id: String,
    pub fingerprint: String,
    pub selection: Selection,
    pub download_bytes: u64,
    pub required_bytes: u64,
    pub destination: String,
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OperationStatus {
    pub version: u8,
    pub operation_id: String,
    pub state: String,
    pub sequence: u64,
    pub completed_bytes: u64,
    pub total_bytes: u64,
    pub installation_ids: Vec<String>,
    pub error: Option<String>,
}
#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct Receipt {
    pub version: u8,
    pub installation_id: String,
    pub package_id: String,
    pub revision: String,
    pub fingerprint: String,
    pub selected_root: String,
    pub directory_identity: String,
    pub backend: String,
    pub associated: bool,
    pub runtime_relative: Option<String>,
}
impl Receipt {
    fn selection(&self) -> Selection {
        Selection {
            package_ids: vec![self.package_id.clone()],
            runtime_backend: if self.backend == "none" && self.associated {
                "cpu".into()
            } else {
                self.backend.clone()
            },
        }
    }
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Inspection {
    pub version: u8,
    pub installation_id: String,
    pub package_id: String,
    pub engine: String,
    pub files: String,
    pub runtime: String,
    pub text: String,
    pub vision: String,
    pub inference: String,
    pub tools: String,
    pub dependencies: Vec<String>,
    pub license: String,
    pub license_review: String,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallationSummary {
    pub version: u8,
    pub installation_id: String,
    pub package_id: String,
    pub name: String,
    pub engine: String,
    pub destination: String,
    pub backend: String,
    pub associated: bool,
    pub acceptance: String,
}

use std::{path::Path, sync::atomic::AtomicBool};
impl LocalModelManager {
    pub fn inspect(&self, id: &str) -> Result<Inspection, String> {
        let receipt = self.receipt(id)?;
        let directory = paths::Directory::open(Path::new(&receipt.selected_root))?;
        if directory.identity != receipt.directory_identity {
            return Err("conflict: 安装目录身份改变".into());
        }
        let selected = catalog::prepare(receipt.selection())?;
        let package = &selected.packages[0];
        let flag = AtomicBool::new(false);
        let managed = if receipt.associated {
            None
        } else {
            Some(directory.managed(false)?)
        };
        for file in &package.artifacts {
            let path = if let Some(dir) = &managed {
                let spec = selected
                    .files
                    .iter()
                    .find(|f| f.sha256 == file.sha256)
                    .ok_or("catalog: 制品缺失")?;
                dir.child(&spec.relative, false)?
            } else {
                directory.child(&file.path, false)?
            };
            if paths::file_hash(&path, file.bytes, &flag)? != file.sha256 {
                return Err("integrity: 模型或匹配投影改变".into());
            }
        }
        let archives = selected
            .files
            .iter()
            .filter(|f| f.archive)
            .cloned()
            .collect::<Vec<_>>();
        let runtime = if let Some(relative) = &receipt.runtime_relative {
            let expected = archive::runtime_relative(&receipt.backend, &archives);
            if relative != &expected {
                return Err("corrupt: 运行时路径与固定版本不符".into());
            }
            let dir = directory.managed(false)?;
            archive::validate(&dir, relative, &archives, &receipt.backend, &flag)?;
            "installed"
        } else {
            "missing"
        };
        Ok(Inspection {
            version: 1,
            installation_id: id.into(),
            package_id: package.id.clone(),
            engine: package.engine.clone(),
            files: "verified".into(),
            runtime: runtime.into(),
            text: if package.engine == "llama.cpp" {
                "declared"
            } else {
                "unverified"
            }
            .into(),
            vision: "unverified".into(),
            inference: "unverified".into(),
            tools: "unverified".into(),
            dependencies: if package.engine == "comfyui" {
                paths::comfy_dependencies(&directory)?
            } else {
                Vec::new()
            },
            license: package.license.clone(),
            license_review: package.license_review.clone().unwrap_or("declared".into()),
        })
    }
    pub fn list_installed(&self) -> Result<Vec<InstallationSummary>, String> {
        let registry = paths::Directory::open(&self.registry)?;
        let directory = registry
            .child("installations/.check", false)?
            .parent()
            .ok_or("path: 安装回执目录无效")?
            .to_path_buf();
        if paths::metadata(&directory)?.is_none() {
            return Ok(Vec::new());
        }
        let mut ids = Vec::new();
        for entry in std::fs::read_dir(directory).map_err(paths::error)? {
            let entry = entry.map_err(paths::error)?;
            let name = entry.file_name().to_string_lossy().into_owned();
            if let Some(id) = name.strip_suffix(".json") {
                if !catalog::hex(id, 32) {
                    return Err("corrupt: 安装回执身份无效".into());
                }
                ids.push(id.to_owned());
            }
            if ids.len() > 256 {
                return Err("quota: 本地安装记录超过读取上限".into());
            }
        }
        ids.sort();
        let c = catalog::parse(catalog::SOURCE)?;
        ids.into_iter()
            .map(|id| {
                let r = self.receipt(&id)?;
                let p = c
                    .chat
                    .iter()
                    .chain(&c.video)
                    .find(|p| p.id == r.package_id)
                    .ok_or("catalog: 模型包缺失")?;
                Ok(InstallationSummary {
                    version: 1,
                    installation_id: id,
                    package_id: p.id.clone(),
                    name: p.name.clone(),
                    engine: p.engine.clone(),
                    destination: r.selected_root,
                    backend: r.backend,
                    associated: r.associated,
                    acceptance: "unverified".into(),
                })
            })
            .collect()
    }
}

#[cfg(test)]
pub(super) mod fixture {
    use std::path::PathBuf;
    pub struct Root(pub PathBuf);
    impl Root {
        pub fn new() -> Self {
            let mut nonce = [0u8; 16];
            getrandom::fill(&mut nonce).unwrap();
            let suffix = nonce.iter().map(|b| format!("{b:02x}")).collect::<String>();
            let root = std::env::temp_dir().join(format!("kk-local-model-adapter-{suffix}"));
            std::fs::create_dir(&root).unwrap();
            Self(root)
        }
    }
    impl Drop for Root {
        fn drop(&mut self) {
            if std::thread::panicking() {
                return;
            }
            let actual = dunce::canonicalize(&self.0).unwrap();
            let parent = dunce::canonicalize(std::env::temp_dir()).unwrap();
            assert_eq!(actual.parent(), Some(parent.as_path()));
            assert!(actual
                .file_name()
                .unwrap()
                .to_string_lossy()
                .starts_with("kk-local-model-adapter-"));
            std::fs::remove_dir_all(actual).unwrap();
        }
    }
    pub async fn server(responses: Vec<Vec<u8>>) -> (String, tokio::task::JoinHandle<Vec<String>>) {
        use tokio::io::{AsyncReadExt, AsyncWriteExt};
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let url = format!("http://{}", listener.local_addr().unwrap());
        let handle = tokio::spawn(async move {
            let mut requests = Vec::new();
            for response in responses {
                let (mut socket, _) =
                    tokio::time::timeout(std::time::Duration::from_secs(5), listener.accept())
                        .await
                        .unwrap()
                        .unwrap();
                let mut request = Vec::new();
                loop {
                    let mut byte = [0];
                    socket.read_exact(&mut byte).await.unwrap();
                    request.push(byte[0]);
                    assert!(request.len() < 8192);
                    if request.ends_with(b"\r\n\r\n") {
                        break;
                    }
                }
                requests.push(String::from_utf8(request).unwrap());
                socket.write_all(&response).await.unwrap();
                socket.shutdown().await.unwrap();
            }
            requests
        });
        (url, handle)
    }
}
