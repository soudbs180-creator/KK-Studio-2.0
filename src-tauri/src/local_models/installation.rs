use super::{
    archive,
    catalog::{self, Prepared, Selection},
    download::{self, Transport},
    paths, runtime, DirectoryGrant, Inspection, InstallPlan, OperationStatus, Receipt,
};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use std::time::{Duration, Instant};

struct Grant {
    owner: String,
    directory: Arc<paths::Directory>,
    created: Instant,
}
struct Operation {
    owner: String,
    selected: Arc<paths::Directory>,
    prepared: Prepared,
    created: Instant,
    cancel: Arc<AtomicBool>,
    status: Arc<Mutex<OperationStatus>>,
    started: bool,
}
struct State {
    grants: HashMap<String, Grant>,
    operations: HashMap<String, Operation>,
    active: Option<String>,
}
pub struct LocalModelManager {
    pub(super) registry: PathBuf,
    state: Mutex<State>,
    pub(super) runtime: tokio::sync::Mutex<Option<runtime::OwnedRuntime>>,
}
struct Active<'a> {
    manager: &'a LocalModelManager,
    id: String,
    status: Arc<Mutex<OperationStatus>>,
    cancel: Arc<AtomicBool>,
}
impl Drop for Active<'_> {
    fn drop(&mut self) {
        self.cancel.store(true, Ordering::Release);
        if let Ok(mut state) = self.manager.state.lock() {
            if state.active.as_deref() == Some(&self.id) {
                state.active = None;
            }
        }
        if let Ok(mut status) = self.status.lock() {
            if !matches!(status.state.as_str(), "installed" | "failed" | "cancelled") {
                status.state = "failed".into();
                status.error = Some("interrupted: 安装执行已中断，部分文件保留可续传".into());
                status.sequence += 1;
            }
        }
    }
}
fn state_error<T>(_: T) -> String {
    "io: 模型安装状态不可用".into()
}
fn space_budget(
    selected: &paths::Directory,
    prepared: &Prepared,
    cancel: &AtomicBool,
) -> Result<(u64, std::collections::HashSet<String>), String> {
    let associated = paths::matching_pairs(selected, &prepared.packages, cancel)?;
    let path = selected.child("KK-Studio-models/v1/.identity", false)?;
    let managed = if paths::metadata(path.parent().ok_or("path: 模型目录无效")?)?.is_some() {
        Some(selected.managed(false)?)
    } else {
        None
    };
    let mut remaining = 0u64;
    for spec in &prepared.files {
        let reused = if associated.iter().any(|id| {
            prepared
                .packages
                .iter()
                .find(|p| &p.id == id)
                .is_some_and(|p| p.artifacts.iter().any(|a| a.sha256 == spec.sha256))
        }) {
            spec.bytes
        } else {
            match &managed {
                Some(dir) => download::reusable_bytes(dir, spec, cancel)?,
                None => 0,
            }
        };
        remaining = remaining
            .checked_add(spec.bytes - reused)
            .ok_or("catalog: 剩余空间溢出")?;
    }
    let archives = prepared
        .files
        .iter()
        .filter(|f| f.archive)
        .cloned()
        .collect::<Vec<_>>();
    let staging = archive::staging_bytes(
        managed.as_ref(),
        &archives,
        &prepared.selection.runtime_backend,
        cancel,
    )?;
    Ok((catalog::required_space(remaining, staging)?, associated))
}
impl LocalModelManager {
    /// Root supplies its existing owned models directory. No directory/network/process side effects.
    pub fn new(registry: PathBuf) -> Self {
        Self {
            registry,
            state: Mutex::new(State {
                grants: HashMap::new(),
                operations: HashMap::new(),
                active: None,
            }),
            runtime: tokio::sync::Mutex::new(None),
        }
    }
    pub fn grant_directory(&self, owner: &str, path: &Path) -> Result<DirectoryGrant, String> {
        if owner.is_empty() || owner.len() > 160 {
            return Err("invalid: 窗口身份无效".into());
        }
        let directory = Arc::new(paths::Directory::open(path)?);
        let id = paths::random_id()?;
        let mut state = self.state.lock().map_err(state_error)?;
        state.grants.retain(|_, g| {
            g.owner != owner && g.created.elapsed() < Duration::from_secs(24 * 3600)
        });
        if state.grants.len() >= 32 {
            return Err("busy: 已选择的目录过多，请重新打开设置".into());
        }
        let result = DirectoryGrant {
            version: 1,
            grant_id: id.clone(),
            display_path: directory.root.to_string_lossy().into_owned(),
        };
        state.grants.insert(
            id,
            Grant {
                owner: owner.into(),
                directory,
                created: Instant::now(),
            },
        );
        Ok(result)
    }
    fn grant(&self, owner: &str, id: &str) -> Result<Arc<paths::Directory>, String> {
        let state = self.state.lock().map_err(state_error)?;
        let grant = state
            .grants
            .get(id)
            .ok_or("permission: 请重新选择模型目录")?;
        if grant.owner != owner || grant.created.elapsed() > Duration::from_secs(24 * 3600) {
            return Err("permission: 目录授权不属于当前窗口或已过期".into());
        }
        Ok(Arc::clone(&grant.directory))
    }
    pub fn prepare(
        &self,
        owner: &str,
        grant_id: &str,
        selection: Selection,
    ) -> Result<InstallPlan, String> {
        let selected = self.grant(owner, grant_id)?;
        let mut prepared = catalog::prepare(selection)?;
        prepared.required_bytes = space_budget(&selected, &prepared, &AtomicBool::new(false))?.0;
        let volume = paths::volume(&selected.root)?;
        volume.check(
            prepared.required_bytes,
            prepared.files.iter().map(|f| f.bytes).max().unwrap_or(0),
        )?;
        self.prepare_checked(owner, selected, prepared)
    }
    fn prepare_checked(
        &self,
        owner: &str,
        selected: Arc<paths::Directory>,
        prepared: Prepared,
    ) -> Result<InstallPlan, String> {
        // Preflight never creates managed directories or changes a partial/receipt.
        selected.child("KK-Studio-models/v1/.install.lock", false)?;
        let id = paths::random_id()?;
        let result = InstallPlan {
            version: 1,
            operation_id: id.clone(),
            fingerprint: prepared.fingerprint.clone(),
            selection: prepared.selection.clone(),
            download_bytes: prepared.download_bytes,
            required_bytes: prepared.required_bytes,
            destination: selected.root.to_string_lossy().into_owned(),
        };
        let mut state = self.state.lock().map_err(state_error)?;
        state.operations.retain(|_, op| {
            let terminal = op
                .status
                .lock()
                .map(|s| matches!(s.state.as_str(), "installed" | "failed" | "cancelled"))
                .unwrap_or(false);
            !terminal && (op.started || op.created.elapsed() < Duration::from_secs(600))
        });
        if state.operations.len() >= 64 {
            return Err("busy: 安装操作过多，请关闭设置后重试".into());
        }
        state.operations.insert(
            id.clone(),
            Operation {
                owner: owner.into(),
                selected,
                prepared,
                created: Instant::now(),
                cancel: Arc::new(AtomicBool::new(false)),
                status: Arc::new(Mutex::new(OperationStatus {
                    version: 1,
                    operation_id: id,
                    state: "prepared".into(),
                    sequence: 0,
                    completed_bytes: 0,
                    total_bytes: result.download_bytes,
                    installation_ids: Vec::new(),
                    error: None,
                })),
                started: false,
            },
        );
        Ok(result)
    }
    pub fn status(&self, owner: &str, id: &str) -> Result<OperationStatus, String> {
        let state = self.state.lock().map_err(state_error)?;
        let op = state.operations.get(id).ok_or("missing: 安装操作不存在")?;
        if op.owner != owner {
            return Err("permission: 安装操作不属于当前窗口".into());
        }
        let result = op.status.lock().map_err(state_error)?.clone();
        Ok(result)
    }
    pub fn current_operation(&self, owner: &str) -> Result<Option<OperationStatus>, String> {
        let state = self.state.lock().map_err(state_error)?;
        let Some(id) = &state.active else {
            return Ok(None);
        };
        let Some(op) = state.operations.get(id) else {
            return Ok(None);
        };
        if op.owner != owner {
            return Ok(None);
        }
        let status = op.status.lock().map_err(state_error)?.clone();
        Ok(
            if matches!(status.state.as_str(), "installed" | "failed" | "cancelled") {
                None
            } else {
                Some(status)
            },
        )
    }
    pub fn cancel(&self, owner: &str, id: &str) -> Result<OperationStatus, String> {
        let state = self.state.lock().map_err(state_error)?;
        let op = state.operations.get(id).ok_or("missing: 安装操作不存在")?;
        if op.owner != owner {
            return Err("permission: 安装操作不属于当前窗口".into());
        }
        let mut status = op.status.lock().map_err(state_error)?;
        if !matches!(status.state.as_str(), "installed" | "failed" | "cancelled") {
            op.cancel.store(true, Ordering::Release);
            if !op.started {
                status.state = "cancelled".into();
                status.sequence += 1;
            }
        }
        Ok(status.clone())
    }
    pub async fn install(&self, owner: &str, id: &str) -> Result<OperationStatus, String> {
        self.install_with(owner, id, &Transport::default(), None)
            .await
    }
    async fn install_with(
        &self,
        owner: &str,
        id: &str,
        transport: &Transport,
        test_volume: Option<paths::Volume>,
    ) -> Result<OperationStatus, String> {
        let (selected, prepared, cancel, status) = {
            let mut state = self.state.lock().map_err(state_error)?;
            if state.active.is_some() {
                return Err("busy: 当前已有模型安装，不另建队列".into());
            }
            let op = state
                .operations
                .get_mut(id)
                .ok_or("missing: 安装计划不存在")?;
            if op.owner != owner {
                return Err("permission: 安装计划不属于当前窗口".into());
            }
            if op.started || op.created.elapsed() > Duration::from_secs(600) {
                return Err("conflict: 安装计划已执行或过期".into());
            }
            paths::cancelled(&op.cancel)?;
            op.started = true;
            let parts = (
                Arc::clone(&op.selected),
                op.prepared.clone(),
                Arc::clone(&op.cancel),
                Arc::clone(&op.status),
            );
            state.active = Some(id.into());
            parts
        };
        let _active = Active {
            manager: self,
            id: id.into(),
            status: Arc::clone(&status),
            cancel: Arc::clone(&cancel),
        };
        let result = self
            .perform(
                &selected,
                &prepared,
                &cancel,
                &status,
                transport,
                test_volume,
            )
            .await;
        let mut state = self.state.lock().map_err(state_error)?;
        state.active = None;
        let mut value = status.lock().map_err(state_error)?;
        match result {
            Ok(ids) => {
                value.state = "installed".into();
                value.installation_ids = ids;
                value.completed_bytes = value.total_bytes;
            }
            Err(error) => {
                value.state = if error.starts_with("cancelled:") {
                    "cancelled"
                } else {
                    "failed"
                }
                .into();
                value.error = Some(error);
            }
        }
        value.sequence += 1;
        Ok(value.clone())
    }
    async fn perform(
        &self,
        selected: &Arc<paths::Directory>,
        prepared: &Prepared,
        cancel: &Arc<AtomicBool>,
        status: &Arc<Mutex<OperationStatus>>,
        transport: &Transport,
        test_volume: Option<paths::Volume>,
    ) -> Result<Vec<String>, String> {
        let current = paths::Directory::open(&selected.root)?;
        if current.identity != selected.identity {
            return Err("conflict: 目标目录身份改变".into());
        }
        paths::cancelled(cancel)?;
        let directory = Arc::new(selected.managed(true)?);
        let target_lock = Arc::new(paths::lock(&directory.child(".install.lock", true)?)?);
        let source = Arc::clone(selected);
        let planned = prepared.clone();
        let flag = Arc::clone(cancel);
        let lock = Arc::clone(&target_lock);
        let (required, associated) = tokio::task::spawn_blocking(move || {
            let _lock = lock;
            space_budget(&source, &planned, &flag)
        })
        .await
        .map_err(|_| "io: 已有模型校验线程失败")??;
        let volume = match test_volume {
            Some(v) => v,
            None => paths::volume(&selected.root)?,
        };
        volume.check(
            required,
            prepared.files.iter().map(|f| f.bytes).max().unwrap_or(0),
        )?;
        let mut base = 0u64;
        for spec in &prepared.files {
            if associated.iter().any(|id| {
                prepared
                    .packages
                    .iter()
                    .find(|p| &p.id == id)
                    .is_some_and(|p| p.artifacts.iter().any(|a| a.sha256 == spec.sha256))
            }) {
                base += spec.bytes;
                let mut s = status.lock().map_err(state_error)?;
                s.completed_bytes = base;
                s.state = "verifying".into();
                s.sequence += 1;
                continue;
            }
            {
                let mut s = status.lock().map_err(state_error)?;
                s.state = "downloading".into();
                s.sequence += 1;
            }
            download::transfer(&directory, spec, Arc::clone(cancel), transport, |n| {
                if let Ok(mut s) = status.lock() {
                    s.completed_bytes = base + n;
                    s.sequence += 1;
                }
            })
            .await?;
            base += spec.bytes;
        }
        let archives = prepared
            .files
            .iter()
            .filter(|f| f.archive)
            .cloned()
            .collect::<Vec<_>>();
        let runtime = if !archives.is_empty() {
            {
                let mut s = status.lock().map_err(state_error)?;
                s.state = "extracting".into();
                s.sequence += 1;
            }
            let dir = Arc::clone(&directory);
            let backend = prepared.selection.runtime_backend.clone();
            let flag = Arc::clone(cancel);
            let lock = Arc::clone(&target_lock);
            Some(
                tokio::task::spawn_blocking(move || {
                    let _lock = lock;
                    archive::unpack(&dir, &archives, &backend, &flag)
                })
                .await
                .map_err(|_| "io: 运行时提取线程失败")??,
            )
        } else {
            None
        };
        let mut ids = Vec::new();
        // Publication and Cancel share the status mutex: never acknowledge cancellation after commit.
        let mut s = status.lock().map_err(state_error)?;
        paths::cancelled(cancel)?;
        for package in &prepared.packages {
            let id = catalog::installation_id(&selected.identity, package);
            let backend = if package.engine == "llama.cpp" {
                prepared.selection.runtime_backend.clone()
            } else {
                "none".into()
            };
            let receipt = Receipt {
                version: 1,
                installation_id: id.clone(),
                package_id: package.id.clone(),
                revision: package.revision.clone(),
                fingerprint: catalog::prepare(Selection {
                    package_ids: vec![package.id.clone()],
                    runtime_backend: backend.clone(),
                })?
                .fingerprint,
                selected_root: selected.root.to_string_lossy().into_owned(),
                directory_identity: selected.identity.clone(),
                backend,
                associated: associated.contains(&package.id),
                runtime_relative: if package.engine == "llama.cpp" {
                    runtime.clone()
                } else {
                    None
                },
            };
            paths::publish_receipt(&self.registry, &receipt)?;
            ids.push(id);
            s.installation_ids = ids.clone();
        }
        s.state = "installed".into();
        s.installation_ids = ids.clone();
        s.sequence += 1;
        Ok(ids)
    }
    pub(super) fn receipt(&self, id: &str) -> Result<Receipt, String> {
        if !catalog::hex(id, 32) {
            return Err("invalid: 安装身份无效".into());
        }
        let registry = paths::Directory::open(&self.registry)?;
        let value =
            paths::read_record(&registry.child(&format!("installations/{id}.json"), false)?)?
                .ok_or("missing: 安装回执不存在")?;
        let r: Receipt = serde_json::from_value(value).map_err(|_| "corrupt: 安装回执无效")?;
        let prepared = catalog::prepare(r.selection())?;
        if r.version != 1
            || r.installation_id != id
            || catalog::installation_id(&r.directory_identity, &prepared.packages[0]) != id
            || r.revision != prepared.packages[0].revision
            || r.fingerprint != prepared.fingerprint
        {
            return Err("unsupported: 安装回执与固定目录不符".into());
        }
        Ok(r)
    }
    pub fn associate(
        &self,
        owner: &str,
        grant_id: &str,
        package_id: &str,
    ) -> Result<Inspection, String> {
        let directory = self.grant(owner, grant_id)?;
        let prepared = catalog::prepare(Selection {
            package_ids: vec![package_id.into()],
            runtime_backend: "cpu".into(),
        })?;
        let package = &prepared.packages[0];
        if package.engine != "llama.cpp" {
            return Err("unsupported: 此入口关联匹配 Qwen GGUF 与投影".into());
        }
        for file in &package.artifacts {
            if paths::file_hash(
                &directory.child(&file.path, false)?,
                file.bytes,
                &AtomicBool::new(false),
            )? != file.sha256
            {
                return Err("integrity: GGUF 与固定匹配投影不符".into());
            }
        }
        let id = catalog::installation_id(&directory.identity, package);
        let previous = match self.receipt(&id) {
            Ok(r) => Some(r),
            Err(error) if error.starts_with("missing:") => None,
            Err(error) => return Err(error),
        };
        let backend = previous
            .as_ref()
            .map(|r| r.backend.clone())
            .unwrap_or_else(|| "none".into());
        let runtime = previous.and_then(|r| r.runtime_relative);
        let fingerprint = catalog::prepare(Selection {
            package_ids: vec![package.id.clone()],
            runtime_backend: if backend == "none" {
                "cpu".into()
            } else {
                backend.clone()
            },
        })?
        .fingerprint;
        paths::publish_receipt(
            &self.registry,
            &Receipt {
                version: 1,
                installation_id: id.clone(),
                package_id: package.id.clone(),
                revision: package.revision.clone(),
                fingerprint,
                selected_root: directory.root.to_string_lossy().into_owned(),
                directory_identity: directory.identity.clone(),
                backend,
                associated: true,
                runtime_relative: runtime,
            },
        )?;
        self.inspect(&id)
    }
}
#[cfg(test)]
#[path = "installation_tests.rs"]
mod tests;
