use super::*;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextMessage {
    pub role: String,
    pub content: String,
}

pub(super) fn validate(request: &TaskHostRequest) -> Result<(), String> {
    if !matches!(
        request.protocol.as_deref(),
        None | Some("openai-compatible" | "anthropic-messages" | "gemini")
    ) || !matches!(
        request.auth_mode.as_deref(),
        None | Some("api_key" | "none")
    ) {
        return Err("invalid: text protocol/authMode".into());
    }
    if request.kind.as_deref() != Some("text")
        && (request.protocol.is_some() || request.auth_mode.is_some() || request.messages.is_some())
    {
        return Err("invalid: text routing on image request".into());
    }
    if request.auth_mode.as_deref() == Some("none") && !strict_loopback(&request.base_url) {
        return Err("invalid: unauthenticated provider must be loopback".into());
    }
    if let Some(messages) = &request.messages {
        if messages.is_empty()
            || messages.len() > 32
            || messages.last().is_none_or(|m| m.role != "user")
            || messages.iter().any(|m| {
                !matches!(m.role.as_str(), "user" | "assistant" | "system")
                    || m.content.trim().is_empty()
            })
            || messages.iter().map(|m| m.content.len()).sum::<usize>() > 64 * 1024
        {
            return Err("invalid: text messages".into());
        }
    }
    Ok(())
}
pub(super) fn capacity_identity(request: &TaskHostRequest) -> String {
    if request.auth_mode.as_deref() == Some("none") && request.credential_ref.is_empty() {
        format!(
            "local-{:x}",
            Sha256::digest(request.base_url.trim_end_matches('/').as_bytes())
        )
    } else {
        request.credential_ref.clone()
    }
}

fn strict_loopback(value: &str) -> bool {
    let Some((scheme, rest)) = value.split_once("://") else {
        return false;
    };
    if !matches!(scheme.to_ascii_lowercase().as_str(), "http" | "https") {
        return false;
    }
    let authority = rest.split('/').next().unwrap_or("");
    let host = if authority.starts_with('[') {
        authority
            .split(']')
            .next()
            .map(|v| format!("{}]", v))
            .unwrap_or_default()
    } else {
        authority.split(':').next().unwrap_or("").to_string()
    };
    matches!(
        host.to_ascii_lowercase().as_str(),
        "localhost" | "127.0.0.1" | "[::1]"
    )
}

pub(super) fn request_parts(request: &TaskHostRequest) -> Result<(reqwest::Url, Value), String> {
    let mut url = reqwest::Url::parse(&request.base_url).map_err(|_| "invalid: baseUrl")?;
    let prefix = url.path().trim_end_matches('/').to_owned();
    let messages: Vec<TextMessage> = request.messages.clone().unwrap_or_else(|| {
        vec![TextMessage {
            role: "user".into(),
            content: request.prompt.clone(),
        }]
    });
    let system = messages
        .iter()
        .filter(|m| m.role == "system")
        .map(|m| m.content.as_str())
        .collect::<Vec<_>>()
        .join("\n\n");
    let chat = messages
        .iter()
        .filter(|m| m.role != "system")
        .collect::<Vec<_>>();
    match request.protocol.as_deref().unwrap_or("openai-compatible") {
        "anthropic-messages" => {
            url.set_path(&format!("{prefix}/messages"));
            let mut body =
                json!({"model":request.model,"messages":chat,"max_tokens":4096,"stream":true});
            if !system.is_empty() {
                body["system"] = json!(system);
            }
            Ok((url, body))
        }
        "gemini" => {
            let model = request
                .model
                .strip_prefix("models/")
                .unwrap_or(&request.model);
            if model.is_empty()
                || !model
                    .bytes()
                    .all(|c| c.is_ascii_alphanumeric() || b"._-".contains(&c))
            {
                return Err("invalid: Gemini model".into());
            }
            url.set_path(&format!("{prefix}/models/{model}:streamGenerateContent"));
            url.query_pairs_mut().append_pair("alt", "sse");
            let mut body = json!({"contents":chat.iter().map(|m|json!({"role":if m.role=="assistant" {"model"} else {"user"},"parts":[{"text":m.content}]})).collect::<Vec<_>>()});
            if !system.is_empty() {
                body["systemInstruction"] = json!({"parts":[{"text":system}]});
            }
            Ok((url, body))
        }
        _ => {
            url.set_path(&format!("{prefix}/chat/completions"));
            Ok((
                url,
                json!({"model":request.model,"messages":messages,"stream":true}),
            ))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn request(protocol: &str, auth: &str, base: &str) -> TaskHostRequest {
        serde_json::from_value(json!({"taskId":"chat-task","idempotencyKey":"idem","baseUrl":base,"credentialRef":"local","model":"chat","prompt":"next","kind":"text","outputIndices":[0],"protocol":protocol,"authMode":auth,"messages":[{"role":"system","content":"instructions"},{"role":"user","content":"first"},{"role":"assistant","content":"answer"},{"role":"user","content":"next"}]})).unwrap()
    }
    #[test]
    fn protocol_native_parts_preserve_history_and_system() {
        let (url, body) = request_parts(&request(
            "anthropic-messages",
            "api_key",
            "https://example.com/v1",
        ))
        .unwrap();
        assert_eq!(url.path(), "/v1/messages");
        assert_eq!(body["system"], "instructions");
        assert_eq!(body["messages"].as_array().unwrap().len(), 3);
        let (url, body) =
            request_parts(&request("gemini", "api_key", "https://example.com/v1beta")).unwrap();
        assert_eq!(url.query(), Some("alt=sse"));
        assert_eq!(body["contents"][1]["role"], "model");
    }
    #[test]
    fn none_auth_is_only_explicit_canonical_loopback() {
        for base in [
            "HTTP://LOCALHOST:11434/v1",
            "http://localhost:11434/v1",
            "http://127.0.0.1:1234/v1",
            "http://[::1]:1234/v1",
        ] {
            assert!(validate(&request("openai-compatible", "none", base)).is_ok());
        }
        for base in [
            "https://example.com/v1",
            "http://127.1/v1",
            "http://2130706433/v1",
            "http://0x7f000001/v1",
            "http://localhost.evil/v1",
        ] {
            assert!(
                validate(&request("openai-compatible", "none", base)).is_err(),
                "{base}"
            );
        }
    }
    #[test]
    fn keyless_native_requests_do_not_require_a_dummy_vault_reference() {
        let mut value = request("openai-compatible", "none", "http://localhost:11434/v1");
        value.credential_ref.clear();
        assert!(validate_request(&value).is_ok());
        let identity = capacity_identity(&value);
        value.base_url = "http://localhost:1234/v1".into();
        assert_ne!(capacity_identity(&value), identity);
        value.auth_mode = None;
        assert!(validate_request(&value).is_err());
    }
}
