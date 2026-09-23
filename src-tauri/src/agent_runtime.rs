use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::time::Duration;
use tauri::Manager;
use tokio::io::{AsyncReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, ChildStdin, Command};
use tokio::sync::Mutex;
use zeroize::Zeroize;

#[derive(Clone, Deserialize, Serialize)]
pub struct AgentConnection {
    pub endpoint: String,
    pub token: String,
    pub pid: u32,
}

impl Drop for AgentConnection {
    fn drop(&mut self) {
        self.token.zeroize();
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentStatus {
    available: bool,
    running: bool,
    healthy: bool,
    endpoint: Option<String>,
    pid: Option<u32>,
    reason: Option<String>,
}

struct RuntimeChild {
    #[cfg(windows)]
    _job: crate::agent_process::OwnedJob,
    child: Child,
    _stdin: ChildStdin,
    connection: AgentConnection,
    _data_lock: std::fs::File,
}

pub struct AgentRuntime {
    data_dir: PathBuf,
    runtime: Mutex<Option<RuntimeChild>>,
}

fn validate_connection(connection: &AgentConnection, pid: u32) -> bool {
    let Ok(url) = reqwest::Url::parse(&connection.endpoint) else {
        return false;
    };
    connection.pid == pid
        && pid > 0
        && url.port().is_some_and(|port| port > 0)
        && connection.endpoint == format!("http://127.0.0.1:{}", url.port().unwrap_or(0))
        && connection.token.len() == 64
        && connection
            .token
            .bytes()
            .all(|byte| byte.is_ascii_hexdigit())
}

fn runtime_directory(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .resource_dir()
        .map(|path| path.join("agent-runtime"))
        .map_err(|_| "无法读取桌面 Agent 资源目录。".into())
}

fn node_path(path: &Path) -> PathBuf {
    dunce::simplified(path).to_path_buf()
}

fn lock_data_directory(directory: &Path) -> Result<std::fs::File, String> {
    let mut options = std::fs::OpenOptions::new();
    options.read(true).write(true).create(true).truncate(false);
    #[cfg(windows)]
    {
        use std::os::windows::fs::OpenOptionsExt;
        options.share_mode(0);
    }
    options
        .open(directory.join("desktop-owner.lock"))
        .map_err(|_| "另一个桌面实例正在使用此 Agent 数据目录，或目录不可写。".into())
}

fn available(directory: &Path) -> bool {
    cfg!(windows)
        && directory.join("node.exe").is_file()
        && directory.join("desktop-entry.mjs").is_file()
        && directory.join("agent/dist/index.js").is_file()
}

async fn health(connection: &AgentConnection) -> Option<serde_json::Value> {
    reqwest::Client::builder()
        .no_proxy()
        .timeout(Duration::from_secs(2))
        .build()
        .ok()?
        .get(format!("{}/health", connection.endpoint))
        .header("x-canvas-agent-token", &connection.token)
        .send()
        .await
        .ok()?
        .error_for_status()
        .ok()?
        .json()
        .await
        .ok()
}

async fn readiness(
    stdout: tokio::process::ChildStdout,
    pid: u32,
) -> Result<(AgentConnection, BufReader<tokio::process::ChildStdout>), String> {
    let mut reader = BufReader::new(stdout);
    for _ in 0..32 {
        let mut bytes = Vec::new();
        loop {
            let byte = reader
                .read_u8()
                .await
                .map_err(|_| "Agent 启动失败，请检查桌面运行包。")?;
            if byte == b'\n' {
                break;
            }
            bytes.push(byte);
            if bytes.len() > 8192 {
                return Err("Agent 启动响应超过限制。".into());
            }
        }
        if let Some(data) = bytes.strip_prefix(b"KK_AGENT_READY ") {
            let parsed = serde_json::from_slice::<AgentConnection>(data);
            bytes.zeroize();
            let connection = parsed.map_err(|_| "Agent 启动响应无效。")?;
            if !validate_connection(&connection, pid) {
                return Err("Agent 进程身份或地址不匹配。".into());
            }
            return Ok((connection, reader));
        }
    }
    Err("Agent 未返回可验证的启动状态。".into())
}

impl AgentRuntime {
    pub fn new(data_dir: PathBuf) -> Self {
        Self {
            data_dir: node_path(&data_dir),
            runtime: Mutex::new(None),
        }
    }

    async fn start_at(&self, directory: &Path) -> Result<AgentConnection, String> {
        let directory = node_path(directory);
        let mut guard = self.runtime.lock().await;
        if let Some(runtime) = guard.as_mut() {
            if runtime
                .child
                .try_wait()
                .map_err(|_| "无法读取 Agent 进程状态。")?
                .is_none()
            {
                if health(&runtime.connection)
                    .await
                    .is_some_and(|value| value["ok"] == true)
                {
                    return Ok(runtime.connection.clone());
                }
                return Err("已有托管 Agent 未响应；请先核对任务并停止服务。".into());
            }
            *guard = None;
        }
        if !available(&directory) {
            return Err(
                "此安装包未包含 Windows Agent 运行资源，请使用包含 Agent 的桌面包。".into(),
            );
        }
        std::fs::create_dir_all(&self.data_dir).map_err(|_| "无法创建 Agent 本地数据目录。")?;
        let data_lock = lock_data_directory(&self.data_dir)?;
        let mut command = Command::new(directory.join("node.exe"));
        command
            .arg(directory.join("desktop-entry.mjs"))
            .current_dir(&self.data_dir)
            .env("KK_AGENT_DATA_DIR", &self.data_dir)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .kill_on_drop(true);
        #[cfg(windows)]
        command.creation_flags(0x08000000);
        let mut child = command
            .spawn()
            .map_err(|_| "无法启动随包 Agent，请检查安装文件。")?;
        let pid = child.id().ok_or("无法确认 Agent 进程身份。")?;
        #[cfg(windows)]
        let job = crate::agent_process::OwnedJob::assign(
            child.raw_handle().ok_or("无法取得 Agent 进程句柄。")?,
        )?;
        let mut stdin = child.stdin.take().ok_or("无法打开 Agent 控制通道。")?;
        let stdout = child.stdout.take().ok_or("无法打开 Agent 状态通道。")?;
        stdin
            .write_all(b"start\n")
            .await
            .map_err(|_| "Agent 启动握手失败。")?;
        let (connection, mut reader) =
            tokio::time::timeout(Duration::from_secs(60), readiness(stdout, pid))
                .await
                .map_err(|_| "Agent 启动超时，已回收本次进程。")??;
        if !health(&connection)
            .await
            .is_some_and(|value| value["ok"] == true)
        {
            return Err("Agent 健康检查失败，已回收本次进程。".into());
        }
        // Keep stdout open after the private handshake. Discard later diagnostics;
        // neither credentials nor account/provider details enter native logs.
        tokio::spawn(async move {
            let _ = tokio::io::copy(&mut reader, &mut tokio::io::sink()).await;
        });
        let result = connection.clone();
        *guard = Some(RuntimeChild {
            _data_lock: data_lock,
            #[cfg(windows)]
            _job: job,
            child,
            _stdin: stdin,
            connection,
        });
        Ok(result)
    }

    async fn status_at(&self, directory: &Path) -> AgentStatus {
        let mut guard = self.runtime.lock().await;
        if let Some(runtime) = guard.as_mut() {
            if matches!(runtime.child.try_wait(), Ok(None)) {
                let healthy = health(&runtime.connection)
                    .await
                    .is_some_and(|value| value["ok"] == true);
                return AgentStatus {
                    available: true,
                    running: true,
                    healthy,
                    endpoint: Some(runtime.connection.endpoint.clone()),
                    pid: Some(runtime.connection.pid),
                    reason: (!healthy).then(|| "服务进程存在，但健康检查失败。".into()),
                };
            }
            *guard = None;
            return AgentStatus {
                available: available(directory),
                running: false,
                healthy: false,
                endpoint: None,
                pid: None,
                reason: Some("托管 Agent 已退出；请核对未完成任务后重新连接。".into()),
            };
        }
        let available = available(directory);
        AgentStatus {
            available,
            running: false,
            healthy: false,
            endpoint: None,
            pid: None,
            reason: (!available).then(|| "此安装包未包含 Windows Agent 运行资源。".into()),
        }
    }

    async fn stop(&self) -> Result<(), String> {
        let mut guard = self.runtime.lock().await;
        if let Some(runtime) = guard.as_mut() {
            if matches!(runtime.child.try_wait(), Ok(None)) {
                // The server closes its work gate atomically before acknowledging.
                // A read-only health check would race another window's next turn.
                let response = reqwest::Client::builder()
                    .no_proxy()
                    .timeout(Duration::from_secs(3))
                    .build()
                    .map_err(|_| "无法核对 Agent 停止状态。")?
                    .post(format!("{}/runtime/shutdown", runtime.connection.endpoint))
                    .header("x-canvas-agent-token", &runtime.connection.token)
                    .send()
                    .await
                    .map_err(|_| "Agent 未确认停止；请核对任务状态后关闭应用。")?;
                if response.status() != reqwest::StatusCode::OK {
                    return Err("Agent 仍在处理请求，请先停止对话并等待操作结束。".into());
                }
            }
        }
        // Dropping the job kills only our child tree; the token is zeroed on drop.
        if let Some(mut runtime) = guard.take() {
            #[cfg(windows)]
            drop(runtime._job);
            // Keep the directory lock until the old writer has actually exited.
            let _ = runtime.child.wait().await;
        }
        Ok(())
    }

    pub fn shutdown(&self) {
        if let Ok(mut guard) = self.runtime.try_lock() {
            *guard = None;
        }
        // If an IPC startup still holds the mutex, the OS closes its job handle on exit.
    }
}

#[tauri::command]
pub async fn agent_runtime_start(
    app: tauri::AppHandle,
    state: tauri::State<'_, AgentRuntime>,
) -> Result<AgentConnection, String> {
    state.start_at(&runtime_directory(&app)?).await
}

#[tauri::command]
pub async fn agent_runtime_status(
    app: tauri::AppHandle,
    state: tauri::State<'_, AgentRuntime>,
) -> Result<AgentStatus, String> {
    Ok(state.status_at(&runtime_directory(&app)?).await)
}

#[tauri::command]
pub async fn agent_runtime_stop(state: tauri::State<'_, AgentRuntime>) -> Result<(), String> {
    state.stop().await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[cfg(windows)]
    fn data_directory_has_one_live_owner_and_no_stale_pid_lock() {
        let directory = std::env::temp_dir().join(format!(
            "kk-agent-owner-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        std::fs::create_dir(&directory).unwrap();
        let owner = lock_data_directory(&directory).unwrap();
        assert!(lock_data_directory(&directory).is_err());
        drop(owner);
        assert!(lock_data_directory(&directory).is_ok());
        std::fs::remove_file(directory.join("desktop-owner.lock")).unwrap();
        std::fs::remove_dir(directory).unwrap();
    }

    #[test]
    #[cfg(windows)]
    fn node_resource_paths_accept_tauri_verbatim_paths() {
        assert_eq!(
            node_path(Path::new(
                r"\\?\D:\KK Studio\agent-runtime\desktop-entry.mjs"
            )),
            PathBuf::from(r"D:\KK Studio\agent-runtime\desktop-entry.mjs")
        );
    }

    #[test]
    fn readiness_is_bound_to_owned_pid_and_loopback_endpoint() {
        let mut connection = AgentConnection {
            endpoint: "http://127.0.0.1:43123".into(),
            token: "a".repeat(64),
            pid: 1234,
        };
        assert!(validate_connection(&connection, 1234));
        assert!(!validate_connection(&connection, 1235));
        for endpoint in [
            "https://example.com",
            "http://127.0.0.1:0",
            "http://secret@127.0.0.1:43123",
            "http://127.0.0.1:43123/path",
            "http://127.0.0.1:43123?token=secret",
        ] {
            connection.endpoint = endpoint.into();
            assert!(!validate_connection(&connection, 1234));
        }
        connection.endpoint = "http://127.0.0.1:43123".into();
        connection.token = "short".into();
        assert!(!validate_connection(&connection, 1234));
    }
}
