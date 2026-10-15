use super::{catalog, installation::LocalModelManager, paths};
use serde::Serialize;
use serde_json::Value;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::io::AsyncWriteExt;
use zeroize::Zeroizing;

/// Native integration provides a real fresh hardware report and retains its existing GPU lease.
/// This type is not Deserialize and is never accepted from an IPC request.
pub struct RuntimeAuthorization {
    checked_at: u64,
    available_ram: u64,
    free_vram: Option<u64>,
    cuda_devices: usize,
    threads: u32,
    lease: Option<Box<dyn Send + Sync>>,
}
impl RuntimeAuthorization {
    pub fn from_native_report(
        report: &Value,
        gpu_lease: Option<Box<dyn Send + Sync>>,
    ) -> Result<Self, String> {
        if report["status"] != "supported"
            || report["platform"] != "windows"
            || report["os"]["architecture"] != "x86_64"
        {
            return Err("unsupported: 本地运行时只验证 Windows x64".into());
        }
        let checked_at = report["measuredAtMs"]
            .as_u64()
            .ok_or("resources: 缺少检测时间")?;
        let available_ram = report["memory"]["availableBytes"]
            .as_u64()
            .filter(|v| *v > 0 && *v <= catalog::MAX_SAFE)
            .ok_or("resources: 当前可用内存未确认")?;
        let cuda = report["gpus"]
            .as_array()
            .map(|g| {
                g.iter()
                    .filter(|g| g["computeBackend"] == "cuda-reported")
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default();
        // The hardware report has no CUDA ordinal/PCI mapping; multiple cards cannot authorize CUDA0.
        let free_vram = if cuda.len() == 1 {
            cuda[0]["freeBytes"].as_u64()
        } else {
            None
        };
        let threads = report["cpu"]["logicalCores"]
            .as_u64()
            .unwrap_or(2)
            .saturating_sub(2)
            .clamp(1, 32) as u32;
        let result = Self {
            checked_at,
            available_ram,
            free_vram,
            cuda_devices: cuda.len(),
            threads,
            lease: gpu_lease,
        };
        result.fresh()?;
        Ok(result)
    }
    fn fresh(&self) -> Result<(), String> {
        let now = now();
        if now.saturating_sub(self.checked_at) > 60000 || self.checked_at.saturating_sub(now) > 5000
        {
            Err("resources: 启动前需要重新检查电脑配置".into())
        } else {
            Ok(())
        }
    }
    fn check(&self, p: &catalog::Package, backend: &str) -> Result<(), String> {
        self.fresh()?;
        if self.available_ram
            < p.estimated_ram_bytes
                .unwrap_or(u64::MAX)
                .saturating_add(4 * 1024u64.pow(3))
        {
            return Err("resources: 当前可用内存低于此配置的预留估计".into());
        }
        if backend != "cpu" {
            if self.lease.is_none() {
                return Err("unsupported: 共享 GPU 资源租约尚未接通".into());
            }
            if self.cuda_devices != 1 {
                return Err("unsupported: 无法核验显卡与 CUDA0 的映射，多卡启动保持禁用".into());
            }
            let required = if p.id == "qwen3.8-27b-ud-q4-k-m" {
                6 * 1024u64.pow(3)
            } else {
                p.artifacts.iter().map(|a| a.bytes).sum::<u64>() + 3 * 1024u64.pow(3)
            };
            if self.free_vram.unwrap_or(0) < required {
                return Err("resources: 当前空闲显存不足，未启动模型".into());
            }
        }
        Ok(())
    }
}
fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeStatus {
    pub version: u8,
    pub installation_id: String,
    pub instance_id: Option<String>,
    pub state: String,
    pub text: String,
    pub vision: String,
    pub inference: String,
    pub tools: String,
    pub error: Option<String>,
}
impl RuntimeStatus {
    fn new(installation: &str, instance: Option<String>, state: &str) -> Self {
        Self {
            version: 1,
            installation_id: installation.into(),
            instance_id: instance,
            state: state.into(),
            text: "unverified".into(),
            vision: "unverified".into(),
            inference: "unverified".into(),
            tools: "unverified".into(),
            error: None,
        }
    }
}
pub(crate) struct ExecutionBinding {
    pub endpoint: String,
    pub secret: Zeroizing<String>,
    pub instance_id: String,
    pub model: String,
}
pub(super) struct OwnedRuntime {
    owner: String,
    status: RuntimeStatus,
    endpoint: String,
    secret: Zeroizing<String>,
    alias: String,
    model: PathBuf,
    #[cfg(windows)]
    job: Option<crate::agent_process::OwnedJob>,
    child: tokio::process::Child,
    _authorization: RuntimeAuthorization,
}
fn literal(value: &str) -> Result<String, String> {
    if value.contains(['\0', '\n', '\r']) {
        return Err("invalid: 本地引擎参数无效".into());
    }
    Ok(format!("'{}'", value.replace('\'', "''")))
}
fn arguments(
    model: &Path,
    projector: &Path,
    alias: &str,
    port: u16,
    context: u32,
    threads: u32,
    backend: &str,
) -> Result<Vec<String>, String> {
    let mut args = vec![
        "--offline".into(),
        "--host".into(),
        "127.0.0.1".into(),
        "--port".into(),
        port.to_string(),
        "--alias".into(),
        alias.into(),
        "--ctx-size".into(),
        context.to_string(),
        "--parallel".into(),
        "1".into(),
        "--threads".into(),
        threads.to_string(),
        "--no-agent".into(),
        "--no-webui".into(),
        "--no-ui-mcp-proxy".into(),
        "--no-slots".into(),
        "--no-cache-prompt".into(),
        "--cache-ram".into(),
        "0".into(),
        "--no-cache-idle-slots".into(),
        "--sleep-idle-seconds".into(),
        "-1".into(),
        "--log-disable".into(),
        "--no-mmproj-auto".into(),
        "--model".into(),
        model.to_string_lossy().into_owned(),
        "--mmproj".into(),
        projector.to_string_lossy().into_owned(),
    ];
    if backend == "cpu" {
        args.extend(
            [
                "--device",
                "none",
                "--gpu-layers",
                "0",
                "--no-mmproj-offload",
                "--no-op-offload",
            ]
            .map(str::to_owned),
        );
    } else if backend == "cuda-13.4" {
        args.extend(
            [
                "--device",
                "CUDA0",
                "--split-mode",
                "none",
                "--gpu-layers",
                "auto",
                "--fit-target",
                "2048",
            ]
            .map(str::to_owned),
        );
    } else {
        return Err("unsupported: 本地运行后端无效".into());
    }
    Ok(args)
}
#[cfg(windows)]
fn launch_script(executable: &Path, args: &[String]) -> Result<String, String> {
    let mut script = format!(
        "if ([Console]::In.ReadLine() -ne 'start') {{ exit 1 }}; $ErrorActionPreference='Stop'; & {}",
        literal(&executable.to_string_lossy())?
    );
    for arg in args {
        script.push(' ');
        script.push_str(&literal(arg)?);
    }
    script.push_str("; exit $LASTEXITCODE");
    Ok(script)
}
#[cfg(windows)]
async fn spawn(
    executable: &Path,
    args: &[String],
    secret: &str,
) -> Result<(tokio::process::Child, crate::agent_process::OwnedJob), String> {
    use std::process::Stdio;
    let system = paths::system_directory()?;
    let root = system.parent().ok_or("unsupported: 系统目录无效")?;
    let script = launch_script(executable, args)?;
    let mut command =
        tokio::process::Command::new(system.join("WindowsPowerShell/v1.0/powershell.exe"));
    command
        .env_clear()
        .env("SystemRoot", &root)
        .env("WINDIR", &root)
        .env("PATH", &system)
        .env("PATHEXT", ".EXE")
        .env(
            "PSModulePath",
            system.join("WindowsPowerShell/v1.0/Modules"),
        )
        .env("LLAMA_API_KEY", secret)
        .args([
            "-NoLogo",
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            &script,
        ])
        .current_dir(&system)
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .kill_on_drop(true)
        .creation_flags(0x08000000);
    let mut child = command
        .spawn()
        .map_err(|_| "runtime: 无法启动固定本机引擎")?;
    let job = crate::agent_process::OwnedJob::assign(
        child.raw_handle().ok_or("runtime: 无法确认本次进程身份")?,
    )?;
    child
        .stdin
        .take()
        .ok_or("runtime: 私有启动门禁不可用")?
        .write_all(b"start\n")
        .await
        .map_err(|_| "runtime: 启动门禁失败")?;
    Ok((child, job))
}
async fn loaded(runtime: &OwnedRuntime) -> Result<bool, String> {
    let client = reqwest::Client::builder()
        .no_proxy()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(Duration::from_secs(2))
        .build()
        .map_err(|_| "runtime: 状态客户端不可用")?;
    let read = |path: &str| {
        let client = &client;
        let url = format!("{}{path}", runtime.endpoint);
        async move {
            let mut response = client
                .get(url)
                .bearer_auth(runtime.secret.as_str())
                .send()
                .await
                .map_err(|_| "runtime: 本机引擎未响应")?;
            if !response.status().is_success() {
                return Err("runtime: 本机引擎身份检查失败".to_string());
            }
            let mut raw = Vec::new();
            while let Some(chunk) = response
                .chunk()
                .await
                .map_err(|_| "runtime: 状态读取失败")?
            {
                if raw.len() + chunk.len() > 256 * 1024 {
                    return Err("runtime: 状态超过限制".into());
                }
                raw.extend_from_slice(&chunk);
            }
            serde_json::from_slice::<Value>(&raw).map_err(|_| "runtime: 本机状态格式无效".into())
        }
    };
    let models = read("/v1/models").await?;
    if !models["data"]
        .as_array()
        .is_some_and(|items| items.len() == 1 && items[0]["id"] == runtime.alias)
    {
        return Err("runtime: 端口不属于当前模型实例".into());
    }
    let props = read("/props").await?;
    let build = props["build_info"].as_str().unwrap_or("");
    if !build.contains("11429")
        || !build.contains("d812350")
        || props["total_slots"] != 1
        || props["model_path"].as_str() != Some(runtime.model.to_string_lossy().as_ref())
    {
        return Err("runtime: 运行版本、模型或槽位不符".into());
    }
    Ok(props["modalities"]["vision"] == true)
}
async fn authorize_verified<F, U>(
    verification: impl std::future::Future<Output = Result<(), String>>,
    authorize: F,
) -> Result<RuntimeAuthorization, String>
where
    F: FnOnce() -> U,
    U: std::future::Future<Output = Result<RuntimeAuthorization, String>>,
{
    verification.await?;
    let authorization = authorize().await?;
    authorization.fresh()?;
    Ok(authorization)
}
impl LocalModelManager {
    pub async fn ensure_started(
        self: &Arc<Self>,
        owner: &str,
        id: &str,
        authorization: RuntimeAuthorization,
    ) -> Result<RuntimeStatus, String> {
        self.ensure_started_with(owner, id, || async move { Ok(authorization) })
            .await
    }
    pub async fn ensure_started_with<F, U>(
        self: &Arc<Self>,
        owner: &str,
        id: &str,
        authorize: F,
    ) -> Result<RuntimeStatus, String>
    where
        F: FnOnce() -> U,
        U: std::future::Future<Output = Result<RuntimeAuthorization, String>>,
    {
        let mut guard = self.runtime.lock().await;
        if let Some(current) = guard.as_mut() {
            if current
                .child
                .try_wait()
                .map_err(|_| "runtime: 无法读取子进程状态")?
                .is_none()
            {
                if current.status.installation_id != id {
                    return Err("busy: 已有本地模型驻留；请由任务宿主先协调卸载".into());
                }
                if current.status.state == "running" {
                    loaded(current).await?;
                }
                return Ok(current.status.clone());
            }
            *guard = None;
        }
        let receipt = self.receipt(id)?;
        let prepared = catalog::prepare(receipt.selection())?;
        let package = &prepared.packages[0];
        if package.engine != "llama.cpp" {
            return Err("unsupported: H3 需要独立 ComfyUI 工作流验收，未启动".into());
        }
        let relative = receipt
            .runtime_relative
            .as_ref()
            .ok_or("missing: 需要先显式安装固定本地引擎")?;
        let manager = Arc::clone(self);
        let install = id.to_owned();
        let authorization = authorize_verified(
            async move {
                tokio::task::spawn_blocking(move || manager.inspect(&install))
                    .await
                    .map_err(|_| "io: 安装检查线程失败".to_string())?
                    .map(|_| ())
            },
            authorize,
        )
        .await?;
        authorization.check(package, &receipt.backend)?;
        let selected = paths::Directory::open(Path::new(&receipt.selected_root))?;
        let directory = selected.managed(false)?;
        let executable = directory.child(&format!("{relative}/llama-server.exe"), false)?;
        let path_for = |role: &str| -> Result<PathBuf, String> {
            let a = package
                .artifacts
                .iter()
                .find(|a| a.role == role)
                .ok_or("catalog: 匹配模型文件缺失")?;
            if receipt.associated {
                selected.child(&a.path, false)
            } else {
                let f = prepared
                    .files
                    .iter()
                    .find(|f| f.sha256 == a.sha256)
                    .ok_or("catalog: 固定文件缺失")?;
                directory.child(&f.relative, false)
            }
        };
        let model = path_for("model")?;
        let projector = path_for("projector")?;
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
            .await
            .map_err(|_| "runtime: 本机端口不可用")?;
        let port = listener
            .local_addr()
            .map_err(|_| "runtime: 本机端口不可用")?
            .port();
        drop(listener);
        let instance = paths::random_id()?;
        let alias = format!("kk-local-{instance}");
        let secret = Zeroizing::new(paths::random_id()?);
        let args = arguments(
            &model,
            &projector,
            &alias,
            port,
            package.context_tokens.unwrap_or(4096),
            authorization.threads,
            &receipt.backend,
        )?;
        #[cfg(not(windows))]
        {
            let _ = (executable, args, secret);
            return Err("unsupported: 本地引擎目前需要 Windows x64".into());
        }
        #[cfg(windows)]
        {
            let (child, job) = spawn(&executable, &args, &secret).await?;
            *guard = Some(OwnedRuntime {
                owner: owner.into(),
                status: RuntimeStatus::new(id, Some(instance.clone()), "starting"),
                endpoint: format!("http://127.0.0.1:{port}"),
                secret,
                alias,
                model,
                job: Some(job),
                child,
                _authorization: authorization,
            });
            drop(guard);
            let deadline = tokio::time::Instant::now() + Duration::from_secs(180);
            loop {
                tokio::time::sleep(Duration::from_millis(150)).await;
                let mut guard = self.runtime.lock().await;
                let current = guard
                    .as_mut()
                    .filter(|r| r.status.instance_id.as_deref() == Some(&instance))
                    .ok_or("cancelled: 本次模型启动已停止")?;
                if current
                    .child
                    .try_wait()
                    .map_err(|_| "runtime: 无法读取启动进程")?
                    .is_some()
                {
                    current.status.state = "failed".into();
                    current.status.error = Some("runtime: 引擎退出，未标记为可用".into());
                    return Ok(current.status.clone());
                }
                if let Ok(vision) = loaded(current).await {
                    current.status.state = "running".into();
                    current.status.text = "loaded".into();
                    if vision {
                        current.status.vision = "loaded".into();
                    }
                    return Ok(current.status.clone());
                }
                if tokio::time::Instant::now() >= deadline {
                    drop(guard);
                    let _ = self.stop_owned(owner, &instance).await;
                    return Err("runtime: 模型加载或身份检查超时，已停止本次进程".into());
                }
            }
        }
    }
    pub async fn runtime_status(&self) -> Option<RuntimeStatus> {
        let mut guard = self.runtime.lock().await;
        let current = guard.as_mut()?;
        if current.child.try_wait().ok().flatten().is_some() {
            current.status.state = "failed".into();
            current.status.error = Some("runtime: 引擎进程已退出".into());
            current._authorization.lease.take();
            #[cfg(windows)]
            current.job.take();
        } else if current.status.state == "starting" {
            if let Ok(vision) = loaded(current).await {
                current.status.state = "running".into();
                current.status.text = "loaded".into();
                if vision {
                    current.status.vision = "loaded".into();
                }
            }
        }
        Some(current.status.clone())
    }
    pub(crate) async fn execution_binding(&self, id: &str) -> Result<ExecutionBinding, String> {
        let guard = self.runtime.lock().await;
        let runtime = guard
            .as_ref()
            .filter(|r| r.status.installation_id == id && r.status.state == "running")
            .ok_or("runtime: 本地模型未就绪")?;
        loaded(runtime).await?;
        Ok(ExecutionBinding {
            endpoint: format!("{}/v1", runtime.endpoint),
            secret: Zeroizing::new(runtime.secret.to_string()),
            instance_id: runtime
                .status
                .instance_id
                .clone()
                .ok_or("runtime: 实例身份缺失")?,
            model: runtime.alias.clone(),
        })
    }
    pub async fn stop_owned(&self, owner: &str, instance: &str) -> Result<RuntimeStatus, String> {
        let mut guard = self.runtime.lock().await;
        let runtime = guard
            .as_mut()
            .filter(|r| r.status.instance_id.as_deref() == Some(instance))
            .ok_or("missing: 该自有实例不存在")?;
        if runtime.owner != owner {
            return Err("permission: 实例不属于当前启动者".into());
        }
        #[cfg(windows)]
        drop(runtime.job.take());
        runtime
            .child
            .start_kill()
            .map_err(|_| "runtime: 无法请求停止本次引擎")?;
        tokio::time::timeout(Duration::from_secs(5), runtime.child.wait())
            .await
            .map_err(|_| "runtime: 尚未确认引擎退出，资源租约保留")?
            .map_err(|_| "runtime: 无法确认引擎退出")?;
        let result = RuntimeStatus::new(&runtime.status.installation_id, None, "stopped");
        *guard = None;
        Ok(result)
    }
    pub fn shutdown_owned(&self) {
        if let Ok(mut guard) = self.runtime.try_lock() {
            guard.take();
        }
    }
}
#[cfg(test)]
#[path = "runtime_tests.rs"]
mod tests;
