// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(windows)]
mod agent_process;
mod agent_runtime;
mod asset_storage;
mod creation_storage;
mod project_package;
mod storage_paths;
mod task_host;

use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager, State};
use zeroize::Zeroize;

// ========== 配置结构 ==========

#[derive(Debug, Serialize, Deserialize, Clone)]
struct AppConfig {
    #[serde(default = "default_provider")]
    provider: String,
    #[serde(default = "default_api_provider")]
    api_provider: String,
    #[serde(default = "default_base_url")]
    base_url: String,
    #[serde(default)]
    api_key: String,
    #[serde(default = "default_model")]
    default_model: String,
    #[serde(default = "default_temperature")]
    temperature: f32,
    #[serde(default = "default_max_tokens")]
    max_tokens: u32,
    #[serde(default = "default_comfyui_url")]
    comfyui_url: String,
    #[serde(default = "default_h3_model")]
    h3_model: String,
}

fn default_provider() -> String {
    "apimart".to_string()
}
fn default_api_provider() -> String {
    "sub2api".to_string()
}
fn default_base_url() -> String {
    "https://api.apimart.ai/v1".to_string()
}
fn default_model() -> String {
    "gpt-4o".to_string()
}
fn default_temperature() -> f32 {
    0.7
}
fn default_max_tokens() -> u32 {
    4096
}
fn default_comfyui_url() -> String {
    "http://127.0.0.1:8188".to_string()
}
fn default_h3_model() -> String {
    "minimax-h3".to_string()
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            provider: default_provider(),
            api_provider: default_api_provider(),
            base_url: default_base_url(),
            api_key: String::new(),
            default_model: default_model(),
            temperature: default_temperature(),
            max_tokens: default_max_tokens(),
            comfyui_url: default_comfyui_url(),
            h3_model: default_h3_model(),
        }
    }
}

// 提供商预设
fn get_provider_base_url(provider: &str) -> String {
    match provider {
        "apimart" => "https://api.apimart.ai/v1".to_string(),
        "12ai" => "https://api.12ai.org/v1".to_string(),
        _ => "https://api.apimart.ai/v1".to_string(),
    }
}

/// Provider response bodies and transport errors may contain URLs, request
/// details, or echoed credentials. Keep the useful HTTP class while exposing
/// only a fixed, user-facing message across the Tauri IPC boundary.
fn safe_provider_error(status: reqwest::StatusCode) -> String {
    let detail = match status.as_u16() {
        401 => "认证失败，请检查 API Key。",
        403 => "没有权限，请检查项目或模型权限。",
        429 => "请求过于频繁，请稍后重试。",
        500..=599 => "供应商暂时不可用，请稍后重试。",
        _ => "供应商拒绝了请求，请检查模型和输入。",
    };
    format!("API 错误 ({})：{}", status.as_u16(), detail)
}

fn safe_provider_request_error() -> String {
    "请求失败：无法连接模型服务，请检查地址和网络。".to_string()
}

// ========== 对话结构 ==========

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Conversation {
    id: String,
    title: String,
    messages: Vec<ChatMessage>,
    created_at: u64,
    updated_at: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct ChatMessage {
    role: String,
    content: String,
}

// ========== 应用状态 ==========

struct AppState {
    config: Mutex<AppConfig>,
    config_path: PathBuf,
    conversations_path: PathBuf,
    creation: Arc<creation_storage::SnapshotRepository>,
    assets: Arc<asset_storage::AssetRepository>,
    task_host: Arc<task_host::TaskHost>,
    restored_roots: Mutex<std::collections::HashSet<PathBuf>>,
}

#[derive(Debug, Serialize, Clone)]
struct ComfyUIScanEntry {
    path: String,
    kind: String,
    executable: bool,
}

#[derive(Debug, Serialize, Clone)]
struct ComfyUIModelEntry {
    id: String,
    path: String,
    category: String,
    size: u64,
    mtime_ms: u128,
    duplicate_of: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
struct ComfyUIScanResult {
    schema_version: u32,
    root: String,
    detected: bool,
    entries: Vec<ComfyUIScanEntry>,
    models: Vec<ComfyUIModelEntry>,
    truncated: bool,
    message: String,
}

const MAX_SCAN_ENTRIES: usize = 50_000;
const MAX_SCAN_DEPTH: usize = 12;

fn classify_model_directory(name: &str) -> Option<&'static str> {
    match name.to_ascii_lowercase().as_str() {
        "checkpoints" => Some("checkpoints"),
        "vae" => Some("vae"),
        "loras" => Some("loras"),
        "embeddings" => Some("embeddings"),
        "controlnet" => Some("controlnet"),
        "upscale_models" => Some("upscale_models"),
        "clip" => Some("clip"),
        "unet" => Some("unet"),
        "diffusion_models" => Some("diffusion_models"),
        "hypernetworks" => Some("hypernetworks"),
        "gligen" => Some("gligen"),
        _ => None,
    }
}

fn is_model_file(path: &Path) -> bool {
    matches!(
        path.extension()
            .and_then(|value| value.to_str())
            .map(|value| value.to_ascii_lowercase())
            .as_deref(),
        Some("safetensors" | "ckpt" | "pt" | "pth" | "bin" | "gguf" | "onnx" | "emb")
    )
}

fn file_mtime_ms(metadata: &fs::Metadata) -> u128 {
    metadata
        .modified()
        .ok()
        .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}

fn scan_comfyui_path(root: &Path) -> Result<ComfyUIScanResult, String> {
    if !root.exists() {
        return Err("目录不存在，请选择有效的 ComfyUI 文件夹".to_string());
    }
    if !root.is_dir() {
        return Err("所选路径不是文件夹，请选择 ComfyUI 根目录".to_string());
    }
    let root = root
        .canonicalize()
        .map_err(|_| "无法读取所选目录，请检查权限".to_string())?;
    let mut entries = Vec::new();
    let mut models = Vec::new();
    let mut stack = vec![(root.clone(), 0usize)];
    let mut truncated = false;
    let mut duplicate_keys = std::collections::HashMap::<String, String>::new();

    while let Some((directory, depth)) = stack.pop() {
        if depth > MAX_SCAN_DEPTH || entries.len() + models.len() >= MAX_SCAN_ENTRIES {
            truncated = true;
            break;
        }
        let read_dir = fs::read_dir(&directory)
            .map_err(|_| format!("无法读取目录：{}，请检查权限", directory.display()))?;
        for item in read_dir.flatten() {
            if entries.len() + models.len() >= MAX_SCAN_ENTRIES {
                truncated = true;
                break;
            }
            let path = item.path();
            let metadata = match fs::symlink_metadata(&path) {
                Ok(value) => value,
                Err(_) => continue,
            };
            if metadata.file_type().is_symlink() {
                continue;
            }
            if metadata.is_dir() {
                stack.push((path, depth + 1));
                continue;
            }
            let name = path
                .file_name()
                .and_then(|value| value.to_str())
                .unwrap_or_default()
                .to_ascii_lowercase();
            let path_string = path.to_string_lossy().to_string();
            if name == "main.py" {
                entries.push(ComfyUIScanEntry {
                    path: path_string.clone(),
                    kind: "python".to_string(),
                    executable: true,
                });
            } else if matches!(
                name.as_str(),
                "run_nvidia_gpu.bat"
                    | "run_cpu.bat"
                    | "run amd gpu.bat"
                    | "run_directml.bat"
                    | "start.bat"
            ) {
                entries.push(ComfyUIScanEntry {
                    path: path_string.clone(),
                    kind: "launcher".to_string(),
                    executable: true,
                });
            } else if matches!(name.as_str(), "requirements.txt" | "pyproject.toml") {
                entries.push(ComfyUIScanEntry {
                    path: path_string.clone(),
                    kind: "package".to_string(),
                    executable: false,
                });
            }
            if is_model_file(&path) {
                if let Some(parent) = path
                    .parent()
                    .and_then(|value| value.file_name())
                    .and_then(|value| value.to_str())
                    .and_then(classify_model_directory)
                {
                    let size = metadata.len();
                    let mtime_ms = file_mtime_ms(&metadata);
                    let id = format!("{}|{}|{}", path_string, size, mtime_ms);
                    let key = format!("{}|{}|{}|{}", parent, name, size, mtime_ms);
                    let duplicate_of = duplicate_keys.get(&key).cloned();
                    if duplicate_of.is_none() {
                        duplicate_keys.insert(key, id.clone());
                    }
                    models.push(ComfyUIModelEntry {
                        id,
                        path: path_string,
                        category: parent.to_string(),
                        size,
                        mtime_ms,
                        duplicate_of,
                    });
                }
            }
        }
    }
    let detected = entries
        .iter()
        .any(|entry| entry.kind == "python" || entry.kind == "launcher")
        || root
            .file_name()
            .and_then(|value| value.to_str())
            .map(|value| value.eq_ignore_ascii_case("comfyui"))
            .unwrap_or(false);
    Ok(ComfyUIScanResult {
        schema_version: 1,
        root: root.to_string_lossy().to_string(),
        detected,
        entries,
        models,
        truncated,
        message: if detected {
            "已发现 ComfyUI，可复用现有安装并继续扫描模型。"
        } else {
            "未发现 ComfyUI 入口，请选择包含 main.py 或启动文件的文件夹。"
        }
        .to_string(),
    })
}

// ========== 系统凭据命令 ==========

const CREDENTIAL_SERVICE: &str = "com.kkstudio.provider";

fn validate_credential_provider_id(provider_id: &str) -> Result<(), String> {
    if provider_id.is_empty()
        || provider_id.len() > 128
        || !provider_id
            .chars()
            .all(|value| value.is_ascii_alphanumeric() || value == '_' || value == '-')
    {
        return Err("凭据提供商 ID 无效".to_string());
    }
    Ok(())
}

#[cfg(target_os = "windows")]
fn system_credential_entry(provider_id: &str) -> Result<keyring::Entry, String> {
    keyring::Entry::new(CREDENTIAL_SERVICE, provider_id)
        .map_err(|_| "无法访问 Windows 凭据管理器".to_string())
}

#[tauri::command(rename_all = "camelCase")]
fn credential_set(provider_id: String, mut secret: String) -> Result<bool, String> {
    validate_credential_provider_id(&provider_id)?;
    if secret.trim().is_empty() || secret.len() > 64 * 1024 {
        secret.zeroize();
        return Err("凭据内容为空或过长".to_string());
    }

    #[cfg(target_os = "windows")]
    let result = system_credential_entry(&provider_id)
        .and_then(|entry| {
            entry
                .set_password(secret.trim())
                .map_err(|_| "无法写入 Windows 凭据管理器".to_string())
        })
        .map(|_| true);
    #[cfg(not(target_os = "windows"))]
    let result = Err("当前桌面平台不支持系统凭据库".to_string());

    secret.zeroize();
    result
}

#[tauri::command(rename_all = "camelCase")]
fn credential_get(provider_id: String) -> Result<Option<String>, String> {
    validate_credential_provider_id(&provider_id)?;
    #[cfg(target_os = "windows")]
    {
        let entry = system_credential_entry(&provider_id)?;
        return match entry.get_password() {
            Ok(secret) => Ok(Some(secret)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(_) => Err("无法读取 Windows 凭据管理器".to_string()),
        };
    }
    #[cfg(not(target_os = "windows"))]
    Err("当前桌面平台不支持系统凭据库".to_string())
}

#[tauri::command(rename_all = "camelCase")]
fn credential_delete(provider_id: String) -> Result<bool, String> {
    validate_credential_provider_id(&provider_id)?;
    #[cfg(target_os = "windows")]
    {
        let entry = system_credential_entry(&provider_id)?;
        return match entry.delete_credential() {
            Ok(()) => Ok(true),
            Err(keyring::Error::NoEntry) => Ok(false),
            Err(_) => Err("无法删除 Windows 凭据".to_string()),
        };
    }
    #[cfg(not(target_os = "windows"))]
    Err("当前桌面平台不支持系统凭据库".to_string())
}

// ========== 配置命令 ==========

#[tauri::command]
fn get_config(state: State<AppState>) -> Result<AppConfig, String> {
    // API keys live in memory only and must never cross the IPC boundary. Use the
    // credential commands for the explicit key operation instead.
    let mut config = state.config.lock().unwrap().clone();
    config.api_key.clear();
    Ok(config)
}

#[tauri::command]
fn set_config(state: State<AppState>, config: AppConfig) -> Result<AppConfig, String> {
    // 如果 provider 变化且 base_url 是预设值，自动更新
    let mut final_config = config;
    if final_config.base_url.is_empty()
        || final_config.base_url == "https://api.apimart.ai/v1"
        || final_config.base_url == "https://api.12ai.org/v1"
    {
        final_config.base_url = get_provider_base_url(&final_config.provider);
    }

    // RISK-005：config.json 不落 api_key 明文（内存保留，仅磁盘写入剥离）
    let mut persisted = serde_json::to_value(&final_config).map_err(|e| e.to_string())?;
    if let Some(obj) = persisted.as_object_mut() {
        obj.insert(
            "api_key".to_string(),
            serde_json::Value::String(String::new()),
        );
    }
    let json = serde_json::to_string_pretty(&persisted).map_err(|e| e.to_string())?;
    fs::write(&state.config_path, json).map_err(|e| e.to_string())?;
    *state.config.lock().unwrap() = final_config.clone();
    let mut response_config = final_config;
    response_config.api_key.clear();
    Ok(response_config)
}

#[tauri::command]
fn read_creation_snapshot(state: State<AppState>) -> Result<creation_storage::ReadResult, String> {
    state.creation.read()
}

#[tauri::command(rename_all = "camelCase")]
async fn asset_store(
    state: State<'_, AppState>,
    data_base64: String,
    metadata: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let assets = Arc::clone(&state.assets);
    tauri::async_runtime::spawn_blocking(move || assets.store(data_base64, metadata))
        .await
        .map_err(|_| "io: 素材保存任务中断".to_string())?
}

#[tauri::command(rename_all = "camelCase")]
async fn asset_read(
    state: State<'_, AppState>,
    asset_id: String,
) -> Result<Option<asset_storage::ReadAsset>, String> {
    let assets = Arc::clone(&state.assets);
    tauri::async_runtime::spawn_blocking(move || assets.read(&asset_id))
        .await
        .map_err(|_| "io: 素材读取任务中断".to_string())?
}

#[tauri::command(rename_all = "camelCase")]
async fn asset_list(
    state: State<'_, AppState>,
    offset: Option<usize>,
    limit: Option<usize>,
) -> Result<Vec<serde_json::Value>, String> {
    let assets = Arc::clone(&state.assets);
    tauri::async_runtime::spawn_blocking(move || {
        assets.list_page(offset.unwrap_or(0), limit.unwrap_or(50))
    })
    .await
    .map_err(|_| "io: 素材列表任务中断".to_string())?
}

#[tauri::command]
fn get_storage_root(state: State<AppState>) -> Result<String, String> {
    state
        .config_path
        .parent()
        .and_then(Path::parent)
        .map(|root| root.to_string_lossy().into_owned())
        .ok_or_else(|| "无法确定数据目录".to_string())
}

#[tauri::command(rename_all = "camelCase")]
fn write_creation_snapshot(
    state: State<AppState>,
    snapshot: serde_json::Value,
    expected_revision: Option<u64>,
) -> Result<(), String> {
    state.creation.write(snapshot, expected_revision)
}

#[tauri::command(rename_all = "camelCase")]
async fn export_project_package(
    state: State<'_, AppState>,
    destination: String,
    expected_revision: Option<u64>,
) -> Result<project_package::PackageSummary, String> {
    let root = state
        .config_path
        .parent()
        .and_then(Path::parent)
        .ok_or_else(|| "permission: 无法确认当前数据目录".to_string())?;
    project_package::require_isolated_target(Path::new(&destination), root)?;
    let creation = Arc::clone(&state.creation);
    let assets = Arc::clone(&state.assets);
    tauri::async_runtime::spawn_blocking(move || {
        project_package::export_package_at_revision(
            &creation,
            &assets,
            Path::new(&destination),
            expected_revision,
        )
    })
    .await
    .map_err(|_| "io: 项目包导出任务中断".to_string())?
}

#[tauri::command(rename_all = "camelCase")]
async fn preflight_project_package(
    source: String,
) -> Result<project_package::PackageSummary, String> {
    tauri::async_runtime::spawn_blocking(move || {
        project_package::preflight_package(Path::new(&source))
    })
    .await
    .map_err(|_| "io: 项目包预检任务中断".to_string())?
}

#[tauri::command(rename_all = "camelCase")]
async fn import_project_package(
    state: State<'_, AppState>,
    source: String,
    target_root: String,
) -> Result<project_package::PackageSummary, String> {
    let root = state
        .config_path
        .parent()
        .and_then(Path::parent)
        .ok_or_else(|| "permission: 无法确认当前数据目录".to_string())?;
    project_package::require_isolated_target(Path::new(&target_root), root)?;
    let remembered_root = PathBuf::from(&target_root);
    let summary = tauri::async_runtime::spawn_blocking(move || {
        project_package::import_package(Path::new(&source), Path::new(&target_root))
    })
    .await
    .map_err(|_| "io: 项目包导入任务中断".to_string())??;
    let canonical = remembered_root
        .canonicalize()
        .map_err(|_| "io: 无法确认恢复目录".to_string())?;
    state
        .restored_roots
        .lock()
        .map_err(|_| "io: 恢复目录记录不可用".to_string())?
        .insert(canonical);
    Ok(summary)
}

#[tauri::command(rename_all = "camelCase")]
fn open_restored_project_package(
    state: State<AppState>,
    target_root: String,
) -> Result<(), String> {
    let target = Path::new(&target_root)
        .canonicalize()
        .map_err(|_| "permission: 恢复目录不可用".to_string())?;
    if !state
        .restored_roots
        .lock()
        .map_err(|_| "io: 恢复目录记录不可用".to_string())?
        .contains(&target)
    {
        return Err("permission: 只能打开本次已成功恢复的副本".into());
    }
    let executable = std::env::current_exe().map_err(|_| "io: 无法定位桌面程序".to_string())?;
    let mut command = std::process::Command::new(executable);
    command.arg("--data-dir").arg(target);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
    command
        .spawn()
        .map_err(|_| "io: 无法启动恢复副本窗口".to_string())?;
    Ok(())
}
// ========== 测试连接命令 ==========

#[derive(Debug, Serialize, Deserialize)]
struct TestResult {
    success: bool,
    message: String,
}

#[tauri::command]
async fn test_connection(
    base_url: String,
    api_key: String,
    model: Option<String>,
) -> Result<TestResult, String> {
    test_connection_with_client(reqwest::Client::new(), base_url, api_key, model).await
}

async fn test_connection_with_client(
    client: reqwest::Client,
    base_url: String,
    api_key: String,
    model: Option<String>,
) -> Result<TestResult, String> {
    if api_key.is_empty() {
        return Ok(TestResult {
            success: false,
            message: "API Key 不能为空".to_string(),
        });
    }

    let use_model = model.unwrap_or_else(|| "gpt-4o".to_string());
    let url = format!("{}/chat/completions", base_url.trim_end_matches('/'));

    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&serde_json::json!({
            "model": use_model,
            "messages": [{ "role": "user", "content": "hi" }],
            "max_tokens": 5,
        }))
        .send()
        .await
        .map_err(|_| safe_provider_request_error())?;

    if !response.status().is_success() {
        let status = response.status();
        return Ok(TestResult {
            success: false,
            message: safe_provider_error(status),
        });
    }

    Ok(TestResult {
        success: true,
        message: "连接成功！API 可用。".to_string(),
    })
}

// ========== 对话管理命令 ==========

fn read_conversations(path: &Path) -> Result<Vec<Conversation>, String> {
    if !path.exists() {
        return Ok(Vec::new());
    }
    let content = fs::read_to_string(path).map_err(|error| format!("无法读取会话文件：{error}"))?;
    serde_json::from_str(&content)
        .map_err(|error| format!("会话文件格式无效，未覆盖原文件：{error}"))
}

#[tauri::command]
fn list_conversations(state: State<AppState>) -> Result<Vec<Conversation>, String> {
    let mut sorted = read_conversations(&state.conversations_path)?;
    sorted.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    Ok(sorted)
}

#[tauri::command]
fn save_conversation(state: State<AppState>, conv: Conversation) -> Result<Conversation, String> {
    let mut convs = read_conversations(&state.conversations_path)?;

    if let Some(existing) = convs.iter_mut().find(|c| c.id == conv.id) {
        *existing = conv.clone();
    } else {
        convs.push(conv.clone());
    }

    let json = serde_json::to_string_pretty(&convs).map_err(|e| e.to_string())?;
    fs::write(&state.conversations_path, json).map_err(|e| e.to_string())?;
    Ok(conv)
}

#[tauri::command]
fn delete_conversation(state: State<AppState>, id: String) -> Result<bool, String> {
    let mut convs = read_conversations(&state.conversations_path)?;
    convs.retain(|c| c.id != id);
    let json = serde_json::to_string_pretty(&convs).map_err(|e| e.to_string())?;
    fs::write(&state.conversations_path, json).map_err(|e| e.to_string())?;
    Ok(true)
}

// ========== 非流式聊天（保留作为后备） ==========

#[tauri::command]
async fn chat_completion(
    state: State<'_, AppState>,
    messages: Vec<ChatMessage>,
    model: Option<String>,
) -> Result<String, String> {
    let config = state.config.lock().unwrap().clone();
    let base_url = config.base_url.trim_end_matches('/').to_string();
    let api_key = config.api_key.clone();
    let use_model = model.unwrap_or(config.default_model.clone());

    if api_key.is_empty() {
        return Err("API Key 未配置，请在设置中填写".to_string());
    }

    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/chat/completions", base_url))
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&serde_json::json!({
            "model": use_model,
            "messages": messages,
            "temperature": config.temperature,
            "max_tokens": config.max_tokens,
            "stream": false,
        }))
        .send()
        .await
        .map_err(|_| safe_provider_request_error())?;

    if !response.status().is_success() {
        let status = response.status();
        return Err(safe_provider_error(status));
    }

    let data: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("解析响应失败: {}", e))?;
    let content = data["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("")
        .to_string();
    Ok(content)
}

// ========== 流式聊天（核心） ==========

#[derive(Debug, Serialize, Clone)]
struct ChatChunkEvent {
    conversation_id: String,
    content: String,
    done: bool,
    error: Option<String>,
}

#[tauri::command]
async fn chat_completion_stream(
    app: AppHandle,
    state: State<'_, AppState>,
    conversation_id: String,
    messages: Vec<ChatMessage>,
    model: Option<String>,
) -> Result<String, String> {
    let config = state.config.lock().unwrap().clone();
    let base_url = config.base_url.trim_end_matches('/').to_string();
    let api_key = config.api_key.clone();
    let use_model = model.unwrap_or(config.default_model.clone());

    if api_key.is_empty() {
        let _ = app.emit(
            "chat_chunk",
            ChatChunkEvent {
                conversation_id: conversation_id.clone(),
                content: String::new(),
                done: true,
                error: Some("API Key 未配置，请在设置中填写".to_string()),
            },
        );
        return Err("API Key 未配置".to_string());
    }

    let client = reqwest::Client::new();

    let response = client
        .post(format!("{}/chat/completions", base_url))
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&serde_json::json!({
            "model": use_model,
            "messages": messages,
            "temperature": config.temperature,
            "max_tokens": config.max_tokens,
            "stream": true,
        }))
        .send()
        .await
        .map_err(|_| safe_provider_request_error())?;

    if !response.status().is_success() {
        let status = response.status();
        let err_msg = safe_provider_error(status);
        let _ = app.emit(
            "chat_chunk",
            ChatChunkEvent {
                conversation_id: conversation_id.clone(),
                content: String::new(),
                done: true,
                error: Some(err_msg.clone()),
            },
        );
        return Err(err_msg);
    }

    // 流式读取 SSE
    let mut stream = response.bytes_stream();
    // Bytes may split a multi-byte UTF-8 code point between network chunks. Keep
    // incomplete bytes in the buffer instead of using from_utf8_lossy, which
    // would permanently replace streamed Chinese text with replacement glyphs.
    let mut buffer: Vec<u8> = Vec::new();
    let mut full_content = String::new();

    while let Some(chunk_result) = stream.next().await {
        let chunk = match chunk_result {
            Ok(c) => c,
            Err(_) => {
                let err_msg = "流读取错误，请重试。".to_string();
                let _ = app.emit(
                    "chat_chunk",
                    ChatChunkEvent {
                        conversation_id: conversation_id.clone(),
                        content: String::new(),
                        done: true,
                        error: Some(err_msg),
                    },
                );
                return Err("流读取错误".to_string());
            }
        };

        buffer.extend_from_slice(&chunk);

        // 按行解析 SSE
        while let Some(newline_pos) = buffer.iter().position(|byte| *byte == b'\n') {
            let line_bytes: Vec<u8> = buffer.drain(..=newline_pos).collect();
            let line = match String::from_utf8(line_bytes[..line_bytes.len() - 1].to_vec()) {
                Ok(line) => line.trim().to_string(),
                Err(_) => {
                    let error = "流响应包含无效 UTF-8".to_string();
                    let _ = app.emit(
                        "chat_chunk",
                        ChatChunkEvent {
                            conversation_id: conversation_id.clone(),
                            content: String::new(),
                            done: true,
                            error: Some(error.clone()),
                        },
                    );
                    return Err(error);
                }
            };

            if line.is_empty() {
                continue;
            }

            if line.starts_with("data: ") {
                let data_str = &line[6..];
                if data_str == "[DONE]" {
                    let _ = app.emit(
                        "chat_chunk",
                        ChatChunkEvent {
                            conversation_id: conversation_id.clone(),
                            content: String::new(),
                            done: true,
                            error: None,
                        },
                    );
                    return Ok(full_content);
                }

                if let Ok(json) = serde_json::from_str::<serde_json::Value>(data_str) {
                    if let Some(delta) = json
                        .get("choices")
                        .and_then(|c| c.get(0))
                        .and_then(|c| c.get("delta"))
                    {
                        if let Some(content) = delta.get("content").and_then(|c| c.as_str()) {
                            if !content.is_empty() {
                                full_content.push_str(content);
                                let _ = app.emit(
                                    "chat_chunk",
                                    ChatChunkEvent {
                                        conversation_id: conversation_id.clone(),
                                        content: content.to_string(),
                                        done: false,
                                        error: None,
                                    },
                                );
                            }
                        }
                    }
                }
            }
        }
    }

    // 流结束，发送 done
    let _ = app.emit(
        "chat_chunk",
        ChatChunkEvent {
            conversation_id: conversation_id.clone(),
            content: String::new(),
            done: true,
            error: None,
        },
    );

    Ok(full_content)
}

// ========== ComfyUI 命令 ==========

#[tauri::command]
async fn comfyui_check_connection(state: State<'_, AppState>) -> Result<bool, String> {
    let config = state.config.lock().unwrap().clone();
    let url = format!("{}/system_stats", config.comfyui_url.trim_end_matches('/'));
    let client = reqwest::Client::new();
    match client
        .get(&url)
        .timeout(std::time::Duration::from_secs(3))
        .send()
        .await
    {
        Ok(resp) => Ok(resp.status().is_success()),
        Err(_) => Ok(false),
    }
}

#[tauri::command]
async fn comfyui_queue_prompt(
    state: State<'_, AppState>,
    workflow: serde_json::Value,
) -> Result<String, String> {
    let config = state.config.lock().unwrap().clone();
    let url = format!("{}/prompt", config.comfyui_url.trim_end_matches('/'));
    let client = reqwest::Client::new();
    let response = client
        .post(&url)
        .json(&serde_json::json!({ "prompt": workflow }))
        .send()
        .await
        .map_err(|e| format!("ComfyUI 请求失败: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("ComfyUI 错误: {}", response.status()));
    }

    let data: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("解析失败: {}", e))?;
    let prompt_id = data["prompt_id"].as_str().unwrap_or("").to_string();
    Ok(prompt_id)
}

#[tauri::command]
async fn comfyui_get_history(
    state: State<'_, AppState>,
    prompt_id: String,
) -> Result<serde_json::Value, String> {
    let config = state.config.lock().unwrap().clone();
    let url = format!(
        "{}/history/{}",
        config.comfyui_url.trim_end_matches('/'),
        prompt_id
    );
    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;
    let data: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("解析失败: {}", e))?;
    Ok(data)
}

#[cfg(test)]
mod conversation_tests {
    use super::*;

    #[test]
    fn malformed_conversations_are_rejected_without_fallback_to_empty() {
        let nonce = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("system clock")
            .as_nanos();
        let path = std::env::temp_dir().join(format!(
            "kk-studio-corrupt-conversations-{}-{nonce}.json",
            std::process::id()
        ));
        let raw = b"not-json";
        fs::write(&path, raw).expect("write fixture");
        let error = read_conversations(&path).expect_err("corrupt file must be rejected");
        assert!(error.contains("未覆盖原文件"));
        assert_eq!(fs::read(&path).expect("read fixture"), raw);
        let _ = fs::remove_file(path);
    }
}

#[tauri::command]
fn comfyui_scan_directory(root: String) -> Result<ComfyUIScanResult, String> {
    let trimmed = root.trim();
    if trimmed.is_empty() {
        return Err("请先选择 ComfyUI 文件夹".to_string());
    }
    scan_comfyui_path(Path::new(trimmed))
}

#[tauri::command(rename_all = "camelCase")]
async fn task_host_submit(
    state: State<'_, AppState>,
    request: task_host::TaskHostRequest,
) -> Result<task_host::JobRecord, String> {
    state.task_host.clone().submit(request).await
}

#[tauri::command(rename_all = "camelCase")]
fn task_host_read(
    state: State<AppState>,
    task_id: String,
) -> Result<Vec<task_host::JobRecord>, String> {
    state.task_host.read(&task_id)
}

#[tauri::command(rename_all = "camelCase")]
fn task_host_get(
    state: State<AppState>,
    task_id: String,
) -> Result<Option<task_host::JobRecord>, String> {
    state.task_host.get(&task_id)
}

#[tauri::command]
fn task_host_list(state: State<AppState>) -> Result<Vec<task_host::JobRecord>, String> {
    state.task_host.list()
}

#[tauri::command(rename_all = "camelCase")]
fn task_host_cancel(
    state: State<AppState>,
    task_id: String,
) -> Result<Option<task_host::JobRecord>, String> {
    state.task_host.cancel(&task_id)
}
// ========== 主函数 ==========

fn main() {
    let paths = storage_paths::AppPaths::initialize().expect("KK Studio 无法初始化用户数据目录");
    let config_path = paths.config;
    let conversations_path = paths.conversations;
    let task_host = Arc::new(
        task_host::TaskHost::new(
            paths.tasks.join("native-host"),
            Arc::new(asset_storage::AssetRepository::new(paths.assets.clone())),
        )
        .expect("KK Studio 无法初始化原生任务主机"),
    );

    let config = if config_path.exists() {
        fs::read_to_string(&config_path)
            .ok()
            .and_then(|s| serde_json::from_str::<AppConfig>(&s).ok())
            .map(|mut c| {
                c.api_key = String::new();
                c
            }) // RISK-005：不载入历史明文密钥
            .unwrap_or_default()
    } else {
        AppConfig::default()
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(agent_runtime::AgentRuntime::new(
            paths
                .tasks
                .parent()
                .expect("data root")
                .join("app")
                .join("agent"),
        ))
        .manage(AppState {
            config: Mutex::new(config),
            config_path,
            conversations_path,
            creation: Arc::new(creation_storage::SnapshotRepository::new(paths.creation)),
            assets: Arc::new(asset_storage::AssetRepository::new(paths.assets)),
            task_host,
            restored_roots: Mutex::new(std::collections::HashSet::new()),
        })
        .invoke_handler(tauri::generate_handler![
            agent_runtime::agent_runtime_start,
            agent_runtime::agent_runtime_status,
            agent_runtime::agent_runtime_stop,
            credential_set,
            credential_get,
            credential_delete,
            get_config,
            set_config,
            read_creation_snapshot,
            asset_store,
            asset_read,
            asset_list,
            get_storage_root,
            write_creation_snapshot,
            export_project_package,
            preflight_project_package,
            import_project_package,
            open_restored_project_package,
            test_connection,
            list_conversations,
            save_conversation,
            delete_conversation,
            chat_completion,
            chat_completion_stream,
            comfyui_check_connection,
            comfyui_queue_prompt,
            comfyui_get_history,
            comfyui_scan_directory,
            task_host_submit,
            task_host_read,
            task_host_get,
            task_host_list,
            task_host_cancel,
        ])
        .build(tauri::generate_context!())
        .expect("error while building kk Studio application")
        .run(|app, event| {
            if matches!(event, tauri::RunEvent::Exit) {
                app.state::<agent_runtime::AgentRuntime>().shutdown();
            }
        });
}

#[cfg(test)]
mod tests {
    use super::{test_connection, test_connection_with_client};
    use tokio::io::{AsyncReadExt, AsyncWriteExt};

    #[tokio::test]
    async fn provider_error_body_does_not_cross_connection_command() {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let server = tokio::spawn(async move {
            let (mut socket, _) = listener.accept().await.unwrap();
            let mut request = [0; 4096];
            socket.read(&mut request).await.unwrap();
            let body = r#"{"error":"private-prompt api-key-test-only signed-url-test-only"}"#;
            let response = format!(
                "HTTP/1.1 429 Too Many Requests\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                body.len(), body
            );
            socket.write_all(response.as_bytes()).await.unwrap();
        });
        let result = tokio::time::timeout(
            std::time::Duration::from_secs(5),
            test_connection_with_client(
                reqwest::Client::builder().no_proxy().build().unwrap(),
                format!("http://{address}"),
                "dummy-key".into(),
                None,
            ),
        )
        .await
        .unwrap()
        .unwrap();
        server.abort();
        let _ = server.await;
        assert!(!result.success);
        assert!(result.message.contains("429"));
        for sensitive in [
            "private-prompt",
            "api-key-test-only",
            "signed-url-test-only",
        ] {
            assert!(!result.message.contains(sensitive));
        }
    }

    #[tokio::test]
    async fn provider_invalid_url_does_not_echo_connection_details() {
        let result = test_connection(
            "unsupported-protocol://private-provider-token.invalid".into(),
            "dummy-key".into(),
            None,
        )
        .await
        .unwrap_err();
        assert!(!result.contains("private-provider-token"));
        assert!(!result.contains("unsupported-protocol"));
        assert!(!result.is_empty());
    }
}
