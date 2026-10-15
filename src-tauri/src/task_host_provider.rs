//! Fixed provider metadata and read-only discovery share the TaskHost network policy.
use super::*;
use std::collections::HashSet;

const MAX_MODELS_BODY_BYTES: usize = 2 * 1024 * 1024;
const MAX_MODELS: usize = 5_000;
const MAX_MODEL_PAGES: usize = 32;
pub(super) const ANTHROPIC_MAX_TOKENS: u32 = 4_096;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(super) enum Protocol {
    Chat,
    Responses,
    Anthropic,
    Azure,
    Ollama,
    Gemini,
}

impl Protocol {
    pub(super) fn parse(value: Option<&str>) -> Result<Self, String> {
        match value {
            None | Some("openai-chat" | "openai-compatible") => Ok(Self::Chat),
            Some("openai-responses") => Ok(Self::Responses),
            Some("anthropic" | "anthropic-messages") => Ok(Self::Anthropic),
            Some("azure-openai") => Ok(Self::Azure),
            Some("ollama") => Ok(Self::Ollama),
            Some("gemini") => Ok(Self::Gemini),
            _ => Err("invalid: protocol".into()),
        }
    }
}

#[derive(Clone, Copy, Eq, PartialEq)]
enum AuthMode {
    ApiKey,
    None,
}

fn options(
    base_url: &str,
    protocol: Option<&str>,
    auth_mode: Option<&str>,
) -> Result<(reqwest::Url, Protocol, AuthMode), String> {
    let protocol = Protocol::parse(protocol)?;
    let auth = match auth_mode {
        None | Some("api-key" | "api_key") => AuthMode::ApiKey,
        Some("none") => AuthMode::None,
        _ => return Err("invalid: authMode".into()),
    };
    let url = reqwest::Url::parse(base_url).map_err(|_| "invalid: baseUrl".to_string())?;
    if base_url.chars().count() > MAX_BASE_URL
        || !matches!(url.scheme(), "https" | "http")
        || url.query().is_some()
        || url.fragment().is_some()
        || !url.username().is_empty()
        || url.password().is_some()
        || url.host_str().is_none()
    {
        return Err("invalid: baseUrl".into());
    }
    let host = url.host_str().unwrap_or_default();
    if (url.scheme() == "http" && !is_loopback_host(host))
        || (url.scheme() == "https"
            && !is_loopback_host(host)
            && normalized_host(host)
                .parse::<IpAddr>()
                .is_ok_and(|address| !is_public_ip(address)))
    {
        return Err("invalid: baseUrl".into());
    }
    if auth == AuthMode::None
        && (!matches!(protocol, Protocol::Chat | Protocol::Ollama)
            || !matches!(normalized_host(host), "localhost" | "127.0.0.1" | "::1"))
    {
        return Err("invalid: none authentication requires a supported loopback service".into());
    }
    if protocol == Protocol::Azure && url.path().trim_end_matches('/') != "/openai/v1" {
        return Err("invalid: Azure v1 baseUrl must end with /openai/v1".into());
    }
    Ok((url, protocol, auth))
}

/// Validate before resolving credentials. `true` means the request needs a vault key.
pub(crate) fn validate_provider_options(
    base_url: &str,
    protocol: Option<&str>,
    auth_mode: Option<&str>,
) -> Result<bool, String> {
    options(base_url, protocol, auth_mode).map(|(_, _, auth)| auth == AuthMode::ApiKey)
}

fn authentication(
    builder: reqwest::RequestBuilder,
    protocol: Protocol,
    auth: AuthMode,
    secret: Option<&str>,
) -> Result<reqwest::RequestBuilder, String> {
    let mut builder = builder;
    if protocol == Protocol::Anthropic {
        builder = builder.header("anthropic-version", "2023-06-01");
    }
    if auth == AuthMode::None {
        return Ok(builder);
    }
    let secret = secret
        .filter(|key| !key.trim().is_empty())
        .ok_or("credential: 供应商凭据不可用")?;
    Ok(match protocol {
        Protocol::Anthropic => builder.header("x-api-key", secret),
        Protocol::Azure => builder.header("api-key", secret),
        Protocol::Gemini => builder.header("x-goog-api-key", secret),
        _ => builder.bearer_auth(secret),
    })
}

pub(super) fn text_request(
    client: &Client,
    request: &TaskHostRequest,
    secret: &str,
) -> Result<(reqwest::RequestBuilder, Protocol), String> {
    let (_, protocol, auth) = options(
        &request.base_url,
        request.protocol.as_deref(),
        request.auth_mode.as_deref(),
    )?;
    let (url, body) = protocol::request_parts(request)?;
    let builder = client
        .post(url)
        .header("Idempotency-Key", &request.idempotency_key)
        .header(header::ACCEPT, "text/event-stream")
        .json(&body);
    Ok((
        authentication(builder, protocol, auth, Some(secret))?,
        protocol,
    ))
}

fn model_id(value: &Value) -> Result<&str, String> {
    value
        .as_str()
        .filter(|id| {
            !id.trim().is_empty()
                && id.chars().count() <= MAX_MODEL
                && !id.chars().any(char::is_control)
        })
        .ok_or_else(|| "models: 模型列表格式无效".into())
}

fn model_page(value: &Value, protocol: Protocol) -> Result<(Vec<String>, Option<String>), String> {
    if protocol == Protocol::Gemini {
        let data = value
            .get("models")
            .and_then(Value::as_array)
            .ok_or("models: 模型列表格式无效")?;
        if data.len() > MAX_MODELS {
            return Err("models: 模型列表过大".into());
        }
        let ids = data
            .iter()
            .map(|item| {
                let raw = model_id(&item["name"])?;
                let id = raw.strip_prefix("models/").unwrap_or(raw);
                if id.is_empty() {
                    return Err("models: 模型列表格式无效".to_string());
                }
                Ok(id.to_owned())
            })
            .collect::<Result<Vec<_>, _>>()?;
        let next = value
            .get("nextPageToken")
            .map(model_id)
            .transpose()?
            .map(str::to_owned);
        return Ok((ids, next));
    }
    let data = value
        .get("data")
        .and_then(Value::as_array)
        .ok_or("models: 模型列表格式无效")?;
    if data.len() > MAX_MODELS {
        return Err("models: 模型列表过大".into());
    }
    let ids = data
        .iter()
        .map(|item| model_id(&item["id"]).map(str::to_owned))
        .collect::<Result<Vec<_>, _>>()?;
    let next = if protocol == Protocol::Anthropic {
        match value.get("has_more").and_then(Value::as_bool) {
            Some(false) => None,
            Some(true) if !ids.is_empty() => Some(model_id(&value["last_id"])?.to_owned()),
            _ => return Err("models: 模型分页格式无效".into()),
        }
    } else {
        None
    };
    Ok((ids, next))
}

/// GET-only discovery. Caller owns vault lookup; the helper never returns a key/body.
pub(crate) async fn discover_models(
    base_url: &str,
    protocol: Option<&str>,
    auth_mode: Option<&str>,
    secret: Option<&str>,
) -> Result<Vec<String>, String> {
    let (url, protocol, auth) = options(base_url, protocol, auth_mode)?;
    if auth == AuthMode::ApiKey && secret.is_none_or(|key| key.trim().is_empty()) {
        return Err("credential: 供应商凭据不可用".into());
    }
    let client = pinned_download_client(&url).await.map_err(str::to_owned)?;
    tokio::time::timeout(
        PROVIDER_REQUEST_TIMEOUT,
        discover_with_client(&client, url, protocol, auth, secret),
    )
    .await
    .map_err(|_| "models: 模型列表读取超时")?
}

async fn discover_with_client(
    client: &Client,
    mut url: reqwest::Url,
    protocol: Protocol,
    auth: AuthMode,
    secret: Option<&str>,
) -> Result<Vec<String>, String> {
    let path = format!("{}/models", url.path().trim_end_matches('/'));
    url.set_path(&path);
    let mut seen = HashSet::new();
    let mut cursors = HashSet::new();
    let mut models = Vec::new();
    let mut received = 0usize;
    for _ in 0..MAX_MODEL_PAGES {
        let response = authentication(
            client
                .get(url.clone())
                .header(header::ACCEPT, "application/json"),
            protocol,
            auth,
            secret,
        )?
        .send()
        .await
        .map_err(|_| "models: 无法读取供应商模型列表")?;
        if !response.status().is_success() {
            return Err(format!(
                "models: 供应商拒绝了模型列表请求 (HTTP {})",
                response.status().as_u16()
            ));
        }
        if response
            .content_length()
            .is_some_and(|size| size > MAX_MODELS_BODY_BYTES as u64)
        {
            return Err("models: 模型列表过大".into());
        }
        let mut body = Vec::new();
        let mut stream = response.bytes_stream();
        while let Some(chunk) = stream.next().await {
            let chunk = chunk.map_err(|_| "models: 模型列表读取中断")?;
            received = received.saturating_add(chunk.len());
            if received > MAX_MODELS_BODY_BYTES {
                return Err("models: 模型列表过大".into());
            }
            append_bounded_chunk(&mut body, &chunk, MAX_MODELS_BODY_BYTES)
                .map_err(|_| "models: 模型列表过大")?;
        }
        let value: Value = serde_json::from_slice(&body).map_err(|_| "models: 模型列表格式无效")?;
        let (ids, next) = model_page(&value, protocol)?;
        for id in ids {
            if seen.insert(id.clone()) {
                models.push(id);
            }
            if models.len() > MAX_MODELS {
                return Err("models: 模型列表过大".into());
            }
        }
        let Some(cursor) = next else {
            return Ok(models);
        };
        if !cursors.insert(cursor.clone()) {
            return Err("models: 模型分页游标重复".into());
        }
        let mut query = url.query_pairs_mut();
        query.clear();
        if protocol == Protocol::Gemini {
            query.append_pair("pageToken", &cursor);
        } else {
            query
                .append_pair("limit", "100")
                .append_pair("after_id", &cursor);
        }
    }
    Err("models: 模型分页超过读取上限".into())
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn serve_pages(pages: Vec<String>) -> (String, tokio::task::JoinHandle<Vec<String>>) {
        use tokio::io::{AsyncReadExt, AsyncWriteExt};
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let base = format!("http://{}/v1", listener.local_addr().unwrap());
        let server = tokio::spawn(async move {
            let mut requests = Vec::new();
            for body in pages {
                let (mut socket, _) = listener.accept().await.unwrap();
                let mut bytes = Vec::new();
                loop {
                    let mut buffer = [0; 1024];
                    let size = socket.read(&mut buffer).await.unwrap();
                    assert!(size > 0 && bytes.len() + size <= 16_384);
                    bytes.extend_from_slice(&buffer[..size]);
                    if bytes.windows(4).any(|value| value == b"\r\n\r\n") {
                        break;
                    }
                }
                requests.push(String::from_utf8(bytes).unwrap().to_lowercase());
                let reply = format!("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nConnection: close\r\nContent-Length: {}\r\n\r\n{}", body.len(), body);
                socket.write_all(reply.as_bytes()).await.unwrap();
            }
            requests
        });
        (base, server)
    }

    #[tokio::test]
    async fn gemini_discovery_preserves_auth_and_bounds_pagination() {
        let (base, server) = serve_pages(vec![
            json!({"models":[{"name":"models/fixture-a"}],"nextPageToken":"next-page"}).to_string(),
            json!({"models":[{"name":"models/fixture-b"}]}).to_string(),
        ])
        .await;
        let models = discover_models(
            &base,
            Some("gemini"),
            Some("api-key"),
            Some("fixture-secret"),
        )
        .await
        .unwrap();
        assert_eq!(models, vec!["fixture-a", "fixture-b"]);
        let requests = server.await.unwrap();
        assert!(requests[1].starts_with("get /v1/models?pagetoken=next-page http/1.1"));
        assert!(requests
            .iter()
            .all(|request| request.contains("x-goog-api-key: fixture-secret")
                && !request.lines().next().unwrap().contains("fixture-secret")));
    }

    #[tokio::test]
    async fn local_discovery_is_get_only_and_sends_no_key() {
        let (base, server) =
            serve_pages(vec![json!({"data":[{"id":"fixture-local"}]}).to_string()]).await;
        let models = discover_models(&base, Some("ollama"), Some("none"), None)
            .await
            .unwrap();
        assert_eq!(models, vec!["fixture-local"]);
        let requests = server.await.unwrap();
        assert!(requests[0].starts_with("get /v1/models http/1.1\r\n"));
        assert!(!requests[0].contains("authorization:") && !requests[0].contains("api-key:"));
    }

    #[tokio::test]
    async fn anthropic_discovery_pages_and_rejects_cursor_loops() {
        let page =
            json!({"data":[{"id":"fixture-claude"}],"has_more":true,"last_id":"fixture-claude"})
                .to_string();
        let (base, server) = serve_pages(vec![page.clone(), page]).await;
        let error = discover_models(
            &base,
            Some("anthropic"),
            Some("api-key"),
            Some("fixture-secret"),
        )
        .await
        .unwrap_err();
        assert!(error.contains("游标重复"));
        let requests = server.await.unwrap();
        assert!(requests[0].contains("x-api-key: fixture-secret\r\n"));
        assert!(requests[0].contains("anthropic-version: 2023-06-01\r\n"));
        assert!(requests[1].starts_with("get /v1/models?limit=100&after_id=fixture-claude "));
        assert!(requests.iter().all(|request| request.starts_with("get ")));
    }

    #[test]
    fn none_is_strictly_local_and_protocol_limited() {
        for base in [
            "http://localhost:11434/v1",
            "http://127.0.0.1:11434/v1",
            "http://[::1]:11434/v1",
        ] {
            assert_eq!(
                validate_provider_options(base, Some("ollama"), Some("none")),
                Ok(false)
            );
        }
        for base in [
            "http://127.0.0.2:11434/v1",
            "https://provider.test/v1",
            "http://192.168.1.1/v1",
            "https://localhost.evil.test/v1",
        ] {
            assert!(validate_provider_options(base, Some("ollama"), Some("none")).is_err());
        }
        assert!(validate_provider_options(
            "http://127.0.0.1:1234/v1",
            Some("anthropic"),
            Some("none")
        )
        .is_err());
        assert!(
            validate_provider_options("https://provider.test/v1", Some("unknown"), None).is_err()
        );
        assert!(
            validate_provider_options("https://provider.test/v1", None, Some("unknown")).is_err()
        );
        assert!(validate_provider_options(
            "https://resource.openai.azure.com/v1",
            Some("azure-openai"),
            None
        )
        .is_err());
    }

    fn request(protocol: &str, auth: &str, base_url: &str) -> TaskHostRequest {
        serde_json::from_value(json!({"taskId":"protocol-request","idempotencyKey":"protocol-idem","baseUrl":base_url,"credentialRef":"fixture","model":"deployment-name","prompt":"hello","outputIndices":[0],"kind":"text","protocol":protocol,"authMode":auth})).unwrap()
    }

    #[test]
    fn request_routes_and_fixed_auth_headers_are_explicit() {
        let client = Client::new();
        for (protocol, base, endpoint, key_header) in [
            (
                "openai-chat",
                "https://provider.test/v1",
                "/v1/chat/completions",
                "authorization",
            ),
            (
                "openai-responses",
                "https://provider.test/v1",
                "/v1/responses",
                "authorization",
            ),
            (
                "anthropic",
                "https://provider.test/v1",
                "/v1/messages",
                "x-api-key",
            ),
            (
                "azure-openai",
                "https://resource.openai.azure.com/openai/v1",
                "/openai/v1/chat/completions",
                "api-key",
            ),
        ] {
            let (builder, _) = text_request(
                &client,
                &request(protocol, "api-key", base),
                "fixture-secret",
            )
            .unwrap();
            let built = builder.build().unwrap();
            assert_eq!(built.url().path(), endpoint);
            assert!(built.headers().contains_key(key_header));
            if key_header != "authorization" {
                assert!(!built.headers().contains_key("authorization"));
            }
            let body: Value =
                serde_json::from_slice(built.body().unwrap().as_bytes().unwrap()).unwrap();
            assert_eq!(body["model"], "deployment-name");
            if protocol == "anthropic" {
                assert_eq!(built.headers()["anthropic-version"], "2023-06-01");
                assert_eq!(body["max_tokens"], ANTHROPIC_MAX_TOKENS);
            }
            if protocol == "openai-responses" {
                assert_eq!(body["store"], false);
                assert!(body.get("input").is_some());
            }
        }
        let (builder, _) = text_request(
            &client,
            &request("ollama", "none", "http://127.0.0.1:11434/v1"),
            "",
        )
        .unwrap();
        assert!(!builder
            .build()
            .unwrap()
            .headers()
            .contains_key("authorization"));
    }

    #[test]
    fn model_pages_are_bounded_and_use_anthropic_cursor() {
        let page =
            json!({"data":[{"id":"claude-fixture"}],"has_more":true,"last_id":"claude-fixture"});
        assert_eq!(
            model_page(&page, Protocol::Anthropic).unwrap(),
            (vec!["claude-fixture".into()], Some("claude-fixture".into()))
        );
        assert!(model_page(&json!({"data":[{"id":"secret\n"}]}), Protocol::Chat).is_err());
        assert!(model_page(
            &json!({"data":[{"id":"x".repeat(MAX_MODEL + 1)}]}),
            Protocol::Chat
        )
        .is_err());
        assert!(model_page(
            &json!({"data":[],"has_more":true,"last_id":"loop"}),
            Protocol::Anthropic
        )
        .is_err());
    }
}
