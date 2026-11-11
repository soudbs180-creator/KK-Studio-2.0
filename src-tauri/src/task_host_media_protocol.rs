//! TwelveAI task payloads and bounded media response validation.
use super::*;

pub(super) fn credential_echo(value: &str, secret: &str) -> bool {
    !secret.is_empty()
        && (value.contains(secret)
            || reqwest::Url::parse(value).is_ok_and(|url| {
                url.query_pairs()
                    .any(|(key, value)| key.contains(secret) || value.contains(secret))
            }))
}

pub(super) fn check_receipt_credentials(value: &Value, secret: &str) -> Result<(), RunError> {
    let unsafe_value = value["id"]
        .as_str()
        .is_some_and(|id| credential_echo(id, secret))
        || value["outputs"].as_array().is_some_and(|outputs| {
            outputs
                .iter()
                .any(|url| url.as_str().is_some_and(|url| credential_echo(url, secret)))
        });
    if unsafe_value {
        return Err(RunError::unknown(
            "provider_unavailable",
            "供应商回执包含不安全字段，已停止保存与下载，请核对原任务",
            vec![],
        ));
    }
    Ok(())
}

pub(super) fn safe_speech_request_id(value: &str, secret: &str) -> Option<String> {
    (valid_job_id(value) && !credential_echo(value, secret)).then(|| value.to_owned())
}

pub(super) fn valid_job_id(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 240
        && value
            .bytes()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, b'_' | b'-'))
}
pub(super) fn stopped() -> RunError {
    RunError::unknown(
        "cancelled",
        "已停止等待，供应商不支持远端取消，请先核对供应商",
        vec![],
    )
}

pub(super) fn video_body(
    request: &TaskHostRequest,
    assets: &AssetRepository,
) -> Result<Value, RunError> {
    validate(request).map_err(|_| RunError::failed("invalid_request", "视频参数或参考不受支持"))?;
    let Some(MediaInput::Video {
        duration,
        aspect_ratio,
        resolution,
        audio,
    }) = &request.media
    else {
        return Err(RunError::failed("invalid_request", "视频参数缺失"));
    };
    let mut input = json!({"prompt":request.prompt,"n":1,"duration":duration,"aspect_ratio":aspect_ratio,"resolution":resolution});
    if let Some(audio) = audio {
        input["audio"] = json!(audio);
    }
    let mut references = Vec::new();
    for attachment in &request.attachments {
        let asset = assets
            .read(&attachment.asset_id)
            .map_err(|_| RunError::failed("invalid_request", "视频参考原件不可用"))?
            .ok_or_else(|| RunError::failed("invalid_request", "视频参考原件缺失"))?;
        let mime = asset.metadata["mime"].as_str().unwrap_or_default();
        if !matches!(mime, "image/png" | "image/jpeg" | "image/webp")
            || attachment
                .mime
                .as_ref()
                .is_some_and(|declared| declared != mime)
            || asset.data_base64.is_empty()
            || asset.data_base64.len() + mime.len() + 13 > 14_000_000
        {
            return Err(RunError::failed(
                "invalid_request",
                "视频仅支持归档图片参考，类型必须匹配",
            ));
        }
        let data = format!("data:{mime};base64,{}", asset.data_base64);
        match attachment.reference_frame.as_deref() {
            Some("first") => input["start_frames"] = json!([data]),
            Some("last") => input["end_frames"] = json!([data]),
            _ => references.push(data),
        }
    }
    if !references.is_empty() {
        input["image_references"] = json!(references);
    }
    let body = json!({"model":request.model,"input":input});
    if serde_json::to_vec(&body)
        .map_err(|_| RunError::failed("invalid_request", "视频请求编码失败"))?
        .len()
        > 32 * 1024 * 1024
    {
        return Err(RunError::failed(
            "invalid_request",
            "视频参考超过请求大小限制",
        ));
    }
    Ok(body)
}
pub(super) fn result_url(value: &str) -> Result<reqwest::Url, RunError> {
    let invalid = || RunError::unknown("provider_unavailable", "视频结果地址不安全", vec![]);
    let url = reqwest::Url::parse(value).map_err(|_| invalid())?;
    let host = url.host_str().ok_or_else(invalid)?;
    if value.len() > 8192
        || url.scheme() != "https"
        || url.port().is_some()
        || !url.username().is_empty()
        || url.password().is_some()
        || url.fragment().is_some()
        || !host.contains('.')
        || host.parse::<IpAddr>().is_ok()
        || [
            ".localhost",
            ".local",
            ".internal",
            ".invalid",
            ".test",
            ".example",
        ]
        .iter()
        .any(|suffix| host.ends_with(suffix))
    {
        return Err(invalid());
    }
    Ok(url)
}
pub(super) fn parse_task(
    value: &Value,
    expected: Option<&str>,
) -> Result<(String, String, Vec<String>), RunError> {
    let invalid = || {
        RunError::unknown(
            "provider_unavailable",
            "视频回执格式无法确认，请先核对供应商",
            vec![],
        )
    };
    let id = value["id"]
        .as_str()
        .filter(|s| valid_job_id(s))
        .ok_or_else(invalid)?;
    if expected.is_some_and(|expected| expected != id) {
        return Err(invalid());
    }
    let status = value["status"]
        .as_str()
        .filter(|s| {
            matches!(
                *s,
                "queued"
                    | "processing"
                    | "in_progress"
                    | "completed"
                    | "partial_completed"
                    | "failed"
            )
        })
        .ok_or_else(invalid)?;
    let outputs = match value.get("outputs") {
        None => Vec::new(),
        Some(Value::Array(items)) if items.len() <= 100 => items
            .iter()
            .map(|item| {
                let url = item.as_str().ok_or_else(invalid)?;
                result_url(url)?;
                Ok(url.to_owned())
            })
            .collect::<Result<Vec<_>, RunError>>()?,
        _ => return Err(invalid()),
    };
    if matches!(status, "completed" | "partial_completed") == outputs.is_empty() {
        return Err(invalid());
    }
    Ok((id.into(), status.into(), outputs))
}
pub(super) async fn read_bounded(
    response: reqwest::Response,
    limit: usize,
    control: &JobControl,
) -> Result<Vec<u8>, RunError> {
    if response.content_length().is_some_and(|n| n > limit as u64) {
        return Err(RunError::unknown(
            "provider_unavailable",
            "供应商响应超过大小限制",
            vec![],
        ));
    }
    let mut bytes = Vec::new();
    let mut stream = response.bytes_stream();
    while let Some(chunk) = tokio::select! {biased; _=text::cancelled(control)=>return Err(stopped()),chunk=stream.next()=>chunk}
    {
        let chunk =
            chunk.map_err(|_| RunError::unknown("network", "供应商响应读取中断", vec![]))?;
        append_bounded_chunk(&mut bytes, &chunk, limit)
            .map_err(|m| RunError::unknown("provider_unavailable", m, vec![]))?;
    }
    if bytes.is_empty() {
        return Err(RunError::unknown(
            "provider_unavailable",
            "供应商返回空结果",
            vec![],
        ));
    }
    Ok(bytes)
}
pub(super) async fn task_response(
    response: reqwest::Response,
    submitting: bool,
    control: &JobControl,
) -> Result<Value, RunError> {
    let status = response.status();
    if !status.is_success() {
        let mut error = RunError::unknown(
            class_for_status(status),
            "视频服务响应失败，受理状态需要核对",
            vec![],
        );
        error.failure.status = status.as_u16();
        error.request_started =
            !(submitting && status.is_client_error() && status != StatusCode::REQUEST_TIMEOUT);
        return Err(error);
    }
    let raw = read_bounded(response, 1024 * 1024, control).await?;
    serde_json::from_slice(&raw)
        .map_err(|_| RunError::unknown("provider_unavailable", "视频回执格式无法确认", vec![]))
}
pub(super) async fn read_media_response(
    response: reqwest::Response,
    kind: &str,
    format: Option<&str>,
    control: &JobControl,
) -> Result<(Vec<u8>, &'static str), RunError> {
    let invalid = || RunError::unknown("provider_unavailable", "供应商媒体类型或原件无效", vec![]);
    if !response.status().is_success() {
        return Err(invalid());
    }
    let declared = response
        .headers()
        .get(header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.split(';').next())
        .unwrap_or_default()
        .trim()
        .to_ascii_lowercase();
    let mime = match (kind, declared.as_str(), format) {
        ("video", "video/mp4", _) => "video/mp4",
        ("video", "video/webm", _) => "video/webm",
        ("audio", "audio/mpeg", Some("mp3")) => "audio/mpeg",
        ("audio", "audio/wav" | "audio/x-wav" | "audio/wave", Some("wav")) => "audio/wav",
        _ => return Err(invalid()),
    };
    let bytes = read_bounded(response, MAX_RESPONSE_BYTES, control).await?;
    let valid = match mime {
        "video/mp4" => bytes.len() >= 12 && &bytes[4..8] == b"ftyp",
        "video/webm" => bytes.starts_with(b"\x1a\x45\xdf\xa3"),
        "audio/wav" => bytes.len() >= 12 && bytes.starts_with(b"RIFF") && &bytes[8..12] == b"WAVE",
        "audio/mpeg" => {
            bytes.starts_with(b"ID3")
                || (bytes.len() >= 2 && bytes[0] == 0xff && bytes[1] & 0xe0 == 0xe0)
        }
        _ => false,
    };
    if !valid {
        return Err(invalid());
    }
    Ok((bytes, mime))
}

pub(super) async fn download_video(
    client: &Client,
    url: reqwest::Url,
    control: &JobControl,
) -> Result<(Vec<u8>, &'static str), RunError> {
    // A fresh pinned result client carries no provider credentials, including on a CDN.
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|_| RunError::unknown("network", "视频结果下载中断", vec![]))?;
    read_media_response(response, "video", None, control).await
}
