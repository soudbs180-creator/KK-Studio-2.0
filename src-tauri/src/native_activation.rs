use crate::asset_storage::io;
use crate::native_root_authority::{
    read_identity, valid_id, NativeRootAuthority, PROTOCOL_VERSION,
};
use axum::body::to_bytes;
use axum::extract::{ConnectInfo, Request, State};
use axum::http::{header, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
#[cfg(test)]
use std::fs;
use std::net::SocketAddr;
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tokio::sync::{oneshot, Notify, OnceCell};

#[cfg(test)]
#[path = "native_activation_tests.rs"]
mod tests;

type Focus = Arc<dyn Fn() -> Result<(), String> + Send + Sync>;
const READY_WAIT: Duration = Duration::from_secs(6);
const BODY_WAIT: Duration = Duration::from_secs(2);
const MAX_JSON: usize = 1024;

#[derive(Default)]
pub(crate) struct FocusGate {
    callback: Mutex<Option<Focus>>,
    ready: Notify,
    startup_focus: OnceCell<Result<(), ()>>,
}
impl FocusGate {
    pub(crate) fn register(&self, callback: Focus) -> Result<(), String> {
        let mut slot = self
            .callback
            .lock()
            .map_err(|_| "io: 窗口激活锁不可用".to_string())?;
        if slot.is_some() {
            return Err("conflict: 窗口激活已注册".into());
        }
        *slot = Some(callback);
        drop(slot);
        self.ready.notify_waiters();
        Ok(())
    }
    async fn focus(&self) -> Result<(), ()> {
        let mut waited = false;
        let callback = tokio::time::timeout(READY_WAIT, async {
            loop {
                let ready = self.ready.notified();
                let callback = self.callback.lock().map_err(|_| ())?.clone();
                if let Some(callback) = callback {
                    return Ok::<_, ()>(callback);
                }
                waited = true;
                ready.await;
            }
        })
        .await
        .map_err(|_| ())??;
        let invoke = || async {
            tokio::task::spawn_blocking(move || callback())
                .await
                .map_err(|_| ())?
                .map_err(|_| ())
        };
        if waited {
            *self.startup_focus.get_or_init(invoke).await
        } else {
            invoke().await
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct EndpointDescriptor {
    version: u32,
    repository_id: String,
    authority_epoch: String,
    protocol_version: u32,
    format_version: u32,
    minimum_writer_version: u32,
    port: u16,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ActivationRequest {
    repository_id: String,
    authority_epoch: String,
}

struct ActivationState {
    authority: Arc<NativeRootAuthority>,
    descriptor: EndpointDescriptor,
    focus: Arc<FocusGate>,
}
pub(crate) struct ActivationServer {
    #[cfg(test)]
    pub descriptor: EndpointDescriptor,
    pub focus: Arc<FocusGate>,
    stop: Option<oneshot::Sender<()>>,
    task: Option<tokio::task::JoinHandle<()>>,
}
impl ActivationServer {
    pub(crate) async fn start(authority: Arc<NativeRootAuthority>) -> Result<Self, String> {
        let listener = tokio::net::TcpListener::bind((std::net::Ipv4Addr::LOCALHOST, 0))
            .await
            .map_err(|_| "io: 无法启动本机窗口激活服务".to_string())?;
        let descriptor = EndpointDescriptor {
            version: 1,
            repository_id: authority.identity.repository_id.clone(),
            authority_epoch: authority.epoch.clone(),
            protocol_version: PROTOCOL_VERSION,
            format_version: authority.identity.format_version,
            minimum_writer_version: authority.identity.minimum_writer_version,
            port: listener.local_addr().map_err(io::error)?.port(),
        };
        let focus = Arc::new(FocusGate::default());
        let state = Arc::new(ActivationState {
            authority: Arc::clone(&authority),
            descriptor: descriptor.clone(),
            focus: Arc::clone(&focus),
        });
        let router = Router::new()
            .route("/health", get(health))
            .route("/activate", post(activate))
            .fallback(|| async { safe_error(StatusCode::NOT_FOUND) })
            .with_state(state);
        let raw = serde_json::to_vec(&descriptor).map_err(io::error)?;
        let descriptor_path = authority.root.join("app/authority-endpoint.json");
        tokio::task::spawn_blocking(move || io::atomic_write(&descriptor_path, &raw, true))
            .await
            .map_err(|_| "io: 本机激活描述发布中断".to_string())??;
        let (stop, stopped) = oneshot::channel();
        let task = tokio::spawn(async move {
            let _ = axum::serve(
                listener,
                router.into_make_service_with_connect_info::<SocketAddr>(),
            )
            .with_graceful_shutdown(async {
                let _ = stopped.await;
            })
            .await;
        });
        Ok(Self {
            #[cfg(test)]
            descriptor,
            focus,
            stop: Some(stop),
            task: Some(task),
        })
    }
    pub(crate) async fn shutdown(mut self) {
        if let Ok(mut callback) = self.focus.callback.lock() {
            *callback = None;
        }
        if let Some(stop) = self.stop.take() {
            let _ = stop.send(());
        }
        if let Some(mut task) = self.task.take() {
            if tokio::time::timeout(Duration::from_secs(3), &mut task)
                .await
                .is_err()
            {
                task.abort();
            }
        }
    }
}
impl Drop for ActivationServer {
    fn drop(&mut self) {
        if let Some(stop) = self.stop.take() {
            let _ = stop.send(());
        }
    }
}

fn response(status: StatusCode, value: Value) -> Response {
    let mut response = (status, Json(value)).into_response();
    response
        .headers_mut()
        .insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
    response.headers_mut().insert(
        "x-content-type-options",
        HeaderValue::from_static("nosniff"),
    );
    response
}
fn safe_error(status: StatusCode) -> Response {
    response(status, json!({"error":"activation-unavailable"}))
}
fn valid_host(request: &Request, peer: SocketAddr, port: u16) -> bool {
    peer.ip().is_loopback()
        && request
            .headers()
            .get(header::HOST)
            .and_then(|host| host.to_str().ok())
            == Some(format!("127.0.0.1:{port}").as_str())
}
async fn health(
    State(state): State<Arc<ActivationState>>,
    ConnectInfo(peer): ConnectInfo<SocketAddr>,
    request: Request,
) -> Response {
    if !valid_host(&request, peer, state.descriptor.port) {
        return safe_error(StatusCode::FORBIDDEN);
    }
    // This surface contains public admission data only; no paths or user data.
    response(
        StatusCode::OK,
        json!({"version":1,"repositoryId":state.authority.identity.repository_id,"authorityEpoch":state.authority.epoch,"protocolVersion":PROTOCOL_VERSION,"formatVersion":state.authority.identity.format_version,"minimumWriterVersion":state.authority.identity.minimum_writer_version,"port":state.descriptor.port}),
    )
}
async fn activate(
    State(state): State<Arc<ActivationState>>,
    ConnectInfo(peer): ConnectInfo<SocketAddr>,
    request: Request,
) -> Response {
    if !valid_host(&request, peer, state.descriptor.port)
        || request
            .headers()
            .keys()
            .any(|header| header == header::ORIGIN || header.as_str().starts_with("sec-fetch-"))
    {
        return safe_error(StatusCode::FORBIDDEN);
    }
    if request.uri().query().is_some() {
        return safe_error(StatusCode::BAD_REQUEST);
    }
    if request
        .headers()
        .get(header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        != Some("application/json")
    {
        return safe_error(StatusCode::UNSUPPORTED_MEDIA_TYPE);
    }
    let raw = match tokio::time::timeout(BODY_WAIT, to_bytes(request.into_body(), MAX_JSON)).await {
        Ok(Ok(raw)) => raw,
        Ok(Err(_)) => return safe_error(StatusCode::PAYLOAD_TOO_LARGE),
        Err(_) => return safe_error(StatusCode::REQUEST_TIMEOUT),
    };
    let payload: ActivationRequest = match serde_json::from_slice(&raw) {
        Ok(payload) => payload,
        Err(_) => return safe_error(StatusCode::BAD_REQUEST),
    };
    if payload.repository_id != state.descriptor.repository_id
        || payload.authority_epoch != state.descriptor.authority_epoch
    {
        return safe_error(StatusCode::CONFLICT);
    }
    match state.focus.focus().await {
        Ok(()) => response(StatusCode::OK, json!({"activated":true})),
        Err(()) => safe_error(StatusCode::SERVICE_UNAVAILABLE),
    }
}

async fn bounded_json(response: reqwest::Response) -> Result<Value, ()> {
    if !response.status().is_success() {
        return Err(());
    }
    let mut response = response;
    let mut raw = Vec::new();
    while let Some(chunk) = response.chunk().await.map_err(|_| ())? {
        if raw.len() + chunk.len() > 4096 {
            return Err(());
        }
        raw.extend_from_slice(&chunk);
    }
    serde_json::from_slice(&raw).map_err(|_| ())
}

pub(crate) async fn activate_existing(root: &Path, wait: Duration) -> Result<(), String> {
    let root = root.to_path_buf();
    let deadline = Instant::now() + wait;
    let client = reqwest::Client::builder()
        .no_proxy()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(wait.min(Duration::from_secs(8)))
        .build()
        .map_err(|_| "io: 无法初始化本机激活连接".to_string())?;
    let attempt = async {
        loop {
            let read_root = root.clone();
            let descriptor = tokio::task::spawn_blocking(move || read_endpoint(&read_root))
                .await
                .map_err(|_| "io: 本机激活描述读取中断".to_string())??;
            if let Some(descriptor) = descriptor {
                let base = format!("http://127.0.0.1:{}", descriptor.port);
                let health = client.get(format!("{base}/health")).send().await;
                if let Ok(health) = health {
                    if let Ok(value) = bounded_json(health).await {
                        if serde_json::from_value::<EndpointDescriptor>(value)
                            .ok()
                            .as_ref()
                            == Some(&descriptor)
                        {
                            let activated = client.post(format!("{base}/activate")).json(&json!({"repositoryId":descriptor.repository_id,"authorityEpoch":descriptor.authority_epoch})).send().await;
                            if let Ok(activated) = activated {
                                if bounded_json(activated).await.ok()
                                    == Some(json!({"activated":true}))
                                {
                                    return Ok(());
                                }
                            }
                            return Err("io: 原窗口暂时无法激活，请稍后重试".into());
                        }
                    }
                }
            }
            if Instant::now() >= deadline {
                return Err("io: 原实例未在限定时间内就绪，未启动第二个仓库".into());
            }
            tokio::time::sleep(Duration::from_millis(25)).await;
        }
    };
    tokio::time::timeout(wait, attempt)
        .await
        .unwrap_or_else(|_| Err("io: 原实例未在限定时间内就绪，未启动第二个仓库".into()))
}

fn read_endpoint(root: &Path) -> Result<Option<EndpointDescriptor>, String> {
    let Some(raw) = io::read(&root.join("app/authority-endpoint.json"), 4096)? else {
        return Ok(None);
    };
    let descriptor: EndpointDescriptor =
        serde_json::from_slice(&raw).map_err(|_| "corrupt: 本机激活描述无效".to_string())?;
    let identity = read_identity(root)?.ok_or_else(|| "corrupt: 仓库身份尚未就绪".to_string())?;
    if descriptor.version != 1
        || descriptor.protocol_version != PROTOCOL_VERSION
        || descriptor.format_version != identity.format_version
        || descriptor.minimum_writer_version != identity.minimum_writer_version
        || descriptor.repository_id != identity.repository_id
        || !valid_id(&descriptor.authority_epoch)
        || descriptor.port == 0
    {
        return Err("unsupported: 本机激活身份不匹配".into());
    }
    Ok(Some(descriptor))
}
