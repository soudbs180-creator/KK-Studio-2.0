use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex as SyncMutex};
use std::time::{Duration, Instant};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::process::{Child, Command};
use tokio::sync::{Mutex, Notify};
use zeroize::Zeroize;

const DEFAULT_BRIDGE_PORT: u16 = 1424;
const GATED_NODE: &str = r#"const {spawn}=require('node:child_process');process.stdin.once('data',data=>{if(data.toString().trim()!=='start')process.exit(1);process.stdin.pause();const child=spawn(process.execPath,process.argv.slice(1),{stdio:['ignore','inherit','inherit'],windowsHide:true});child.on('error',()=>process.exit(1));child.on('exit',code=>process.exit(code??1));});"#;

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum CliTool {
    Codex,
    Gemini,
    Codebuddy,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum CliAction {
    Install,
    Login,
}

impl CliTool {
    fn package(self) -> &'static str {
        match self {
            Self::Codex => "@openai/codex",
            Self::Gemini => "@google/gemini-cli",
            Self::Codebuddy => "@tencent-ai/codebuddy-code",
        }
    }
    fn bin(self) -> &'static str {
        match self {
            Self::Codex => "codex",
            Self::Gemini => "gemini",
            Self::Codebuddy => "codebuddy",
        }
    }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CliInspection {
    pub tool: CliTool,
    pub installed: bool,
    pub complete: bool,
    pub version: Option<String>,
    pub node_available: bool,
    pub npm_available: bool,
    pub cli_path: Option<String>,
    pub message: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CliOperation {
    pub operation_id: String,
    pub tool: CliTool,
    pub action: CliAction,
    pub phase: String,
    pub pid: Option<u32>,
    pub message: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeState {
    pub owned: bool,
    pub running: bool,
    pub healthy: bool,
    pub endpoint: Option<String>,
    pub pid: Option<u32>,
    pub message: String,
}

impl BridgeState {
    fn stopped(message: &str) -> Self {
        Self {
            owned: false,
            running: false,
            healthy: false,
            endpoint: None,
            pid: None,
            message: message.into(),
        }
    }
}

struct NodeEnvironment {
    node: PathBuf,
    npm: Option<PathBuf>,
}
struct Invocation {
    node: PathBuf,
    entry: PathBuf,
}

#[cfg(windows)]
struct OperationOwner {
    view: CliOperation,
    process: WindowsProcess,
}
#[cfg(windows)]
struct BridgeOwner {
    process: HiddenProcess,
    nonce: String,
    endpoint: String,
    pid: u32,
}
#[cfg(windows)]
impl Drop for BridgeOwner {
    fn drop(&mut self) {
        self.nonce.zeroize();
    }
}

pub struct CliRuntime {
    runtime_dir: PathBuf,
    #[cfg(windows)]
    operations: Mutex<HashMap<String, OperationOwner>>,
    #[cfg(windows)]
    bridge: Mutex<Option<BridgeOwner>>,
    bridge_cancel: SyncMutex<Option<Arc<Notify>>>,
}

impl CliRuntime {
    pub fn new(runtime_dir: PathBuf) -> Self {
        Self {
            runtime_dir: dunce::simplified(&runtime_dir).to_path_buf(),
            #[cfg(windows)]
            operations: Mutex::new(HashMap::new()),
            #[cfg(windows)]
            bridge: Mutex::new(None),
            bridge_cancel: SyncMutex::new(None),
        }
    }

    fn environment(&self, tool: CliTool) -> Option<NodeEnvironment> {
        if tool == CliTool::Codex {
            let node = self.runtime_dir.join("node.exe");
            return node
                .is_file()
                .then_some(NodeEnvironment { node, npm: None });
        }
        let paths = std::env::var_os("PATH")?;
        for directory in std::env::split_paths(&paths) {
            let candidate = directory.join("node.exe");
            if !candidate.is_file() {
                continue;
            }
            let node = local_file(&candidate).ok()?;
            let npm = node.parent()?.join("node_modules/npm/bin/npm-cli.js");
            return Some(NodeEnvironment {
                node,
                npm: npm.is_file().then_some(npm),
            });
        }
        None
    }

    #[cfg(windows)]
    async fn invocation(&self, tool: CliTool) -> Result<Invocation, String> {
        let environment = self
            .environment(tool)
            .ok_or("未找到 Node.js；请安装完整 Node/npm 环境。")?;
        let package = if tool == CliTool::Codex {
            self.runtime_dir.join("agent/node_modules/@openai/codex")
        } else {
            let npm = environment
                .npm
                .ok_or("Node 旁没有 npm-cli.js，请使用安装 CLI 的同一完整 Node/npm 环境。")?;
            let root = capture(
                &environment.node,
                &[
                    npm.to_string_lossy().into_owned(),
                    "root".into(),
                    "-g".into(),
                ],
            )
            .await?;
            let root = local_directory(Path::new(root.trim()))?;
            root.join(tool.package())
        };
        let package = local_directory(&package)
            .map_err(|_| "未找到完整 CLI 安装目录；请先安装或修复运行包。")?;
        let metadata_path = package.join("package.json");
        if std::fs::metadata(&metadata_path)
            .map_err(|_| "CLI 包元数据缺失，请修复完整安装。")?
            .len()
            > 1024 * 1024
        {
            return Err("CLI 包元数据超过限制。".into());
        }
        let bytes =
            std::fs::read(metadata_path).map_err(|_| "CLI 包元数据缺失，请修复完整安装。")?;
        if bytes.len() > 1024 * 1024 {
            return Err("CLI 包元数据超过限制。".into());
        }
        let metadata: serde_json::Value =
            serde_json::from_slice(&bytes).map_err(|_| "CLI 包元数据无效。")?;
        if metadata["name"].as_str() != Some(tool.package()) {
            return Err("CLI 包身份与官方安装入口不一致。".into());
        }
        let bin = metadata["bin"]
            .as_str()
            .or_else(|| metadata["bin"][tool.bin()].as_str())
            .ok_or("CLI 缺少受支持的脚本入口。")?;
        let entry = local_file(&package.join(bin))?;
        if !entry.starts_with(&package) {
            return Err("CLI 入口不能离开安装目录。".into());
        }
        Ok(Invocation {
            node: environment.node,
            entry,
        })
    }

    pub async fn inspect(&self, tool: CliTool) -> CliInspection {
        let environment = self.environment(tool);
        let mut result = CliInspection {
            tool,
            installed: false,
            complete: false,
            version: None,
            node_available: environment.is_some(),
            npm_available: environment
                .as_ref()
                .is_some_and(|value| value.npm.is_some()),
            cli_path: None,
            message: "当前平台不支持本机 CLI 管理。".into(),
        };
        #[cfg(windows)]
        {
            let invocation = match self.invocation(tool).await {
                Ok(value) => value,
                Err(error) => {
                    result.message = error;
                    return result;
                }
            };
            result.installed = true;
            result.cli_path = Some(invocation.entry.to_string_lossy().into_owned());
            let entry = invocation.entry.to_string_lossy().into_owned();
            match capture(&invocation.node, &[entry.clone(), "--version".into()]).await {
                Ok(version) if valid_version(version.trim()) => {
                    result.version = Some(version.trim().into())
                }
                _ => {
                    result.message =
                        "CLI 版本命令失败，文件存在不代表完整可用，请修复安装。".into();
                    return result;
                }
            }
            match capture(&invocation.node, &[entry.clone(), "--help".into()]).await {
                Ok(help) if !help.trim().is_empty() => {
                    result.complete = true;
                    result.message = "版本与帮助命令通过；尚未验证账号登录或模型连接。".into();
                }
                _ => result.message = "CLI 帮助命令失败；请修复完整安装，原配置保留。".into(),
            }
            if result.complete && tool == CliTool::Codex {
                for command in ["login", "app-server"] {
                    match capture(
                        &invocation.node,
                        &[entry.clone(), command.into(), "--help".into()],
                    )
                    .await
                    {
                        Ok(help) if !help.trim().is_empty() => {}
                        _ => {
                            result.complete = false;
                            result.message =
                                "随包 Codex 登录或 Agent 入口帮助失败；请修复完整 KK 安装包。"
                                    .into();
                            break;
                        }
                    }
                }
            }
        }
        result
    }

    pub async fn begin(&self, tool: CliTool, action: CliAction) -> Result<CliOperation, String> {
        #[cfg(not(windows))]
        {
            let _ = (tool, action);
            return Err("此操作仅支持 Windows。".into());
        }
        #[cfg(windows)]
        {
            let (node, args) = match action {
                CliAction::Install => {
                    if tool == CliTool::Codex {
                        return Err(
                            "Codex 由完整 KK 安装包提供；请修复安装包，不使用全局版本替代。".into(),
                        );
                    }
                    let environment = self.environment(tool).ok_or("请先安装完整 Node/npm。")?;
                    let npm = environment
                        .npm
                        .ok_or("当前 Node 旁没有 npm；请核对所用安装环境。")?;
                    (
                        environment.node,
                        vec![
                            npm.to_string_lossy().into_owned(),
                            "install".into(),
                            "-g".into(),
                            tool.package().into(),
                        ],
                    )
                }
                CliAction::Login => {
                    if !self.inspect(tool).await.complete {
                        return Err("CLI 完整性检查未通过，不能打开登录。".into());
                    }
                    let invocation = self.invocation(tool).await?;
                    let mut args = vec![invocation.entry.to_string_lossy().into_owned()];
                    if tool == CliTool::Codex {
                        args.push("login".into());
                    }
                    (invocation.node, args)
                }
            };
            let script = powershell_invocation(&node, &args)?;
            self.spawn_operation(tool, action, &script, true).await
        }
    }

    #[cfg(windows)]
    async fn spawn_operation(
        &self,
        tool: CliTool,
        action: CliAction,
        script: &str,
        visible: bool,
    ) -> Result<CliOperation, String> {
        let mut operations = self.operations.lock().await;
        for owner in operations.values_mut() {
            owner.refresh()?;
        }
        if operations
            .values()
            .any(|owner| owner.view.tool == tool && owner.process.running())
        {
            return Err("该 CLI 已有待完成的操作，请先完成或取消。".into());
        }
        // Keep the last state of other tools until their own next operation.
        operations.retain(|_, owner| owner.view.tool != tool || owner.process.running());
        let process = WindowsProcess::spawn(script, visible)?;
        let view = CliOperation {
            operation_id: nonce()?,
            tool,
            action,
            phase: if action == CliAction::Login {
                "terminal-opened"
            } else {
                "running"
            }
            .into(),
            pid: Some(process.pid),
            message: "已打开本次操作终端；退出后需重新检测，未宣称已登录。".into(),
        };
        operations.insert(
            view.operation_id.clone(),
            OperationOwner {
                view: view.clone(),
                process,
            },
        );
        Ok(view)
    }

    pub async fn state(&self, operation_id: &str) -> Result<CliOperation, String> {
        #[cfg(not(windows))]
        {
            let _ = operation_id;
            return Err("此操作仅支持 Windows。".into());
        }
        #[cfg(windows)]
        {
            let mut operations = self.operations.lock().await;
            let owner = operations
                .get_mut(operation_id)
                .ok_or("找不到本次 KK 托管操作。")?;
            owner.refresh()?;
            Ok(owner.view.clone())
        }
    }

    pub async fn cancel(&self, operation_id: &str) -> Result<CliOperation, String> {
        #[cfg(not(windows))]
        {
            let _ = operation_id;
            return Err("此操作仅支持 Windows。".into());
        }
        #[cfg(windows)]
        {
            let mut operations = self.operations.lock().await;
            let owner = operations
                .get_mut(operation_id)
                .ok_or("只能取消本次 KK 托管操作。")?;
            owner.refresh()?;
            if owner.process.running() {
                owner.process.cancel().await?;
                owner.view.phase = "cancelled".into();
                owner.view.message =
                    "本次托管操作已取消；原配置与安装资料保留，请重新检测完整性。".into();
            }
            Ok(owner.view.clone())
        }
    }

    pub async fn start_bridge(&self, port: Option<u16>) -> Result<BridgeState, String> {
        let port = valid_port(port.unwrap_or(DEFAULT_BRIDGE_PORT))?;
        #[cfg(not(windows))]
        {
            let _ = port;
            return Err("此操作仅支持 Windows。".into());
        }
        #[cfg(windows)]
        {
            let mut bridge = self.bridge.lock().await;
            if let Some(owner) = bridge.as_mut() {
                if owner
                    .process
                    .child
                    .try_wait()
                    .map_err(|_| "无法核对桥进程。")?
                    .is_none()
                {
                    if owner.endpoint != format!("http://127.0.0.1:{port}") {
                        return Err("已有托管桥使用另一个端口，请先停止它。".into());
                    }
                    return owner.health().await;
                }
                *bridge = None;
            }
            let listener = std::net::TcpListener::bind(("127.0.0.1", port))
                .map_err(|_| "桥端口已被占用；不会停止或接管外部进程。")?;
            drop(listener);
            let cancel = Arc::new(Notify::new());
            *self
                .bridge_cancel
                .lock()
                .map_err(|_| "无法准备桥控制通道。")? = Some(Arc::clone(&cancel));
            let inspection = tokio::select! {
                result = self.inspect(CliTool::Gemini) => result,
                _ = cancel.notified() => return Err("桥启动已取消。".into()),
            };
            if !inspection.complete {
                return Err("请先安装完整 Gemini CLI；账号登录需单独完成。".into());
            }
            let node = self
                .environment(CliTool::Gemini)
                .ok_or("未找到完整 Node/npm。")?
                .node;
            let entry = local_file(&self.runtime_dir.join("gemini-bridge.mjs"))?;
            let secret = nonce()?;
            let args = vec![
                entry.to_string_lossy().into_owned(),
                "--port".into(),
                port.to_string(),
            ];
            let mut process = HiddenProcess::spawn(&node, &args, Some(&secret)).await?;
            let stdout = process
                .child
                .stdout
                .take()
                .ok_or("桥未提供私有就绪通道。")?;
            let handshake = tokio::select! {
                result = tokio::time::timeout(Duration::from_secs(15), bridge_ready(stdout, port, &secret)) => result.map_err(|_| "桥启动超时，已回收本次进程。")?,
                _ = cancel.notified() => Err("桥启动已取消。".into()),
            }?;
            let owner = BridgeOwner {
                process,
                nonce: secret,
                endpoint: format!("http://127.0.0.1:{port}"),
                pid: handshake,
            };
            let result = owner.health().await?;
            *bridge = Some(owner);
            Ok(result)
        }
    }

    pub async fn stop_bridge(&self) -> Result<BridgeState, String> {
        if let Some(cancel) = self
            .bridge_cancel
            .lock()
            .map_err(|_| "无法取消桥操作。")?
            .as_ref()
        {
            cancel.notify_one();
        }
        #[cfg(windows)]
        {
            let mut bridge = self.bridge.lock().await;
            if let Some(owner) = bridge.as_mut() {
                if owner
                    .process
                    .child
                    .try_wait()
                    .map_err(|_| "无法核对桥进程。")?
                    .is_none()
                {
                    owner.shutdown_gate().await?;
                    owner.process.cancel().await?;
                }
            }
            *bridge = None;
            *self
                .bridge_cancel
                .lock()
                .map_err(|_| "无法结束桥控制通道。")? = None;
        }
        Ok(BridgeState::stopped(
            "本次 KK 托管桥已停止；外部桥不受影响。",
        ))
    }

    pub async fn bridge_state(&self) -> Result<BridgeState, String> {
        #[cfg(windows)]
        {
            let mut bridge = self.bridge.lock().await;
            if let Some(owner) = bridge.as_mut() {
                if owner
                    .process
                    .child
                    .try_wait()
                    .map_err(|_| "无法核对桥进程。")?
                    .is_none()
                {
                    return Ok(owner.health().await.unwrap_or_else(|message| BridgeState {
                        owned: true,
                        running: true,
                        healthy: false,
                        endpoint: Some(owner.endpoint.clone()),
                        pid: Some(owner.pid),
                        message,
                    }));
                }
                *bridge = None;
                return Ok(BridgeState::stopped(
                    "托管桥已退出；请先核对未完成请求，再重新启动。",
                ));
            }
        }
        Ok(BridgeState::stopped(
            "没有本次 KK 托管桥；外部运行的桥不受管理。",
        ))
    }

    pub fn shutdown(&self) {
        if let Ok(cancel) = self.bridge_cancel.lock() {
            if let Some(cancel) = cancel.as_ref() {
                cancel.notify_one();
            }
        }
        #[cfg(windows)]
        {
            if let Ok(mut operations) = self.operations.try_lock() {
                operations.clear();
            }
            if let Ok(mut bridge) = self.bridge.try_lock() {
                *bridge = None;
            }
        }
        // On process exit Windows also closes outstanding Job handles.
    }
}

fn valid_port(port: u16) -> Result<u16, String> {
    if port < 1024 {
        Err("桥端口须为 1024–65535 的本机端口。".into())
    } else {
        Ok(port)
    }
}
fn valid_version(value: &str) -> bool {
    if value.len() > 100
        || !value
            .chars()
            .all(|value| value.is_ascii_alphanumeric() || " ._+-".contains(value))
    {
        return false;
    }
    let version = value
        .split_whitespace()
        .last()
        .unwrap_or("")
        .trim_start_matches('v');
    let stable = version.split(['-', '+']).next().unwrap_or("");
    let parts: Vec<_> = stable.split('.').collect();
    parts.len() == 3
        && parts
            .iter()
            .all(|part| !part.is_empty() && part.bytes().all(|byte| byte.is_ascii_digit()))
}
fn local_directory(value: &Path) -> Result<PathBuf, String> {
    let result = std::fs::canonicalize(value).map_err(|_| "本机 CLI 路径不存在或不可读。")?;
    let result = dunce::simplified(&result).to_path_buf();
    #[cfg(windows)]
    {
        let text = result.to_string_lossy();
        let bytes = text.as_bytes();
        if bytes.len() < 3
            || !bytes[0].is_ascii_alphabetic()
            || bytes[1] != b':'
            || !matches!(bytes[2], b'\\' | b'/')
        {
            return Err("CLI 仅接受本机磁盘路径，不使用网络共享或设备路径。".into());
        }
    }
    Ok(result)
}
fn local_file(value: &Path) -> Result<PathBuf, String> {
    let result = local_directory(value)?;
    if !result.is_file() {
        return Err("CLI 脚本或 Node 文件不存在。".into());
    }
    Ok(result)
}
fn ps_literal(value: &str) -> Result<String, String> {
    if value.is_empty()
        || value
            .chars()
            .any(|value| matches!(value, '\0' | '\n' | '\r'))
    {
        return Err("CLI 参数包含无效字符。".into());
    }
    Ok(format!("'{}'", value.replace('\'', "''")))
}
fn powershell_invocation(node: &Path, args: &[String]) -> Result<String, String> {
    let mut text = format!("& {}", ps_literal(&node.to_string_lossy())?);
    for arg in args {
        text.push(' ');
        text.push_str(&ps_literal(arg)?);
    }
    Ok(format!("{text}; exit $LASTEXITCODE"))
}

#[cfg(windows)]
async fn capture(node: &Path, args: &[String]) -> Result<String, String> {
    let mut process = HiddenProcess::spawn(node, args, None).await?;
    let stdout = process
        .child
        .stdout
        .take()
        .ok_or("无法读取 CLI 检测结果。")?;
    let (status, bytes) = tokio::time::timeout(Duration::from_secs(15), async {
        let output = async {
            let mut bytes = Vec::new();
            stdout
                .take(64 * 1024 + 1)
                .read_to_end(&mut bytes)
                .await
                .map_err(|_| "无法读取 CLI 检测结果。")?;
            Ok::<_, String>(bytes)
        };
        let wait = async {
            process
                .child
                .wait()
                .await
                .map_err(|_| "CLI 检测进程失败。".to_string())
        };
        tokio::try_join!(wait, output)
    })
    .await
    .map_err(|_| "CLI 检测超时，已回收本次进程。")??;
    if !status.success() || bytes.len() > 64 * 1024 {
        return Err("CLI 本机检测未通过，请修复完整安装。".into());
    }
    String::from_utf8(bytes).map_err(|_| "CLI 检测返回了无效文本。".into())
}

#[cfg(windows)]
struct HiddenProcess {
    job: Option<crate::agent_process::OwnedJob>,
    child: Child,
}
#[cfg(windows)]
impl HiddenProcess {
    async fn spawn(node: &Path, args: &[String], nonce: Option<&str>) -> Result<Self, String> {
        use std::process::Stdio;
        let mut command = Command::new(node);
        crate::agent_process::protect_node_startup(command.as_std_mut());
        command
            .args(["-e", GATED_NODE, "--"])
            .args(args)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .creation_flags(0x08000000)
            .kill_on_drop(true);
        if let Some(nonce) = nonce {
            command.env("KK_GEMINI_BRIDGE_OWNER_NONCE", nonce);
        }
        let mut child = command
            .spawn()
            .map_err(|_| "无法启动本机 Node，请核对完整安装。")?;
        let job = crate::agent_process::OwnedJob::assign(
            child.raw_handle().ok_or("无法确认本次子进程归属。")?,
        )?;
        child
            .stdin
            .take()
            .ok_or("无法打开私有启动门禁。")?
            .write_all(b"start\n")
            .await
            .map_err(|_| "本机进程启动握手失败。")?;
        Ok(Self {
            job: Some(job),
            child,
        })
    }
    async fn cancel(&mut self) -> Result<(), String> {
        drop(self.job.take());
        tokio::time::timeout(Duration::from_secs(3), self.child.wait())
            .await
            .map_err(|_| "托管子进程尚未确认退出。")?
            .map_err(|_| "无法核对托管子进程退出。")?;
        Ok(())
    }
}

#[cfg(windows)]
async fn bridge_ready(
    mut stdout: tokio::process::ChildStdout,
    port: u16,
    nonce: &str,
) -> Result<u32, String> {
    for _ in 0..16 {
        let mut line = Vec::new();
        loop {
            let byte = stdout
                .read_u8()
                .await
                .map_err(|_| "桥启动失败，未返回就绪握手。")?;
            if byte == b'\n' {
                break;
            }
            line.push(byte);
            if line.len() > 8192 {
                return Err("桥启动响应超过限制。".into());
            }
        }
        if let Some(json) = line.strip_prefix(b"KK_GEMINI_BRIDGE_READY ") {
            let value: serde_json::Value =
                serde_json::from_slice(json).map_err(|_| "桥就绪格式无效。")?;
            let valid = value["port"].as_u64() == Some(port as u64)
                && value["nonce"].as_str() == Some(nonce);
            line.zeroize();
            if valid {
                let pid = value["pid"]
                    .as_u64()
                    .and_then(|value| u32::try_from(value).ok())
                    .filter(|pid| *pid > 0)
                    .ok_or("桥进程身份无效。")?;
                tokio::spawn(async move {
                    let _ = tokio::io::copy(&mut stdout, &mut tokio::io::sink()).await;
                });
                return Ok(pid);
            }
            return Err("桥就绪身份不匹配。".into());
        }
    }
    Err("桥没有返回私有就绪握手。".into())
}

#[cfg(windows)]
impl BridgeOwner {
    async fn shutdown_gate(&self) -> Result<(), String> {
        let response = reqwest::Client::builder()
            .no_proxy()
            .timeout(Duration::from_secs(2))
            .build()
            .map_err(|_| "无法准备桥停止检查。")?
            .post(format!("{}/runtime/shutdown", self.endpoint))
            .header("x-kk-bridge-owner", &self.nonce)
            .send()
            .await
            .map_err(|_| "桥未确认停止；请先停止对话后重试。")?;
        if response.status() != reqwest::StatusCode::OK {
            return Err("桥仍在处理请求；请先取消检测或停止对话，再停止桥。".into());
        }
        Ok(())
    }
    async fn health(&self) -> Result<BridgeState, String> {
        let value: serde_json::Value = reqwest::Client::builder()
            .no_proxy()
            .timeout(Duration::from_secs(2))
            .build()
            .map_err(|_| "无法准备免费桥健康检查。")?
            .get(format!("{}/health", self.endpoint))
            .header("x-kk-bridge-owner", &self.nonce)
            .send()
            .await
            .map_err(|_| "托管桥未响应免费健康检查。")?
            .error_for_status()
            .map_err(|_| "托管桥身份检查失败。")?
            .json()
            .await
            .map_err(|_| "托管桥健康响应无效。")?;
        if value["ok"] != true
            || value["service"] != "kk-gemini-bridge"
            || value["nonce"] != self.nonce
            || value["pid"].as_u64() != Some(self.pid as u64)
        {
            return Err("托管桥健康身份不匹配。".into());
        }
        Ok(BridgeState {
            owned: true,
            running: true,
            healthy: true,
            endpoint: Some(self.endpoint.clone()),
            pid: Some(self.pid),
            message: "托管桥已就绪；没有验证账号或调用模型。".into(),
        })
    }
}

#[cfg(windows)]
fn nonce() -> Result<String, String> {
    #[link(name = "advapi32")]
    extern "system" {
        fn SystemFunction036(buffer: *mut std::ffi::c_void, length: u32) -> u8;
    }
    let mut bytes = [0u8; 32];
    if unsafe { SystemFunction036(bytes.as_mut_ptr().cast(), bytes.len() as u32) } == 0 {
        return Err("无法生成本次进程身份。".into());
    }
    Ok(bytes.iter().map(|value| format!("{value:02x}")).collect())
}

#[cfg(windows)]
struct WindowsProcess {
    process: std::os::windows::io::OwnedHandle,
    job: Option<crate::agent_process::OwnedJob>,
    pid: u32,
}
#[cfg(windows)]
impl WindowsProcess {
    fn spawn(script: &str, visible: bool) -> Result<Self, String> {
        use std::os::windows::ffi::OsStrExt;
        use std::os::windows::io::{AsRawHandle, FromRawHandle, OwnedHandle};
        use windows_sys::Win32::System::Threading::{
            CreateProcessW, ResumeThread, TerminateProcess, CREATE_NEW_CONSOLE, CREATE_NO_WINDOW,
            CREATE_SUSPENDED, PROCESS_INFORMATION, STARTUPINFOW,
        };
        let shell = PathBuf::from(std::env::var_os("SystemRoot").ok_or("找不到系统 PowerShell。")?)
            .join("System32/WindowsPowerShell/v1.0/powershell.exe");
        let application: Vec<u16> = shell.as_os_str().encode_wide().chain(Some(0)).collect();
        let args = [
            shell.to_string_lossy().into_owned(),
            "-NoLogo".into(),
            "-NoProfile".into(),
            "-Command".into(),
            script.into(),
        ];
        let mut command: Vec<u16> = args
            .iter()
            .map(|arg| windows_arg(arg))
            .collect::<Vec<_>>()
            .join(" ")
            .encode_utf16()
            .chain(Some(0))
            .collect();
        let cwd: Vec<u16> = std::env::temp_dir()
            .as_os_str()
            .encode_wide()
            .chain(Some(0))
            .collect();
        let mut startup: STARTUPINFOW = unsafe { std::mem::zeroed() };
        startup.cb = std::mem::size_of::<STARTUPINFOW>() as u32;
        let mut info: PROCESS_INFORMATION = unsafe { std::mem::zeroed() };
        let flags = CREATE_SUSPENDED
            | if visible {
                CREATE_NEW_CONSOLE
            } else {
                CREATE_NO_WINDOW
            };
        if unsafe {
            CreateProcessW(
                application.as_ptr(),
                command.as_mut_ptr(),
                std::ptr::null(),
                std::ptr::null(),
                0,
                flags,
                std::ptr::null(),
                cwd.as_ptr(),
                &startup,
                &mut info,
            )
        } == 0
        {
            return Err("无法打开本次 CLI 终端。".into());
        }
        let process = unsafe { OwnedHandle::from_raw_handle(info.hProcess) };
        let thread = unsafe { OwnedHandle::from_raw_handle(info.hThread) };
        let job = match crate::agent_process::OwnedJob::assign(process.as_raw_handle()) {
            Ok(job) => job,
            Err(error) => {
                unsafe {
                    TerminateProcess(process.as_raw_handle(), 1);
                }
                return Err(error);
            }
        };
        if unsafe { ResumeThread(thread.as_raw_handle()) } == u32::MAX {
            drop(job);
            return Err("CLI 终端启动握手失败。".into());
        }
        Ok(Self {
            process,
            job: Some(job),
            pid: info.dwProcessId,
        })
    }
    fn code(&self) -> Result<Option<u32>, String> {
        use std::os::windows::io::AsRawHandle;
        let mut code = 0;
        if unsafe {
            windows_sys::Win32::System::Threading::GetExitCodeProcess(
                self.process.as_raw_handle(),
                &mut code,
            )
        } == 0
        {
            return Err("无法核对本次 CLI 操作进程。".into());
        }
        Ok((code != 259).then_some(code))
    }
    fn running(&self) -> bool {
        self.code().ok().flatten().is_none()
    }
    async fn cancel(&mut self) -> Result<(), String> {
        drop(self.job.take());
        let deadline = Instant::now() + Duration::from_secs(3);
        while self.code()?.is_none() {
            if Instant::now() >= deadline {
                return Err("本次托管操作尚未确认退出。".into());
            }
            tokio::time::sleep(Duration::from_millis(10)).await;
        }
        Ok(())
    }
}

#[cfg(windows)]
fn windows_arg(value: &str) -> String {
    let mut result = String::from("\"");
    let mut slashes = 0;
    for character in value.chars() {
        if character == '\\' {
            slashes += 1;
            continue;
        }
        if character == '"' {
            result.push_str(&"\\".repeat(slashes * 2 + 1));
        } else {
            result.push_str(&"\\".repeat(slashes));
        }
        slashes = 0;
        result.push(character);
    }
    result.push_str(&"\\".repeat(slashes * 2));
    result.push('"');
    result
}

#[cfg(windows)]
impl OperationOwner {
    fn refresh(&mut self) -> Result<(), String> {
        if self.view.phase == "cancelled" {
            return Ok(());
        }
        if let Some(code) = self.process.code()? {
            self.view.phase = if code == 0 { "completed" } else { "failed" }.into();
            self.view.message = if code == 0 {
                "终端已退出；请重新检测完整性与账号连接。"
            } else {
                "本次操作未完成；原配置保留，请查看终端原因后重试。"
            }
            .into();
        }
        Ok(())
    }
}

#[tauri::command]
pub async fn cli_inspect(
    state: tauri::State<'_, CliRuntime>,
    tool: CliTool,
) -> Result<CliInspection, String> {
    Ok(state.inspect(tool).await)
}
#[tauri::command]
pub async fn cli_begin(
    state: tauri::State<'_, CliRuntime>,
    tool: CliTool,
    action: CliAction,
) -> Result<CliOperation, String> {
    state.begin(tool, action).await
}
#[tauri::command]
pub async fn cli_operation_state(
    state: tauri::State<'_, CliRuntime>,
    operation_id: String,
) -> Result<CliOperation, String> {
    state.state(&operation_id).await
}
#[tauri::command]
pub async fn cli_cancel(
    state: tauri::State<'_, CliRuntime>,
    operation_id: String,
) -> Result<CliOperation, String> {
    state.cancel(&operation_id).await
}
#[tauri::command]
pub async fn cli_bridge_start(
    state: tauri::State<'_, CliRuntime>,
    port: Option<u16>,
) -> Result<BridgeState, String> {
    state.start_bridge(port).await
}
#[tauri::command]
pub async fn cli_bridge_stop(state: tauri::State<'_, CliRuntime>) -> Result<BridgeState, String> {
    state.stop_bridge().await
}
#[tauri::command]
pub async fn cli_bridge_state(state: tauri::State<'_, CliRuntime>) -> Result<BridgeState, String> {
    state.bridge_state().await
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn powershell_arguments_are_one_literal_and_reject_control_characters() {
        assert_eq!(
            ps_literal("C:\\KK #1's $profile`folder\\node.exe").unwrap(),
            "'C:\\KK #1''s $profile`folder\\node.exe'"
        );
        for value in ["", "a\0b", "a\nb", "a\rb"] {
            assert!(ps_literal(value).is_err());
        }
        assert_eq!(
            powershell_invocation(Path::new("C:/Node/node.exe"), &["C:/CLI/codebuddy".into()])
                .unwrap(),
            "& 'C:/Node/node.exe' 'C:/CLI/codebuddy'; exit $LASTEXITCODE"
        );
    }
    #[test]
    fn bridge_port_and_reported_version_do_not_imply_login() {
        assert_eq!(valid_port(DEFAULT_BRIDGE_PORT).unwrap(), 1424);
        assert!(valid_port(0).is_err());
        assert!(valid_port(1023).is_err());
        assert!(valid_version("codex-cli 0.155.1"));
        assert!(!valid_version("key\nsecret"));
        assert!(!valid_version("malware.example"));
        assert_eq!(CliTool::Codebuddy.package(), "@tencent-ai/codebuddy-code");
    }
    #[test]
    #[cfg(windows)]
    fn windows_commandline_quotes_preserve_backslashes_and_quotes() {
        assert_eq!(
            windows_arg("C:\\path with spaces\\"),
            "\"C:\\path with spaces\\\\\""
        );
        assert_eq!(windows_arg("a\"b"), "\"a\\\"b\"");
    }
    #[tokio::test]
    #[cfg(windows)]
    async fn gated_hidden_node_executes_only_a_local_version_and_reports_nonzero_failure() {
        let runtime = CliRuntime::new(PathBuf::from("missing-fixture-resources"));
        let environment = runtime
            .environment(CliTool::Gemini)
            .expect("Windows fixtures require the project Node runtime on PATH");
        assert!(capture(&environment.node, &["--version".into()])
            .await
            .unwrap()
            .trim()
            .starts_with('v'));
        assert!(
            capture(&environment.node, &["--kk-invalid-fixture-option".into()])
                .await
                .is_err()
        );
    }
    #[tokio::test]
    #[cfg(windows)]
    async fn foreign_loopback_listener_is_not_adopted_or_stopped() {
        let foreign = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let port = foreign.local_addr().unwrap().port();
        let runtime = CliRuntime::new(PathBuf::from("missing-fixture-resources"));
        assert!(runtime
            .start_bridge(Some(port))
            .await
            .unwrap_err()
            .contains("占用"));
        assert!(!runtime.bridge_state().await.unwrap().owned);
        runtime.stop_bridge().await.unwrap();
        assert!(std::net::TcpListener::bind(("127.0.0.1", port)).is_err());
    }
    #[tokio::test]
    #[cfg(windows)]
    async fn cancelling_one_owned_fixture_does_not_target_another_and_nonzero_exit_fails() {
        let runtime = CliRuntime::new(PathBuf::from("missing-fixture-resources"));
        let one = runtime
            .spawn_operation(
                CliTool::Gemini,
                CliAction::Login,
                "[Threading.Thread]::Sleep(30000); exit 0",
                false,
            )
            .await
            .unwrap();
        let other = runtime
            .spawn_operation(
                CliTool::Codebuddy,
                CliAction::Login,
                "[Threading.Thread]::Sleep(30000); exit 0",
                false,
            )
            .await
            .unwrap();
        assert!(runtime.cancel("external-not-owned-id").await.is_err());
        assert_eq!(
            runtime.cancel(&one.operation_id).await.unwrap().phase,
            "cancelled"
        );
        assert_eq!(
            runtime.state(&other.operation_id).await.unwrap().phase,
            "terminal-opened"
        );
        runtime.cancel(&other.operation_id).await.unwrap();
        let failed = runtime
            .spawn_operation(CliTool::Gemini, CliAction::Install, "exit 7", false)
            .await
            .unwrap();
        assert_eq!(
            runtime.state(&other.operation_id).await.unwrap().phase,
            "cancelled"
        );
        let deadline = Instant::now() + Duration::from_secs(3);
        loop {
            if runtime.state(&failed.operation_id).await.unwrap().phase == "failed" {
                break;
            }
            assert!(Instant::now() < deadline);
            tokio::time::sleep(Duration::from_millis(10)).await;
        }
    }
}
