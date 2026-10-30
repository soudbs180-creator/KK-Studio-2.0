use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Stdio;
use tokio::process::Command;

const MAX_URL_LENGTH: usize = 4096;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExternalBrowserOpenRequest {
    pub provider: String,
    pub url: String,
    pub authorized: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExternalBrowserInspection {
    pub provider: String,
    pub available: bool,
    pub executable: Option<String>,
    pub message: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExternalBrowserOpenResult {
    pub provider: String,
    pub url: String,
    pub started: bool,
    pub pid: Option<u32>,
    pub message: String,
}

fn require_authorization(authorized: bool) -> Result<(), String> {
    authorized
        .then_some(())
        .ok_or_else(|| "打开外部浏览器前需要当前任务的明确授权。".to_string())
}

fn browser_executable_names(provider: &str) -> &'static [&'static str] {
    match provider {
        "edge" => &["msedge.exe", "microsoft-edge", "Microsoft Edge"],
        "chrome" => &[
            "chrome.exe",
            "google-chrome",
            "google-chrome-stable",
            "Google Chrome",
        ],
        _ => &[],
    }
}

fn validate_external_open(provider: &str, value: &str) -> Result<String, String> {
    if browser_executable_names(provider).is_empty() {
        return Err("只允许选择 Edge 或 Chrome 外部浏览器。".into());
    }
    if value.len() > MAX_URL_LENGTH {
        return Err("浏览器地址过长，已拒绝打开。".into());
    }
    let url = reqwest::Url::parse(value).map_err(|_| "浏览器地址无效，已拒绝打开。".to_string())?;
    if url.scheme() != "https" || url.host_str().is_none() {
        return Err("外部浏览器只允许打开带主机名的 HTTPS 地址。".into());
    }
    Ok(url.to_string())
}

fn command_candidates(provider: &str) -> Vec<PathBuf> {
    let names = browser_executable_names(provider);
    let mut candidates = names.iter().map(PathBuf::from).collect::<Vec<_>>();
    if cfg!(windows) {
        for variable in ["ProgramFiles", "ProgramFiles(x86)", "LOCALAPPDATA"] {
            if let Some(root) = std::env::var_os(variable) {
                let root = PathBuf::from(root);
                match provider {
                    "edge" => candidates.push(
                        root.join("Microsoft")
                            .join("Edge")
                            .join("Application")
                            .join("msedge.exe"),
                    ),
                    "chrome" => candidates.push(
                        root.join("Google")
                            .join("Chrome")
                            .join("Application")
                            .join("chrome.exe"),
                    ),
                    _ => {}
                }
            }
        }
    }
    candidates
}

fn resolve_executable(provider: &str) -> Option<PathBuf> {
    command_candidates(provider).into_iter().find(|candidate| {
        if candidate.is_file() {
            return true;
        }
        std::process::Command::new(candidate)
            .arg("--version")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .is_ok_and(|status| status.success())
    })
}

#[tauri::command(rename_all = "camelCase")]
pub async fn browser_external_status(
    provider: String,
) -> Result<ExternalBrowserInspection, String> {
    if browser_executable_names(&provider).is_empty() {
        return Err("只允许检测 Edge 或 Chrome 外部浏览器。".into());
    }
    let provider_for_task = provider.clone();
    let executable = tokio::task::spawn_blocking(move || resolve_executable(&provider_for_task))
        .await
        .map_err(|_| "外部浏览器状态检测任务中断。".to_string())?;
    Ok(ExternalBrowserInspection {
        provider,
        available: executable.is_some(),
        executable: executable
            .as_ref()
            .map(|path| path.to_string_lossy().to_string()),
        message: if executable.is_some() {
            "外部浏览器已发现；当前为手动浏览，自动化需要额外桥接。".into()
        } else {
            "未找到所选外部浏览器。".into()
        },
    })
}

#[tauri::command(rename_all = "camelCase")]
pub async fn browser_external_open(
    request: ExternalBrowserOpenRequest,
) -> Result<ExternalBrowserOpenResult, String> {
    require_authorization(request.authorized)?;
    let url = validate_external_open(&request.provider, &request.url)?;
    let executable = tokio::task::spawn_blocking({
        let provider = request.provider.clone();
        move || resolve_executable(&provider)
    })
    .await
    .map_err(|_| "外部浏览器检测任务中断。".to_string())?
    .ok_or("未找到所选外部浏览器。")?;
    let mut child = Command::new(executable);
    child
        .arg("--new-window")
        .arg(&url)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .kill_on_drop(false);
    #[cfg(windows)]
    child.creation_flags(0x08000000);
    let child = child
        .spawn()
        .map_err(|_| "无法启动所选外部浏览器；原任务授权仍保留。".to_string())?;
    Ok(ExternalBrowserOpenResult {
        provider: request.provider,
        url,
        started: true,
        pid: child.id(),
        message: "外部浏览器已启动；当前为手动浏览，登录、验证和安全警告需用户接管。".into(),
    })
}

#[cfg(test)]
mod tests {
    use super::{browser_executable_names, require_authorization, validate_external_open};

    #[test]
    fn rejects_external_launch_without_explicit_authorization() {
        assert!(require_authorization(false).is_err());
        assert!(require_authorization(true).is_ok());
    }

    #[test]
    fn external_open_accepts_only_known_browser_and_https() {
        assert!(validate_external_open("edge", "https://example.com").is_ok());
        assert!(validate_external_open("chrome", "https://example.com").is_ok());
        assert!(validate_external_open("firefox", "https://example.com").is_err());
        assert!(validate_external_open("edge", "http://example.com").is_err());
    }

    #[test]
    fn executable_names_are_fixed_per_provider() {
        assert!(browser_executable_names("edge").contains(&"msedge.exe"));
        assert!(browser_executable_names("chrome").contains(&"chrome.exe"));
        assert!(browser_executable_names("firefox").is_empty());
    }
}
