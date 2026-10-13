//! Read-only, keyless loopback model discovery. It is not a general HTTP proxy.
use serde::Serialize;
use std::collections::HashMap;
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr, SocketAddr};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tokio::sync::watch;

const MAX_BODY: usize = 2 * 1024 * 1024;
const MAX_ACTIVE: usize = 4;
const MAX_CANCELLED: usize = 64;
const CANCEL_TTL: Duration = Duration::from_secs(30);

#[derive(Default)]
struct Pending {
    active: HashMap<String, watch::Sender<bool>>,
    cancelled: HashMap<String, Instant>,
}
impl Pending {
    fn prune(&mut self) {
        self.cancelled.retain(|_, at| at.elapsed() < CANCEL_TTL);
    }
}
#[derive(Default)]
pub struct ModelDiscovery {
    pending: Mutex<Pending>,
}
#[derive(Debug, Serialize)]
pub struct ModelPage {
    pub status: u16,
    pub body: String,
}
fn request_id(id: &str) -> Result<(), String> {
    if id.starts_with("model-page-")
        && id.len() <= 128
        && id.len() > 11
        && id.bytes().all(|c| c.is_ascii_alphanumeric() || c == b'-')
    {
        Ok(())
    } else {
        Err("invalid: model discovery identity".into())
    }
}
fn local_models_url(value: &str, protocol: &str) -> Result<reqwest::Url, String> {
    let invalid = || "invalid: only canonical loopback models endpoints are allowed".to_string();
    if value.len() > 64 * 1024
        || !matches!(
            protocol,
            "openai-compatible" | "anthropic-messages" | "gemini"
        )
    {
        return Err(invalid());
    }
    let url = reqwest::Url::parse(value).map_err(|_| invalid())?;
    let raw_authority = value
        .split_once("://")
        .map(|(_, rest)| rest.split('/').next().unwrap_or(""))
        .ok_or_else(invalid)?;
    let raw_host = if raw_authority.starts_with('[') {
        raw_authority
            .split_once(']')
            .map(|(host, _)| format!("{host}]"))
    } else {
        Some(raw_authority.split(':').next().unwrap_or("").to_string())
    };
    if !matches!(url.scheme(), "http" | "https")
        || !matches!(
            raw_host.as_deref().map(str::to_ascii_lowercase).as_deref(),
            Some("localhost" | "127.0.0.1" | "[::1]")
        )
        || raw_authority.contains('@')
        || !url.username().is_empty()
        || url.password().is_some()
        || url.fragment().is_some()
        || !url.path().ends_with("/models")
    {
        return Err(invalid());
    }
    let parameters: Vec<_> = url.query_pairs().collect();
    if parameters.len() > 1
        || parameters.iter().any(|(key, value)| {
            value.len() > 16 * 1024
                || value.is_empty()
                || !matches!(
                    (protocol, key.as_ref()),
                    ("gemini", "pageToken") | ("anthropic-messages", "after_id")
                )
        })
    {
        return Err(invalid());
    }
    Ok(url)
}
impl ModelDiscovery {
    pub fn cancel(&self, id: &str) -> Result<bool, String> {
        request_id(id)?;
        let mut pending = self.pending.lock().map_err(|_| "io: discovery lock")?;
        pending.prune();
        if let Some(sender) = pending.active.get(id) {
            let _ = sender.send(true);
            return Ok(true);
        }
        if pending.cancelled.len() >= MAX_CANCELLED {
            return Ok(false);
        }
        pending.cancelled.insert(id.to_string(), Instant::now());
        Ok(true)
    }
    pub async fn read(&self, id: &str, value: &str, protocol: &str) -> Result<ModelPage, String> {
        request_id(id)?;
        let url = local_models_url(value, protocol)?;
        let (sender, mut cancelled) = watch::channel(false);
        {
            let mut pending = self.pending.lock().map_err(|_| "io: discovery lock")?;
            pending.prune();
            if pending.cancelled.remove(id).is_some() {
                return Err("cancelled: model discovery".into());
            }
            if pending.active.len() >= MAX_ACTIVE
                || pending.cancelled.len() >= MAX_CANCELLED
                || pending.active.contains_key(id)
            {
                return Err("capacity: model discovery".into());
            }
            pending.active.insert(id.to_string(), sender);
        }
        let _remove = RemovePending { service: self, id };
        tokio::select! {
            biased;
            _ = cancelled.changed() => Err("cancelled: model discovery".into()),
            response = read_page(url, protocol) => response,
        }
    }
}
struct RemovePending<'a> {
    service: &'a ModelDiscovery,
    id: &'a str,
}
impl Drop for RemovePending<'_> {
    fn drop(&mut self) {
        if let Ok(mut pending) = self.service.pending.lock() {
            pending.active.remove(self.id);
        }
    }
}
async fn read_page(url: reqwest::Url, protocol: &str) -> Result<ModelPage, String> {
    let local_addresses = [
        SocketAddr::new(IpAddr::V4(Ipv4Addr::LOCALHOST), 0),
        SocketAddr::new(IpAddr::V6(Ipv6Addr::LOCALHOST), 0),
    ];
    let client = reqwest::Client::builder()
        .no_proxy()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(Duration::from_secs(10))
        .resolve_to_addrs("localhost", &local_addresses)
        .build()
        .map_err(|_| "io: model discovery client")?;
    let mut request = client.get(url).header("Accept", "application/json");
    if protocol == "anthropic-messages" {
        request = request.header("anthropic-version", "2023-06-01");
    }
    let mut response = request
        .send()
        .await
        .map_err(|_| "io: local model discovery")?;
    let status = response.status().as_u16();
    if !response.status().is_success() {
        return Ok(ModelPage {
            status,
            body: String::new(),
        });
    }
    if response
        .content_length()
        .is_some_and(|size| size > MAX_BODY as u64)
    {
        return Err("quota: model catalog body".into());
    }
    let mut body = Vec::new();
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|_| "io: model catalog body")?
    {
        if chunk.len() > MAX_BODY.saturating_sub(body.len()) {
            return Err("quota: model catalog body".into());
        }
        body.extend_from_slice(&chunk);
    }
    Ok(ModelPage {
        status,
        body: String::from_utf8(body).map_err(|_| "invalid: model catalog UTF-8")?,
    })
}

#[cfg(test)]
#[path = "provider_models_tests.rs"]
mod tests;
