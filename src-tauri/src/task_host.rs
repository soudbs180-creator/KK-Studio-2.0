use crate::asset_storage::AssetRepository;
use base64::{engine::general_purpose::STANDARD, Engine};
use futures_util::StreamExt;
use reqwest::{header, Client, StatusCode};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs;
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr, SocketAddr};
use std::path::{Path, PathBuf};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::sync::Notify;

#[path = "asset_io.rs"]
mod io;
#[path = "task_host_text.rs"]
mod text;

const MAX_ID: usize = 160;
const MAX_PROMPT: usize = 32_000;
const MAX_MODEL: usize = 120;
const MAX_BASE_URL: usize = 2_048;
const MAX_ATTACHMENT_NAME: usize = 200;
const MAX_RESPONSE_BYTES: usize = 100 * 1024 * 1024;
const MAX_OUTPUTS: usize = 10;
const PROVIDER_CONNECT_TIMEOUT: Duration = Duration::from_secs(10);
const PROVIDER_REQUEST_TIMEOUT: Duration = Duration::from_secs(120);

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskHostAttachment {
    pub asset_id: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskHostRequest {
    pub task_id: String,
    pub idempotency_key: String,
    pub base_url: String,
    pub credential_ref: String,
    pub model: String,
    pub prompt: String,
    pub output_indices: Vec<u32>,
    #[serde(default)]
    pub attachments: Vec<TaskHostAttachment>,
    #[serde(default)]
    pub provider_name: Option<String>,
    #[serde(default)]
    pub prompt_hash: Option<String>,
    /// Resolved provider size label such as "1024x1024"; None omits `size`.
    #[serde(default)]
    pub size: Option<String>,
    /// Historical requests omitted kind and remain image requests.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub kind: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub concurrency_limit: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskHostFailure {
    pub failure_class: String,
    pub status: u16,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub retry_after_seconds: Option<u64>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JobRecord {
    pub task_id: String,
    pub idempotency_key: String,
    pub output_indices: Vec<u32>,
    pub status: String,
    pub asset_ids: Vec<String>,
    #[serde(default)]
    pub outputs: Vec<JobOutput>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub failure: Option<TaskHostFailure>,
    pub updated_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JobOutput {
    pub index: u32,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub asset_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct JournalRecord {
    #[serde(flatten)]
    record: JobRecord,
    fingerprint: String,
}

#[derive(Clone)]
struct JobControl {
    cancelled: Arc<AtomicBool>,
    wake: Arc<Notify>,
    credential_ref: String,
}

pub struct TaskHost {
    root: PathBuf,
    assets: Arc<AssetRepository>,
    jobs: Mutex<HashMap<String, JobControl>>,
}

impl TaskHost {
    pub fn new(root: PathBuf, assets: Arc<AssetRepository>) -> Result<Self, String> {
        io::directory(&root)?;
        let host = Self {
            root,
            assets,
            jobs: Mutex::new(HashMap::new()),
        };
        host.recover_submitted()?;
        Ok(host)
    }

    fn lock(&self) -> Result<fs::File, String> {
        io::lock(&self.root)
    }
    fn path(&self, task_id: &str) -> PathBuf {
        self.root.join(format!("{task_id}.json"))
    }
    fn read_one(&self, task_id: &str) -> Result<Option<JournalRecord>, String> {
        let Some(raw) = io::read(&self.path(task_id), 256 * 1024)? else {
            return Ok(None);
        };
        let record: JournalRecord = serde_json::from_slice(&raw)
            .map_err(|_| "corrupt: 原生任务记录损坏，已保留原文件".to_string())?;
        validate_record(&record.record)?;
        if record.fingerprint.len() != 64
            || !record.fingerprint.bytes().all(|c| c.is_ascii_hexdigit())
        {
            return Err("corrupt: 原生任务记录指纹无效，已保留原文件".into());
        }
        Ok(Some(record))
    }
    fn write_one_unlocked(&self, record: &JournalRecord) -> Result<(), String> {
        validate_record(&record.record)?;
        let raw = serde_json::to_vec(record).map_err(|_| "io: 原生任务记录编码失败".to_string())?;
        if raw.len() > 256 * 1024 {
            return Err("invalid: 原生任务记录过大".into());
        }
        replace_record(&self.path(&record.record.task_id), &raw)
    }
    fn write_one(&self, record: &JournalRecord) -> Result<(), String> {
        let _lock = self.lock()?;
        self.write_one_unlocked(record)
    }
    fn persist_output(
        &self,
        task_id: &str,
        fingerprint: &str,
        output_index: u32,
        asset_id: &str,
    ) -> Result<(), String> {
        let _lock = self.lock()?;
        let mut journal = self
            .read_one(task_id)?
            .ok_or_else(|| "io: 原生任务记录在结果归档时丢失".to_string())?;
        if journal.fingerprint != fingerprint {
            return Err("conflict: 原生任务身份在结果归档时发生变化".into());
        }
        let output = journal
            .record
            .outputs
            .iter_mut()
            .find(|output| output.index == output_index)
            .ok_or_else(|| "corrupt: 原生任务结果序号不存在".to_string())?;
        output.status = "succeeded".into();
        output.asset_id = Some(asset_id.to_string());
        output.error = None;
        if !journal.record.asset_ids.iter().any(|id| id == asset_id) {
            journal.record.asset_ids.push(asset_id.to_string());
        }
        journal.record.updated_at = now_ms();
        self.write_one_unlocked(&journal)
    }
    fn recover_submitted(&self) -> Result<(), String> {
        let _lock = self.lock()?;
        let entries = fs::read_dir(&self.root).map_err(io::error)?;
        for item in entries {
            let item = item.map_err(io::error)?;
            let path = item.path();
            if path.extension().and_then(|v| v.to_str()) != Some("json") {
                continue;
            }
            let Some(raw) = io::read(&path, 256 * 1024)? else {
                continue;
            };
            let mut journal: JournalRecord = serde_json::from_slice(&raw)
                .map_err(|error| format!("corrupt: 原生任务记录损坏，已保留原文件：{error}"))?;
            validate_record(&journal.record)?;
            if journal.record.status == "submitted" {
                journal.record.status = "unknown".into();
                journal.record.failure = Some(failure(
                    "network",
                    0,
                    None,
                    "应用关闭时供应商受理状态不明，请先核对供应商",
                ));
                journal.record.updated_at = now_ms();
                replace_record(
                    &path,
                    &serde_json::to_vec(&journal)
                        .map_err(|_| "io: 原生任务记录编码失败".to_string())?,
                )?;
            }
        }
        Ok(())
    }

    pub async fn submit(self: Arc<Self>, request: TaskHostRequest) -> Result<JobRecord, String> {
        validate_request(&request)?;
        let fingerprint = fingerprint(&request)?;
        let _journal_lock = self.lock()?;
        if let Some(existing) = self.read_one(&request.task_id)? {
            if existing.record.idempotency_key != request.idempotency_key
                || existing.fingerprint != fingerprint
            {
                return Err("conflict: 原生任务身份已存在但请求不匹配".into());
            }
            return Ok(existing.record);
        }
        // The native request survives a WebView reload, so its capacity must
        // live with this jobs map, not with browser-lock metadata.
        if request.kind.as_deref() == Some("text") {
            let jobs = self
                .jobs
                .lock()
                .map_err(|_| "io: 原生任务状态锁不可用".to_string())?;
            if jobs
                .values()
                .filter(|job| job.credential_ref == request.credential_ref)
                .count()
                >= request.concurrency_limit.unwrap_or(1)
            {
                return Err("capacity: 原生连接并发已满，请等待当前任务结束".into());
            }
        }
        let record = JobRecord {
            task_id: request.task_id.clone(),
            idempotency_key: request.idempotency_key.clone(),
            output_indices: request.output_indices.clone(),
            status: "submitted".into(),
            asset_ids: vec![],
            outputs: request
                .output_indices
                .iter()
                .map(|index| JobOutput {
                    index: *index,
                    status: "submitted".into(),
                    asset_id: None,
                    text: None,
                    error: None,
                })
                .collect(),
            failure: None,
            updated_at: now_ms(),
        };
        let journal = JournalRecord {
            record: record.clone(),
            fingerprint,
        };
        self.write_one_unlocked(&journal)?;
        let control = JobControl {
            cancelled: Arc::new(AtomicBool::new(false)),
            wake: Arc::new(Notify::new()),
            credential_ref: request.credential_ref.clone(),
        };
        self.jobs
            .lock()
            .map_err(|_| "io: 原生任务状态锁不可用".to_string())?
            .insert(request.task_id.clone(), control.clone());
        let host = Arc::clone(&self);
        tauri::async_runtime::spawn(async move {
            host.run(request, journal.fingerprint, control).await;
        });
        Ok(record)
    }

    pub fn read(&self, task_id: &str) -> Result<Vec<JobRecord>, String> {
        validate_id(task_id, "taskId")?;
        Ok(self
            .read_one(task_id)?
            .map(|v| vec![v.record])
            .unwrap_or_default())
    }
    pub fn get(&self, task_id: &str) -> Result<Option<JobRecord>, String> {
        validate_id(task_id, "taskId")?;
        Ok(self.read_one(task_id)?.map(|v| v.record))
    }
    pub fn list(&self) -> Result<Vec<JobRecord>, String> {
        let _lock = self.lock()?;
        let mut records = Vec::new();
        for entry in fs::read_dir(&self.root).map_err(io::error)? {
            let path = entry.map_err(io::error)?.path();
            if path.extension().and_then(|v| v.to_str()) != Some("json") {
                continue;
            }
            let Some(raw) = io::read(&path, 256 * 1024)? else {
                continue;
            };
            let journal: JournalRecord = serde_json::from_slice(&raw)
                .map_err(|_| "corrupt: 原生任务记录损坏，已保留原文件".to_string())?;
            validate_record(&journal.record)?;
            records.push(journal.record);
        }
        records.sort_by(|a, b| {
            a.updated_at
                .cmp(&b.updated_at)
                .then_with(|| a.task_id.cmp(&b.task_id))
        });
        Ok(records)
    }
    pub fn cancel(&self, task_id: &str) -> Result<Option<JobRecord>, String> {
        validate_id(task_id, "taskId")?;
        if let Some(control) = self
            .jobs
            .lock()
            .map_err(|_| "io: 原生任务状态锁不可用".to_string())?
            .get(task_id)
        {
            control.cancelled.store(true, Ordering::Release);
            control.wake.notify_waiters();
        }
        self.get(task_id)
    }

    async fn run(
        self: Arc<Self>,
        request: TaskHostRequest,
        fingerprint: String,
        control: JobControl,
    ) {
        let result = self.perform(&request, &fingerprint, &control).await;
        let mut record = match self.read_one(&request.task_id) {
            Ok(Some(v)) => v,
            _ => {
                if let Ok(mut jobs) = self.jobs.lock() {
                    jobs.remove(&request.task_id);
                }
                return;
            }
        };
        if record.fingerprint != fingerprint {
            if let Ok(mut jobs) = self.jobs.lock() {
                jobs.remove(&request.task_id);
            }
            return;
        }
        match result {
            Ok(asset_ids) => {
                if control.cancelled.load(Ordering::Acquire) {
                    record.record.status = "unknown".into();
                    record.record.failure = Some(failure(
                        "cancelled",
                        0,
                        None,
                        "请求已发送但取消结果无法确认，请先核对供应商",
                    ));
                } else {
                    record.record.status = "succeeded".into();
                    record.record.failure = None;
                }
                merge_asset_ids(&mut record.record.asset_ids, asset_ids);
                for output in &mut record.record.outputs {
                    if record.record.status != "succeeded" && output.status != "succeeded" {
                        output.status = "unknown".into();
                    }
                }
            }
            Err(RunError {
                failure: err,
                request_started,
                asset_ids,
            }) => {
                merge_asset_ids(&mut record.record.asset_ids, asset_ids);
                if request_started {
                    record.record.status = "unknown".into();
                } else {
                    record.record.status = "failed".into();
                }
                record.record.failure = Some(err);
                for output in &mut record.record.outputs {
                    if output.status != "succeeded" {
                        output.status = record.record.status.clone();
                    }
                }
            }
        }
        record.record.updated_at = now_ms();
        let _ = self.write_one(&record);
        let _ = self
            .jobs
            .lock()
            .map(|mut jobs| jobs.remove(&request.task_id));
    }

    async fn perform(
        &self,
        request: &TaskHostRequest,
        fingerprint: &str,
        control: &JobControl,
    ) -> Result<Vec<String>, RunError> {
        let mut attachments = Vec::new();
        for attachment in &request.attachments {
            match self.assets.read(&attachment.asset_id) {
                Ok(Some(asset)) => attachments.push((attachment, asset)),
                Ok(None) => {
                    return Err(RunError::failed("invalid_request", "请求引用的素材不存在"))
                }
                Err(_) => return Err(RunError::failed("invalid_request", "请求引用的素材不可用")),
            }
        }
        let secret = match credential(&request.credential_ref) {
            Ok(Some(value)) if !value.is_empty() => value,
            _ => return Err(RunError::failed("unauthorized", "供应商凭据不可用")),
        };
        if control.cancelled.load(Ordering::Acquire) {
            return Err(RunError::failed("cancelled", "任务在发送前已取消"));
        }
        let provider_base = reqwest::Url::parse(&request.base_url)
            .map_err(|_| RunError::failed("invalid_request", "供应商地址无效"))?;
        let provider_client = pinned_download_client(&provider_base)
            .await
            .map_err(|message| RunError::failed("invalid_request", message))?;
        if control.cancelled.load(Ordering::Acquire) {
            return Err(RunError::failed("cancelled", "任务在发送前已取消"));
        }
        if request.kind.as_deref() == Some("text") {
            return self
                .perform_text(request, fingerprint, control, provider_client, &secret)
                .await;
        }
        let endpoint = if attachments.is_empty() {
            format!(
                "{}/images/generations",
                request.base_url.trim_end_matches('/')
            )
        } else {
            format!("{}/images/edits", request.base_url.trim_end_matches('/'))
        };
        let mut builder = provider_client
            .post(&endpoint)
            .bearer_auth(&secret)
            .header("Idempotency-Key", &request.idempotency_key);
        let count = request.output_indices.len() as u32;
        let response = if attachments.is_empty() {
            let mut payload = json!({"model": request.model, "prompt": request.prompt, "n": count, "response_format": "b64_json"});
            if let Some(size) = request.size.as_ref().filter(|value| !value.is_empty()) {
                payload["size"] = json!(size);
            }
            builder = builder.json(&payload);
            builder
                .send()
                .await
                .map_err(|_| RunError::unknown("network", "供应商请求连接中断", vec![]))?
        } else {
            let mut form = reqwest::multipart::Form::new()
                .text("model", request.model.clone())
                .text("prompt", request.prompt.clone())
                .text("n", count.to_string());
            if let Some(size) = request.size.as_ref().filter(|value| !value.is_empty()) {
                form = form.text("size", size.clone());
            }
            for (attachment, asset) in attachments {
                let bytes = match STANDARD.decode(&asset.data_base64) {
                    Ok(v) => v,
                    Err(_) => {
                        return Err(RunError::failed(
                            "invalid_request",
                            "请求引用的素材编码无效",
                        ))
                    }
                };
                let mime = asset
                    .metadata
                    .get("mime")
                    .and_then(Value::as_str)
                    .unwrap_or("application/octet-stream")
                    .to_string();
                let part = reqwest::multipart::Part::bytes(bytes)
                    .file_name(attachment.name.clone())
                    .mime_str(&mime)
                    .map_err(|_| RunError::failed("invalid_request", "请求引用的素材类型无效"))?;
                form = form.part("image[]", part);
            }
            builder
                .multipart(form)
                .send()
                .await
                .map_err(|_| RunError::unknown("network", "供应商请求连接中断", vec![]))?
        };
        let status = response.status();
        let retry = response
            .headers()
            .get(header::RETRY_AFTER)
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.parse::<u64>().ok())
            .map(|v| v.min(86_400));
        if response
            .content_length()
            .is_some_and(|size| size > MAX_RESPONSE_BYTES as u64)
        {
            return Err(RunError::unknown(
                "provider_unavailable",
                "供应商响应过大",
                vec![],
            ));
        }
        let mut body = Vec::new();
        let mut stream = response.bytes_stream();
        while let Some(chunk) = stream.next().await {
            let chunk =
                chunk.map_err(|_| RunError::unknown("network", "供应商响应读取中断", vec![]))?;
            if body.len().saturating_add(chunk.len()) > MAX_RESPONSE_BYTES {
                return Err(RunError::unknown(
                    "provider_unavailable",
                    "供应商响应过大",
                    vec![],
                ));
            }
            body.extend_from_slice(&chunk);
        }
        if !status.is_success() {
            return Err(RunError {
                failure: failure(
                    class_for_status(status),
                    status.as_u16(),
                    retry,
                    "供应商返回了失败响应",
                ),
                request_started: true,
                asset_ids: vec![],
            });
        }
        let payload: Value = serde_json::from_slice(&body).map_err(|_| {
            RunError::unknown("provider_unavailable", "供应商响应格式无法确认", vec![])
        })?;
        let data = payload
            .get("data")
            .and_then(Value::as_array)
            .ok_or_else(|| {
                RunError::unknown("provider_unavailable", "供应商响应缺少结果", vec![])
            })?;
        if data.len() < request.output_indices.len() {
            return Err(RunError::unknown(
                "provider_unavailable",
                "供应商返回结果数量不足",
                vec![],
            ));
        }
        let provider_request_id = payload
            .get("id")
            .and_then(Value::as_str)
            .map(|v| v.chars().take(200).collect::<String>());
        let mut ids = Vec::new();
        for item in data.iter().take(request.output_indices.len()) {
            if control.cancelled.load(Ordering::Acquire) {
                return Err(RunError::unknown(
                    "cancelled",
                    "请求已发送但取消结果无法确认",
                    ids,
                ));
            }
            let (bytes, mime) = if let Some(encoded) = item.get("b64_json").and_then(Value::as_str)
            {
                match STANDARD.decode(encoded) {
                    Ok(bytes) if !bytes.is_empty() && bytes.len() <= MAX_RESPONSE_BYTES => {
                        (bytes, "image/png")
                    }
                    _ => {
                        return Err(RunError::unknown(
                            "provider_unavailable",
                            "供应商返回的图像无法保存",
                            ids,
                        ))
                    }
                }
            } else if let Some(url) = item.get("url").and_then(Value::as_str) {
                download_result(&provider_base, url)
                    .await
                    .map_err(|e| RunError::unknown("provider_unavailable", e, ids.clone()))?
            } else {
                return Err(RunError::unknown(
                    "provider_unavailable",
                    "供应商结果缺少图像",
                    ids,
                ));
            };
            let sha = format!("{:x}", Sha256::digest(&bytes));
            let metadata = json!({"assetId": format!("asset-{}", &sha[..24]), "sha256": sha, "mime": mime, "tags": ["generated"], "sourceJobId": request.task_id, "promptHash": request.prompt_hash, "isAiGenerated": true, "source": "provider", "provenance": {"provider": request.provider_name.clone().unwrap_or_else(|| "provider".into()), "model": request.model, "providerRequestId": provider_request_id, "generatedAt": rfc3339_now()}});
            match self.assets.store(STANDARD.encode(bytes), metadata) {
                Ok(stored) => {
                    let asset_id = stored["assetId"].as_str().unwrap_or_default().to_string();
                    ids.push(asset_id.clone());
                    if let Err(_) = self.persist_output(
                        &request.task_id,
                        fingerprint,
                        request.output_indices[ids.len() - 1],
                        &asset_id,
                    ) {
                        return Err(RunError::unknown(
                            "provider_unavailable",
                            "生成结果归档状态写入失败",
                            ids,
                        ));
                    }
                }
                Err(_) => {
                    return Err(RunError::unknown(
                        "provider_unavailable",
                        "生成结果归档失败",
                        ids,
                    ))
                }
            }
        }
        Ok(ids)
    }
}

fn merge_asset_ids(target: &mut Vec<String>, incoming: Vec<String>) {
    for asset_id in incoming {
        if !target.iter().any(|existing| existing == &asset_id) {
            target.push(asset_id);
        }
    }
}

struct RunError {
    failure: TaskHostFailure,
    request_started: bool,
    asset_ids: Vec<String>,
}

fn replace_record(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let temp = path.with_extension(format!("tmp.{}", now_ms()));
    {
        use std::io::Write;
        let mut file = std::fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temp)
            .map_err(io::error)?;
        file.write_all(bytes).map_err(io::error)?;
        file.sync_all().map_err(io::error)?;
    }
    // `rename` replaces the destination on the supported desktop platforms.
    // Do not remove the durable journal first: a process termination between
    // remove and rename would lose the only record of an accepted request.
    let result = std::fs::rename(&temp, path).map_err(io::error);
    if result.is_err() {
        let _ = std::fs::remove_file(&temp);
    }
    result
}
impl RunError {
    fn failed(class: &str, message: &str) -> Self {
        Self {
            failure: failure(class, 0, None, message),
            request_started: false,
            asset_ids: vec![],
        }
    }
    fn unknown(class: &str, message: &str, asset_ids: Vec<String>) -> Self {
        Self {
            failure: failure(class, 0, None, message),
            request_started: true,
            asset_ids,
        }
    }
}

fn failure(class: &str, status: u16, retry: Option<u64>, message: &str) -> TaskHostFailure {
    TaskHostFailure {
        failure_class: class.into(),
        status,
        retry_after_seconds: retry,
        message: message.into(),
    }
}
fn class_for_status(status: StatusCode) -> &'static str {
    match status {
        StatusCode::TOO_MANY_REQUESTS => "rate_limited",
        StatusCode::UNAUTHORIZED => "unauthorized",
        StatusCode::FORBIDDEN => "forbidden",
        StatusCode::BAD_REQUEST | StatusCode::UNPROCESSABLE_ENTITY => "invalid_request",
        _ => "provider_unavailable",
    }
}

async fn download_result(
    provider_base: &reqwest::Url,
    value: &str,
) -> Result<(Vec<u8>, &'static str), &'static str> {
    download_result_with_limit(provider_base, value, MAX_RESPONSE_BYTES).await
}

async fn download_result_with_limit(
    provider_base: &reqwest::Url,
    value: &str,
    max_bytes: usize,
) -> Result<(Vec<u8>, &'static str), &'static str> {
    let parsed = reqwest::Url::parse(value).map_err(|_| "供应商结果地址无效")?;
    if !same_origin(provider_base, &parsed)
        || !matches!(parsed.scheme(), "https" | "http")
        || parsed.query().is_some()
        || parsed.fragment().is_some()
        || parsed.username() != ""
        || parsed.password().is_some()
    {
        return Err("供应商结果来源不在允许范围");
    }
    if parsed.scheme() == "http" && !is_loopback_host(parsed.host_str().unwrap_or_default()) {
        return Err("供应商结果地址不安全");
    }
    let download_client = pinned_download_client(&parsed).await?;
    let response = download_client
        .get(parsed)
        .send()
        .await
        .map_err(|_| "供应商结果读取中断")?;
    if !response.status().is_success() {
        return Err("供应商结果读取失败");
    }
    if response
        .content_length()
        .is_some_and(|size| size > max_bytes as u64)
    {
        return Err("供应商结果大小无效");
    }
    let mime = response
        .headers()
        .get(header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .map(|v| {
            if v.starts_with("image/jpeg") {
                "image/jpeg"
            } else if v.starts_with("image/webp") {
                "image/webp"
            } else {
                "image/png"
            }
        })
        .unwrap_or("image/png");
    let mut bytes = Vec::new();
    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|_| "供应商结果读取中断")?;
        append_bounded_chunk(&mut bytes, &chunk, max_bytes)?;
    }
    if bytes.is_empty() {
        return Err("供应商结果大小无效");
    }
    Ok((bytes, mime))
}

/// Return true when two URLs have the same network origin.  Result URLs are
/// intentionally limited to the configured provider origin; provider-signed
/// CDN URLs need an explicit provider configuration instead of widening this
/// check at the IPC boundary.
fn same_origin(left: &reqwest::Url, right: &reqwest::Url) -> bool {
    left.scheme().eq_ignore_ascii_case(right.scheme())
        && left
            .host_str()
            .zip(right.host_str())
            .is_some_and(|(a, b)| a.eq_ignore_ascii_case(b))
        && left.port_or_known_default() == right.port_or_known_default()
}

fn is_loopback_host(host: &str) -> bool {
    normalized_host(host)
        .parse::<IpAddr>()
        .map(|address| address.is_loopback())
        .unwrap_or_else(|_| normalized_host(host).eq_ignore_ascii_case("localhost"))
}

fn normalized_host(host: &str) -> &str {
    host.trim_end_matches('.')
        .strip_prefix('[')
        .and_then(|value| value.strip_suffix(']'))
        .unwrap_or(host.trim_end_matches('.'))
}

/// DNS pinning only accepts globally routable addresses for remote HTTPS
/// origins.  This covers RFC1918, link-local, documentation, benchmark,
/// multicast, carrier-grade NAT, and cloud metadata address ranges.
fn is_public_ip(address: IpAddr) -> bool {
    match address {
        IpAddr::V4(value) => is_public_ipv4(value),
        IpAddr::V6(value) => is_public_ipv6(value),
    }
}

fn is_public_ipv4(value: Ipv4Addr) -> bool {
    let [a, b, c, d] = value.octets();
    let private_or_reserved = a == 0
        || a == 10
        || a == 127
        || (a == 100 && (64..=127).contains(&b))
        || (a == 169 && b == 254)
        || (a == 172 && (16..=31).contains(&b))
        || (a == 192 && b == 0 && c == 0)
        || (a == 192 && b == 0 && c == 2)
        || (a == 192 && b == 88 && c == 99)
        || (a == 192 && b == 168)
        || (a == 198 && b == 18)
        || (a == 198 && b == 19)
        || (a == 198 && b == 51 && c == 100)
        || (a == 203 && b == 0 && c == 113)
        || a >= 224;
    !private_or_reserved && !(a == 169 && b == 254 && c == 169 && d == 254)
}

fn is_public_ipv6(value: Ipv6Addr) -> bool {
    if let Some(mapped) = value.to_ipv4() {
        return is_public_ipv4(mapped);
    }
    let segments = value.segments();
    let documentation = segments[0] == 0x2001 && segments[1] == 0x0db8;
    !value.is_loopback()
        && !value.is_unspecified()
        && !value.is_unique_local()
        && !value.is_unicast_link_local()
        && segments[0] & 0xff00 != 0xff00
        && !documentation
}

/// Resolve a provider/result host once and force reqwest to connect to that
/// address.  Redirects are disabled on the client, so a later response cannot
/// escape the origin or bypass the pinned DNS answer.
async fn pinned_download_client(url: &reqwest::Url) -> Result<Client, &'static str> {
    let host = url.host_str().ok_or("供应商地址缺少主机名")?;
    let lookup_host = normalized_host(host);
    let port = url.port_or_known_default().ok_or("供应商地址缺少端口")?;
    let local = is_loopback_host(host);
    if url.scheme() == "http" && !local {
        return Err("供应商结果地址不安全");
    }
    if url.scheme() != "https" && url.scheme() != "http" {
        return Err("供应商地址协议不安全");
    }
    let addresses: Vec<SocketAddr> = if let Ok(address) = lookup_host.parse::<IpAddr>() {
        vec![SocketAddr::new(address, port)]
    } else {
        tokio::net::lookup_host((lookup_host, port))
            .await
            .map_err(|_| "供应商地址解析失败")?
            .collect()
    };
    if addresses.is_empty() {
        return Err("供应商地址解析失败");
    }
    let mut selected = None;
    for address in addresses {
        let accepted = if local {
            address.ip().is_loopback()
        } else {
            is_public_ip(address.ip())
        };
        if !accepted {
            return Err("供应商地址解析到了受限网络");
        }
        selected.get_or_insert(address);
    }
    let target = selected.ok_or("供应商地址解析失败")?;
    Client::builder()
        .connect_timeout(PROVIDER_CONNECT_TIMEOUT)
        .timeout(PROVIDER_REQUEST_TIMEOUT)
        .redirect(reqwest::redirect::Policy::none())
        .no_proxy()
        .resolve(lookup_host, target)
        .build()
        .map_err(|_| "io: 原生任务网络客户端不可用")
}

fn append_bounded_chunk(
    bytes: &mut Vec<u8>,
    chunk: &[u8],
    max_bytes: usize,
) -> Result<(), &'static str> {
    if bytes.len().saturating_add(chunk.len()) > max_bytes {
        return Err("供应商结果大小无效");
    }
    bytes.extend_from_slice(chunk);
    Ok(())
}

fn validate_request(value: &TaskHostRequest) -> Result<(), String> {
    if value
        .concurrency_limit
        .is_some_and(|limit| !(1..=256).contains(&limit))
    {
        return Err("invalid: concurrencyLimit".into());
    }
    if !matches!(value.kind.as_deref(), None | Some("image" | "text")) {
        return Err("invalid: kind".into());
    }
    if value.kind.as_deref() == Some("text")
        && (value.output_indices.len() != 1
            || !value.attachments.is_empty()
            || value.size.is_some())
    {
        return Err("invalid: text request must have one output and no image parameters".into());
    }
    validate_id(&value.task_id, "taskId")?;
    validate_id(&value.idempotency_key, "idempotencyKey")?;
    if value.prompt.is_empty() || value.prompt.chars().count() > MAX_PROMPT {
        return Err("invalid: prompt".into());
    }
    if value.model.is_empty() || value.model.chars().count() > MAX_MODEL {
        return Err("invalid: model".into());
    }
    let url = reqwest::Url::parse(&value.base_url).map_err(|_| "invalid: baseUrl".to_string())?;
    if value.base_url.chars().count() > MAX_BASE_URL
        || !matches!(url.scheme(), "https" | "http")
        || url.query().is_some()
        || url.fragment().is_some()
        || url.username() != ""
        || url.password().is_some()
        || url.host_str().is_none()
    {
        return Err("invalid: baseUrl".into());
    }
    let host = url.host_str().unwrap_or_default();
    if url.scheme() == "http" && !is_loopback_host(host) {
        return Err("invalid: baseUrl".into());
    }
    if url.scheme() == "https"
        && !is_loopback_host(host)
        && normalized_host(host)
            .parse::<IpAddr>()
            .is_ok_and(|address| !is_public_ip(address))
    {
        return Err("invalid: baseUrl".into());
    }
    if value.credential_ref.is_empty() || value.credential_ref.chars().count() > MAX_ID {
        return Err("invalid: credentialRef".into());
    }
    if value.output_indices.is_empty() || value.output_indices.len() > MAX_OUTPUTS || {
        let mut s = value.output_indices.clone();
        s.sort_unstable();
        s.dedup();
        s.len() != value.output_indices.len()
    } {
        return Err("invalid: outputIndices".into());
    }
    if value.model.eq_ignore_ascii_case("dall-e-3") && value.output_indices.len() != 1 {
        return Err("invalid: outputIndices".into());
    }
    if value.attachments.len() > 10 {
        return Err("invalid: attachments".into());
    }
    for item in &value.attachments {
        if item.asset_id.is_empty()
            || item.asset_id.chars().count() > MAX_ID
            || item.name.is_empty()
            || item.name.chars().count() > MAX_ATTACHMENT_NAME
            || item.name.contains(['\\', '/', '\0'])
        {
            return Err("invalid: attachment".into());
        }
    }
    if let Some(name) = &value.provider_name {
        if name.chars().count() > 80 {
            return Err("invalid: providerName".into());
        }
    }
    if let Some(hash) = &value.prompt_hash {
        if hash.chars().count() > 200 {
            return Err("invalid: promptHash".into());
        }
    }
    if let Some(size) = &value.size {
        if !valid_image_size(size) {
            return Err("invalid: size".into());
        }
    }
    Ok(())
}
/// Provider size labels are WIDTHxHEIGHT pixel dimensions resolved by the
/// frontend; the host only verifies the shape before forwarding the value.
fn valid_image_size(value: &str) -> bool {
    let Some((width, height)) = value.split_once('x') else {
        return false;
    };
    let in_range = |part: &str| -> bool {
        match part.parse::<u32>() {
            Ok(edge) => (256..=4096).contains(&edge),
            Err(_) => false,
        }
    };
    in_range(width) && in_range(height)
}

fn validate_id(value: &str, field: &str) -> Result<(), String> {
    if value.is_empty()
        || value.chars().count() > MAX_ID
        || !value
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || "_-.:".contains(c))
    {
        Err(format!("invalid: {field}"))
    } else {
        Ok(())
    }
}
fn validate_record(record: &JobRecord) -> Result<(), String> {
    for output in &record.outputs {
        if let Some(text) = &output.text {
            if text.len() > text::MAX_TEXT_BYTES
                || output.asset_id.is_some()
                || (output.status == "succeeded" && text.trim().is_empty())
            {
                return Err("corrupt: 原生文本结果无效".into());
            }
        }
    }
    validate_id(&record.task_id, "taskId")?;
    validate_id(&record.idempotency_key, "idempotencyKey")?;
    if !matches!(
        record.status.as_str(),
        "submitted" | "succeeded" | "failed" | "unknown"
    ) {
        return Err("corrupt: 原生任务状态无效".into());
    }
    if record.output_indices.is_empty() || record.output_indices.len() > MAX_OUTPUTS {
        return Err("corrupt: 原生任务输出无效".into());
    }
    if record.updated_at == 0 {
        return Err("corrupt: 原生任务时间无效".into());
    }
    Ok(())
}
fn fingerprint(value: &TaskHostRequest) -> Result<String, String> {
    // Keep the exact serialization of legacy image identities; explicit image
    // is equivalent to an omitted kind, while text gets a distinct fingerprint.
    let mut normalized = value.clone();
    if normalized.kind.as_deref() == Some("image") {
        normalized.kind = None;
    }
    let raw = serde_json::to_vec(&normalized).map_err(|_| "invalid: request".to_string())?;
    Ok(format!("{:x}", Sha256::digest(raw)))
}
fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
        .min(u64::MAX as u128) as u64
}
fn rfc3339_now() -> String {
    let seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let days = seconds / 86_400;
    let day_seconds = seconds % 86_400;
    let (year, month, day) = civil_from_days(days as i64);
    format!(
        "{year:04}-{month:02}-{day:02}T{:02}:{:02}:{:02}Z",
        day_seconds / 3600,
        (day_seconds % 3600) / 60,
        day_seconds % 60
    )
}
fn civil_from_days(days: i64) -> (i32, u32, u32) {
    let z = days + 719_468;
    let era = (if z >= 0 { z } else { z - 146_096 }) / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = mp + if mp < 10 { 3 } else { -9 };
    (y as i32 + if m <= 2 { 1 } else { 0 }, m as u32, d as u32)
}

fn credential(provider_id: &str) -> Result<Option<String>, String> {
    #[cfg(target_os = "windows")]
    {
        let entry = keyring::Entry::new("com.kkstudio.provider", provider_id)
            .map_err(|_| "credential unavailable")?;
        return match entry.get_password() {
            Ok(v) => Ok(Some(v)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(_) => Err("credential unavailable".into()),
        };
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = provider_id;
        Ok(None)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    pub(super) fn fail_at(_stage: &str) -> Result<(), String> {
        Ok(())
    }
    fn request(task: &str) -> TaskHostRequest {
        TaskHostRequest {
            task_id: task.into(),
            idempotency_key: "idem-1".into(),
            base_url: "http://127.0.0.1:1234/v1".into(),
            credential_ref: "test".into(),
            model: "demo".into(),
            prompt: "hello".into(),
            output_indices: vec![0],
            attachments: vec![],
            provider_name: None,
            prompt_hash: None,
            size: None,
            kind: None,
            concurrency_limit: None,
        }
    }
    #[test]
    fn text_request_roundtrip_and_image_parameters_are_rejected() {
        let mut value = serde_json::to_value(request("text-task")).unwrap();
        value["kind"] = json!("text");
        let text: TaskHostRequest = serde_json::from_value(value.clone()).unwrap();
        assert_eq!(serde_json::to_value(&text).unwrap()["kind"], "text");
        assert!(validate_request(&text).is_ok());
        value["size"] = json!("1024x1024");
        assert!(validate_request(&serde_json::from_value(value).unwrap()).is_err());
    }

    #[test]
    fn text_output_roundtrip_preserves_generated_content() {
        let output: JobOutput = serde_json::from_value(json!({
            "index": 0, "status": "succeeded", "text": "真实文本输出"
        }))
        .unwrap();
        assert_eq!(
            serde_json::to_value(output).unwrap()["text"],
            "真实文本输出"
        );
    }
    #[test]
    fn text_capacity_rejects_before_journaling_and_validates_limits() {
        let root = root();
        let assets = Arc::new(AssetRepository::new(root.join("assets")));
        let host = Arc::new(TaskHost::new(root.join("jobs"), assets).unwrap());
        let mut pending = request("native-capacity");
        pending.kind = Some("text".into());
        pending.concurrency_limit = Some(1);
        host.jobs.lock().unwrap().insert(
            "other".into(),
            JobControl {
                cancelled: Arc::new(AtomicBool::new(false)),
                wake: Arc::new(Notify::new()),
                credential_ref: pending.credential_ref.clone(),
            },
        );
        let result = tauri::async_runtime::block_on(Arc::clone(&host).submit(pending.clone()));
        assert!(result.unwrap_err().starts_with("capacity:"));
        assert!(host.get(&pending.task_id).unwrap().is_none());
        pending.concurrency_limit = Some(0);
        assert!(validate_request(&pending).is_err());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn omitted_text_fields_preserve_image_identity() {
        let original = request("legacy-image");
        let original_json = serde_json::to_value(&original).unwrap();
        assert!(original_json.get("kind").is_none());
        assert!(original_json.get("concurrencyLimit").is_none());
        let mut explicit = original.clone();
        explicit.kind = Some("image".into());
        assert_eq!(
            fingerprint(&original).unwrap(),
            fingerprint(&explicit).unwrap()
        );
    }
    fn root() -> PathBuf {
        let path = std::env::temp_dir().join(format!(
            "kk-task-host-{}-{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_nanos()
        ));
        fs::create_dir_all(&path).unwrap();
        path
    }
    #[test]
    fn validation_rejects_url_credentials_and_duplicate_indices() {
        let mut r = request("a");
        r.base_url = "https://x.test?a=1".into();
        assert!(validate_request(&r).is_err());
        r.base_url = "https://x.test".into();
        r.output_indices = vec![1, 1];
        assert!(validate_request(&r).is_err());
        r.output_indices = vec![0];
        r.base_url = "http://provider.test/v1".into();
        assert!(validate_request(&r).is_err());
        r.base_url = "http://127.0.0.1:1234/v1".into();
        assert!(validate_request(&r).is_ok());
        r.base_url = "http://[::1]:1234/v1".into();
        assert!(validate_request(&r).is_ok());
    }

    #[test]
    fn image_size_validation_matches_pixel_shape() {
        assert!(valid_image_size("1024x1024"));
        assert!(valid_image_size("2048x1152"));
        assert!(!valid_image_size("1024"));
        assert!(!valid_image_size("100x1024"));
        assert!(!valid_image_size("1024x99999"));
        assert!(!valid_image_size("abcx1024"));
        let mut r = request("size-ok");
        r.size = Some("1024x1024".into());
        assert!(validate_request(&r).is_ok());
        r.size = Some("16x16".into());
        assert!(validate_request(&r).is_err());
    }

    #[test]
    fn result_urls_are_limited_to_provider_origin() {
        let provider = reqwest::Url::parse("https://provider.test/v1").unwrap();
        assert!(same_origin(
            &provider,
            &reqwest::Url::parse("https://provider.test/results/1").unwrap()
        ));
        assert!(!same_origin(
            &provider,
            &reqwest::Url::parse("https://cdn.provider.test/results/1").unwrap()
        ));
        assert!(!same_origin(
            &provider,
            &reqwest::Url::parse("http://provider.test/results/1").unwrap()
        ));
    }

    #[test]
    fn dns_pinning_rejects_non_public_addresses() {
        assert!(!is_public_ip("10.0.0.1".parse().unwrap()));
        assert!(!is_public_ip("169.254.169.254".parse().unwrap()));
        assert!(!is_public_ip("192.168.1.10".parse().unwrap()));
        assert!(!is_public_ip("127.0.0.1".parse().unwrap()));
        assert!(!is_public_ip("::1".parse().unwrap()));
        assert!(!is_public_ip("fc00::1".parse().unwrap()));
        assert!(is_public_ip("8.8.8.8".parse().unwrap()));
        assert!(is_public_ip("2001:4860:4860::8888".parse().unwrap()));
        assert!(is_loopback_host("[::1]"));
        assert_eq!(normalized_host("[2001:db8::1]"), "2001:db8::1");
    }
    #[test]
    fn malformed_journal_fails_closed() {
        let path = root();
        fs::write(path.join("bad.json"), b"nope").unwrap();
        let assets = Arc::new(AssetRepository::new(path.join("assets")));
        assert!(TaskHost::new(path.clone(), assets).is_err());
        let _ = fs::remove_dir_all(path);
    }
    #[test]
    fn submitted_journal_reopens_as_unknown() {
        let path = root();
        let rec = JobRecord {
            task_id: "task".into(),
            idempotency_key: "idem".into(),
            output_indices: vec![0],
            status: "submitted".into(),
            asset_ids: vec![],
            outputs: vec![JobOutput {
                index: 0,
                status: "submitted".into(),
                asset_id: None,
                text: None,
                error: None,
            }],
            failure: None,
            updated_at: 1,
        };
        fs::write(
            path.join("task.json"),
            serde_json::to_vec(&JournalRecord {
                record: rec,
                fingerprint: "a".repeat(64),
            })
            .unwrap(),
        )
        .unwrap();
        let assets = Arc::new(AssetRepository::new(path.join("assets")));
        let host = TaskHost::new(path.clone(), assets).unwrap();
        let records = host.read("task").unwrap();
        assert_eq!(records[0].status, "unknown");
        let _ = fs::remove_dir_all(path);
    }

    #[test]
    fn per_slot_output_commit_survives_reopen() {
        let path = root();
        let assets = Arc::new(AssetRepository::new(path.join("assets")));
        let host = TaskHost::new(path.clone(), assets).unwrap();
        let req = request("task");
        let fingerprint = fingerprint(&req).unwrap();
        let record = JobRecord {
            task_id: req.task_id.clone(),
            idempotency_key: req.idempotency_key.clone(),
            output_indices: req.output_indices.clone(),
            status: "submitted".into(),
            asset_ids: vec![],
            outputs: vec![JobOutput {
                index: 0,
                status: "submitted".into(),
                asset_id: None,
                text: None,
                error: None,
            }],
            failure: None,
            updated_at: now_ms(),
        };
        host.write_one(&JournalRecord {
            record,
            fingerprint: fingerprint.clone(),
        })
        .unwrap();
        host.persist_output("task", &fingerprint, 0, "asset-1")
            .unwrap();
        let reopened = TaskHost::new(
            path.clone(),
            Arc::new(AssetRepository::new(path.join("assets"))),
        )
        .unwrap();
        let output = &reopened.get("task").unwrap().unwrap().outputs[0];
        assert_eq!(output.status, "succeeded");
        assert_eq!(output.asset_id.as_deref(), Some("asset-1"));
        assert_eq!(
            reopened.get("task").unwrap().unwrap().asset_ids,
            vec!["asset-1"]
        );
        let _ = fs::remove_dir_all(path);
    }

    #[test]
    fn result_download_chunk_accumulator_caps_stream() {
        let mut bytes = Vec::new();
        append_bounded_chunk(&mut bytes, b"1234", 8).unwrap();
        assert_eq!(
            append_bounded_chunk(&mut bytes, b"56789", 8),
            Err("供应商结果大小无效")
        );
        assert_eq!(bytes, b"1234");
    }
}
