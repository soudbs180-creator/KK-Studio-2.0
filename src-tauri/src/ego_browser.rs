use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Stdio;
use tokio::process::Command;

const MAX_URL_LENGTH: usize = 4096;
const MAX_SPACE_NAME_LENGTH: usize = 80;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EgoBrowserOpenRequest {
    pub url: String,
    pub authorized: bool,
    pub space_name: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EgoBrowserStatus {
    pub available: bool,
    pub command: Option<String>,
    pub version: Option<String>,
    pub message: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EgoBrowserOpenResult {
    pub provider: &'static str,
    pub url: String,
    pub started: bool,
    pub pid: Option<u32>,
    pub space_name: String,
    pub message: String,
}

fn require_authorization(authorized: bool) -> Result<(), String> {
    authorized
        .then_some(())
        .ok_or_else(|| "打开 ego lite 前需要当前任务的明确授权。".to_string())
}

pub(crate) fn validate_open_url(value: &str) -> Result<String, String> {
    if value.len() > MAX_URL_LENGTH {
        return Err("浏览器地址过长，已拒绝打开。".into());
    }
    let url = reqwest::Url::parse(value).map_err(|_| "浏览器地址无效，已拒绝打开。".to_string())?;
    if url.scheme() != "https" || url.host_str().is_none() {
        return Err("ego lite 只允许打开带主机名的 HTTPS 地址。".into());
    }
    Ok(url.to_string())
}

pub(crate) fn validate_space_name(value: &str) -> Result<String, String> {
    let value = value.trim();
    if value.is_empty() || value.len() > MAX_SPACE_NAME_LENGTH {
        return Err("ego lite Space 名称为空或过长。".into());
    }
    if value.chars().any(|character| {
        character.is_control()
            || matches!(
                character,
                '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|'
            )
    }) {
        return Err("ego lite Space 名称包含不安全字符。".into());
    }
    Ok(value.to_string())
}

pub(crate) fn build_launch_script(url: &str, space_name: &str) -> Result<String, String> {
    let url = validate_open_url(url)?;
    let space_name = validate_space_name(space_name)?;
    let url = serde_json::to_string(&url).map_err(|_| "无法编码浏览器地址。".to_string())?;
    let space_name =
        serde_json::to_string(&space_name).map_err(|_| "无法编码 Space 名称。".to_string())?;
    Ok(format!(
        "const task = await taskSpace({space_name}); const page = task.page('p1'); await page.goto({url}); console.log(JSON.stringify({{taskSpaceId: task.spaceId, url: await page.url()}})); await task.finish({{keep: ['p1']}});"
    ))
}

fn command_candidates() -> Vec<PathBuf> {
    let mut candidates = vec![PathBuf::from("ego-browser")];
    if let Some(home) = dirs::home_dir() {
        candidates.push(
            home.join(".local")
                .join("share")
                .join("ego")
                .join("active_version_dir")
                .join(if cfg!(windows) {
                    "ego-browser.exe"
                } else {
                    "ego-browser"
                }),
        );
    }
    candidates
}

fn resolve_command() -> Option<PathBuf> {
    command_candidates().into_iter().find(|candidate| {
        std::process::Command::new(candidate)
            .arg("nodejs")
            .arg("-e")
            .arg("console.log('ego-browser ready')")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .is_ok_and(|status| status.success())
    })
}

#[tauri::command(rename_all = "camelCase")]
pub async fn ego_browser_status() -> Result<EgoBrowserStatus, String> {
    let command = tokio::task::spawn_blocking(resolve_command)
        .await
        .map_err(|_| "ego lite 状态检测任务中断。".to_string())?;
    Ok(match command {
        Some(command) => EgoBrowserStatus {
            available: true,
            command: Some(command.to_string_lossy().to_string()),
            version: None,
            message: "ego lite 已安装并可启动；登录、验证码和安全警告仍由用户接管。".into(),
        },
        None => EgoBrowserStatus {
            available: false,
            command: None,
            version: None,
            message: "未找到 ego-browser 命令，请先安装并完成 ego lite 初始化。".into(),
        },
    })
}

#[tauri::command(rename_all = "camelCase")]
pub async fn ego_browser_open(
    request: EgoBrowserOpenRequest,
) -> Result<EgoBrowserOpenResult, String> {
    require_authorization(request.authorized)?;
    let url = validate_open_url(&request.url)?;
    let space_name = validate_space_name(
        request
            .space_name
            .as_deref()
            .unwrap_or("KK Studio browser task"),
    )?;
    let command = resolve_command().ok_or("未找到可用的 ego-browser 命令。")?;
    let script = build_launch_script(&url, &space_name)?;
    let mut child = Command::new(command);
    child
        .arg("nodejs")
        .arg("-e")
        .arg(script)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .kill_on_drop(false);
    #[cfg(windows)]
    child.creation_flags(0x08000000);
    let child = child
        .spawn()
        .map_err(|_| "无法启动 ego lite；原任务授权仍保留。".to_string())?;
    Ok(EgoBrowserOpenResult {
        provider: "ego-lite",
        url,
        started: true,
        pid: child.id(),
        space_name,
        message: "ego lite Agent Space 已启动；登录、验证、验证码和安全警告需用户接管。".into(),
    })
}

#[cfg(test)]
mod tests {
    use super::{
        build_launch_script, require_authorization, validate_open_url, validate_space_name,
    };

    #[test]
    fn rejects_ego_launch_without_explicit_authorization() {
        assert!(require_authorization(false).is_err());
        assert!(require_authorization(true).is_ok());
    }

    #[test]
    fn rejects_non_https_urls_before_launch() {
        assert!(validate_open_url("http://example.com").is_err());
        assert!(validate_open_url("javascript:alert(1)").is_err());
        assert!(validate_open_url("https://example.com").is_ok());
    }

    #[test]
    fn rejects_untrusted_space_names() {
        assert!(validate_space_name("safe task").is_ok());
        assert!(validate_space_name("bad\nname").is_err());
        assert!(validate_space_name(" ").is_err());
    }

    #[test]
    fn launch_script_is_fixed_and_contains_no_user_command() {
        let script = build_launch_script("https://example.com", "safe task").unwrap();
        assert!(script.contains("taskSpace"));
        assert!(script.contains("page.goto"));
        assert!(!script.contains("child_process"));
        assert!(!script.contains("eval("));
    }
}
