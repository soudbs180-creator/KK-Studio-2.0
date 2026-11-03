use base64::Engine;
use serde::Deserialize;
const BASE: &str = "http://127.0.0.1:8188";
pub fn loopback_endpoint(endpoint: Option<&str>) -> Result<String, String> {
    let mut url =
        reqwest::Url::parse(endpoint.unwrap_or(BASE)).map_err(|_| "本机 ComfyUI 地址无效")?;
    if url.scheme() != "http"
        || !matches!(url.host_str(), Some("127.0.0.1" | "localhost" | "[::1]"))
        || !url.username().is_empty()
        || url.password().is_some()
        || url.path() != "/"
        || url.query().is_some()
        || url.fragment().is_some()
    {
        return Err("ComfyUI 仅允许无凭据的 HTTP loopback 地址".into());
    }
    if url.host_str() == Some("localhost") {
        url.set_host(Some("127.0.0.1"))
            .map_err(|_| "本机地址无效")?;
    }
    Ok(url.as_str().trim_end_matches('/').to_owned())
}

pub(crate) async fn bounded(
    mut response: reqwest::Response,
    limit: usize,
) -> Result<Vec<u8>, String> {
    if !response.status().is_success() {
        return Err(format!(
            "ComfyUI 请求失败（HTTP {}）",
            response.status().as_u16()
        ));
    }
    let mut bytes = Vec::new();
    while let Some(chunk) = response.chunk().await.map_err(|_| "ComfyUI 响应中断")? {
        if bytes.len() + chunk.len() > limit {
            return Err("ComfyUI 响应超过大小上限".into());
        }
        bytes.extend_from_slice(&chunk);
    }
    Ok(bytes)
}
pub(crate) fn client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .no_proxy()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|_| "无法创建本地连接".into())
}
fn valid_path(path: &str) -> bool {
    if path.strip_prefix("/object_info/").is_some_and(|id| {
        !id.is_empty()
            && id.len() <= 160
            && id.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'_')
    }) {
        return true;
    }
    matches!(
        path,
        "/system_stats" | "/history?max_items=100" | "/prompt" | "/object_info"
    ) || path
        .strip_prefix("/history?max_items=100&offset=")
        .is_some_and(|offset| {
            !offset.is_empty()
                && offset.len() <= 7
                && offset.bytes().all(|b| b.is_ascii_digit())
                && offset.parse::<u32>().is_ok_and(|value| value <= 1_000_000)
        })
        || path.strip_prefix("/history/").is_some_and(|id| {
            !id.is_empty()
                && id.len() <= 160
                && id
                    .bytes()
                    .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
        })
}
pub async fn json_request(
    path: &str,
    body: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    json_request_at(None, path, body).await
}
pub async fn json_request_at(
    endpoint: Option<&str>,
    path: &str,
    body: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let base = loopback_endpoint(endpoint)?;
    if !valid_path(path) || (path == "/prompt") != body.is_some() {
        return Err("不支持的 ComfyUI 请求".into());
    }
    let request = if let Some(value) = body {
        let encoded = serde_json::to_vec(&value).map_err(|_| "工作流无效")?;
        if encoded.len() > 256 * 1024 {
            return Err("工作流超过256KiB".into());
        }
        client()?
            .post(format!("{base}{path}"))
            .header("Content-Type", "application/json")
            .body(encoded)
    } else {
        client()?.get(format!("{base}{path}"))
    };
    let response = request.send().await.map_err(|_| "无法连接本机 ComfyUI")?;
    serde_json::from_slice(&bounded(response, 4 * 1024 * 1024).await?)
        .map_err(|_| "ComfyUI 返回无效JSON".into())
}
#[tauri::command]
pub async fn comfyui_http_json(
    path: String,
    body: Option<serde_json::Value>,
    endpoint: Option<String>,
) -> Result<serde_json::Value, String> {
    json_request_at(endpoint.as_deref(), &path, body).await
}

#[derive(Clone, Deserialize)]
pub struct OutputFile {
    filename: String,
    #[serde(default)]
    subfolder: String,
    #[serde(rename = "type")]
    file_type: String,
}
fn valid_file(file: &OutputFile) -> bool {
    file.file_type == "output"
        && !file.filename.is_empty()
        && file.filename.len() <= 255
        && !file.filename.contains(['/', '\\', ':'])
        && [file.filename.as_str(), file.subfolder.as_str()]
            .iter()
            .all(|s| {
                s.len() <= 1024
                    && !s.starts_with('/')
                    && !s.contains(['\\', ':'])
                    && !s.chars().any(char::is_control)
                    && s.split('/').all(|part| part != ".." && part != ".")
            })
}
#[tauri::command]
pub async fn comfyui_read_output(
    file: OutputFile,
    endpoint: Option<String>,
) -> Result<String, String> {
    let (bytes, mime) = read_image(file, endpoint.as_deref()).await?;
    Ok(format!(
        "data:{mime};base64,{}",
        base64::engine::general_purpose::STANDARD.encode(bytes)
    ))
}
pub(crate) async fn read_image(
    file: OutputFile,
    endpoint: Option<&str>,
) -> Result<(Vec<u8>, String), String> {
    let base = loopback_endpoint(endpoint)?;
    if !valid_file(&file) {
        return Err("无效的 ComfyUI 产物路径".into());
    }
    let response = client()?
        .get(format!("{base}/view"))
        .query(&[
            ("filename", file.filename),
            ("subfolder", file.subfolder),
            ("type", file.file_type),
        ])
        .send()
        .await
        .map_err(|_| "无法读取本机产物")?;
    let mime = response
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .split(';')
        .next()
        .unwrap_or("")
        .to_owned();
    if !matches!(mime.as_str(), "image/png" | "image/jpeg" | "image/webp") {
        return Err("产物不是支持的图片".into());
    }
    let bytes = bounded(response, 32 * 1024 * 1024).await?;
    Ok((bytes, mime))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn endpoint_is_loopback_origin_without_credentials_or_routes() {
        assert_eq!(
            loopback_endpoint(Some("http://localhost:18188/")).unwrap(),
            "http://127.0.0.1:18188"
        );
        assert!(loopback_endpoint(Some("http://[::1]:8188")).is_ok());
        for value in [
            "https://127.0.0.1",
            "http://remote.test",
            "http://u:p@127.0.0.1",
            "http://127.0.0.1/a",
            "http://127.0.0.1?key=1",
            "http://127.0.0.1#x",
        ] {
            assert!(loopback_endpoint(Some(value)).is_err());
        }
    }
    #[test]
    fn fixed_loopback_transport_rejects_other_endpoints_and_traversal() {
        for path in [
            "http://remote.invalid",
            "/interrupt",
            "/history/../config",
            "/view?filename=secret",
            "/history?max_items=100&offset=-1",
            "/history?max_items=100&offset=1000001",
            "/history?max_items=100&offset=0&extra=1",
            "/history?max_items=100&offset=",
        ] {
            assert!(!valid_path(path));
        }
        assert!(valid_path("/history/prompt-1"));
        assert!(valid_path("/history?max_items=100&offset=0"));
        assert!(valid_path("/history?max_items=100&offset=1000000"));
        let mut file = OutputFile {
            filename: "result.png".into(),
            subfolder: "job".into(),
            file_type: "output".into(),
        };
        assert!(valid_file(&file));
        file.subfolder = "../input".into();
        assert!(!valid_file(&file));
    }
}
