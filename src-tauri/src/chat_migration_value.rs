use serde_json::{json, Map, Value};
use std::collections::BTreeMap;

fn bad() -> String {
    "corrupt: 旧聊天字段无法完整迁移，原件已保留".into()
}
fn record(value: &Value) -> Map<String, Value> {
    value.as_object().cloned().unwrap_or_default()
}
fn truthy(value: &Value) -> bool {
    match value {
        Value::Null => false,
        Value::Bool(v) => *v,
        Value::String(s) => !s.is_empty(),
        Value::Number(n) => n.as_f64().is_some_and(|n| n != 0.0),
        _ => true,
    }
}
fn meaningful(value: &Value) -> bool {
    ["text", "prompt"]
        .iter()
        .any(|key| value[*key].as_str().is_some_and(|s| !s.is_empty()))
        || value["attachments"]
            .as_array()
            .is_some_and(|a| !a.is_empty())
        || truthy(&value["pendingAgent"])
}
fn timestamp(value: &Value, fallback: u64) -> u64 {
    value
        .as_u64()
        .filter(|n| *n <= 9_007_199_254_740_991)
        .unwrap_or(fallback)
}
fn legacy_provider_binding(source: &Value) -> Option<Value> {
    let exact_connection = source["providerConnectionId"]
        .as_str()
        .is_some_and(|id| !id.is_empty());
    let exact_credential = source["providerBaseUrl"]
        .as_str()
        .is_some_and(|url| !url.is_empty())
        && source["providerCredentialRef"]
            .as_str()
            .is_some_and(|reference| !reference.is_empty());
    if !exact_connection && !exact_credential {
        return None;
    }
    let binding = [
        "providerConnectionId",
        "providerBaseUrl",
        "providerCredentialRef",
        "providerProtocol",
        "providerAuthMode",
    ]
    .into_iter()
    .filter_map(|key| {
        source[key]
            .as_str()
            .map(|value| (key.to_string(), json!(value)))
    })
    .collect();
    Some(Value::Object(binding))
}
fn ensure<'a>(
    chats: &'a mut Map<String, Value>,
    ids: &mut BTreeMap<&'static str, String>,
    source: &'static str,
    created: u64,
    updated: u64,
) -> &'a mut Value {
    let id = ids.entry(source).or_insert_with(|| {
        let base = if source == "unknown" { "legacy-history".to_string() } else { format!("legacy-{source}") };
        let mut id = base.clone();
        let mut suffix = 2;
        while chats.contains_key(&id) { id = format!("{base}-{suffix}"); suffix += 1; }
        let name = match source { "codex" => "Codex 历史对话", "direct" => "对话记录", "google" => "Google 对话", _ => "旧消息，来源待核对" };
        let mut chat = json!({"id":id,"name":name,"createdAt":created,"updatedAt":updated,"draft":{},"messages":[],"mainAgent":if source == "unknown" {"direct"} else {source},"modelAllowlist":[],"legacySource":source});
        if source == "unknown" { chat["requiresReview"] = json!(true); }
        chats.insert(id.clone(), chat);
        id
    });
    chats.get_mut(id.as_str()).unwrap()
}
fn project(project: &Value) -> Result<Value, String> {
    let mut result = record(project);
    if project.get("chats").is_some_and(|v| !v.is_object()) {
        return Err(bad());
    }
    if let Some(chats) = project.get("chats").and_then(Value::as_object) {
        let active = project["activeChatId"].as_str().ok_or_else(bad)?;
        if chats.is_empty()
            || !chats.contains_key(active)
            || chats
                .iter()
                .any(|(key, chat)| chat["id"].as_str() != Some(key.as_str()))
        {
            return Err(bad());
        }
    } else if project.get("activeChatId").is_some() {
        return Err(bad());
    }
    if project.get("agentThreadId").is_some_and(|v| {
        !v.as_str().is_some_and(|id| {
            !id.is_empty()
                && id.len() <= 160
                && id
                    .bytes()
                    .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'_' | b'-'))
        })
    }) {
        return Err(bad());
    }
    let mut chats = record(&project["chats"]);
    let created = timestamp(&project["createdAt"], 0);
    let updated = timestamp(&project["updatedAt"], created);
    let mut ids = BTreeMap::new();
    if let Some(thread) = project["agentThreadId"].as_str() {
        ensure(&mut chats, &mut ids, "codex", created, updated)["agentThreadId"] = json!(thread);
    }
    if project
        .get("googleConversation")
        .is_some_and(|v| !v.is_object())
    {
        return Err(bad());
    }
    let mut google = record(&project["googleConversation"]);
    if !google.is_empty() {
        let messages = google.remove("messages");
        let chat = ensure(&mut chats, &mut ids, "google", created, updated);
        chat["googleConversation"] = Value::Object(google);
        if let Some(messages) = messages {
            let mut canonical = Vec::new();
            for message in messages.as_array().ok_or_else(bad)? {
                let mut record = record(message);
                if !message["id"].is_string()
                    || !matches!(
                        message["role"].as_str(),
                        Some("user" | "assistant" | "system" | "tool" | "error")
                    )
                {
                    return Err(bad());
                }
                let content = message["content"]
                    .as_str()
                    .or_else(|| message["text"].as_str())
                    .ok_or_else(bad)?;
                record.insert("content".into(), json!(content));
                canonical.push(Value::Object(record));
            }
            chat["messages"] = json!(canonical);
        }
    }
    if project.get("composerDraft").is_some_and(|v| !v.is_object()) {
        return Err(bad());
    }
    let draft = &project["composerDraft"];
    let draft_source = if meaningful(draft) {
        let source = if truthy(&draft["pendingAgent"]) {
            "codex"
        } else {
            match draft["conversationChannel"].as_str() {
                Some("codex") => "codex",
                Some("direct") => "direct",
                Some("google") => "google",
                _ if draft["modelSelection"]["source"] == "api" => "direct",
                _ => "unknown",
            }
        };
        ensure(&mut chats, &mut ids, source, created, updated)["draft"] = draft.clone();
        if let (Some(prompt), Some(text)) = (draft["prompt"].as_str(), draft["text"].as_str()) {
            if !prompt.is_empty() && !text.is_empty() && prompt != text {
                let origin = ids.get(source).unwrap().clone();
                let base = "legacy-draft-recovery";
                let mut id = base.to_string();
                let mut suffix = 2;
                while chats.contains_key(&id) {
                    id = format!("{base}-{suffix}");
                    suffix += 1;
                }
                let mut recovery = draft.clone();
                recovery["prompt"] = json!(text);
                recovery["text"] = json!(text);
                chats.insert(id.clone(), json!({"id":id,"name":"恢复草稿","createdAt":created,"updatedAt":updated,"draft":recovery,"messages":[],"mainAgent":"direct","modelAllowlist":[],"legacySource":"unknown","requiresReview":true,"originChatId":origin}));
            }
        }
        Some(source)
    } else {
        if draft.as_object().is_some_and(|draft| !draft.is_empty()) {
            if result
                .get("legacyComposerPreferences")
                .is_some_and(|v| v != draft)
            {
                return Err(bad());
            }
            result.insert("legacyComposerPreferences".into(), draft.clone());
        }
        None
    };
    let direct_draft_binding = if draft_source == Some("direct") {
        let mut route = project.clone();
        route["providerConnectionId"] = draft
            .get("providerConnectionId")
            .filter(|value| !value.is_null())
            .or_else(|| draft["modelSelection"].get("connectionId"))
            .cloned()
            .unwrap_or(Value::Null);
        legacy_provider_binding(&route)
    } else {
        None
    };
    if let Some(binding) = &direct_draft_binding {
        ensure(&mut chats, &mut ids, "direct", created, updated)["legacyProviderBinding"] =
            binding.clone();
    }
    for message in project["messages"]
        .as_array()
        .map(Vec::as_slice)
        .unwrap_or(&[])
    {
        let project_id = project["id"].as_str().ok_or_else(bad)?;
        let task = project["tasks"].as_array().and_then(|tasks| {
            tasks.iter().find(|task| {
                message["content"] == task["prompt"]
                    && (message["taskId"] == task["id"]
                        || message["id"].as_str()
                            == Some(
                                format!(
                                    "{project_id}-message-{}",
                                    task["id"].as_str().unwrap_or("")
                                )
                                .as_str(),
                            ))
            })
        });
        let root_card = project["items"].as_array().is_some_and(|items| {
            items.iter().any(|item| {
                item["id"].as_str() == Some(format!("{project_id}-prompt").as_str())
                    && item["generationSource"] == "codex"
                    && item["prompt"] == message["content"]
            })
        });
        let initial_codex = message["id"].as_str()
            == Some(format!("{project_id}-message").as_str())
            && message["content"] == project["prompt"]
            && (root_card
                || (truthy(&draft["pendingAgent"])
                    && matches!(
                        draft["modelSelection"]["source"].as_str(),
                        Some("codex" | "default")
                    )));
        ensure(
            &mut chats,
            &mut ids,
            if task.is_some() {
                "direct"
            } else if initial_codex {
                "codex"
            } else {
                "unknown"
            },
            created,
            updated,
        )["messages"]
            .as_array_mut()
            .unwrap()
            .push(message.clone());
        if direct_draft_binding.is_none() {
            if let Some(binding) = task.and_then(legacy_provider_binding) {
                ensure(&mut chats, &mut ids, "direct", created, updated)["legacyProviderBinding"] =
                    binding;
            }
        }
    }
    if chats.is_empty() {
        chats.insert("chat-default".into(), json!({"id":"chat-default","name":"默认对话","createdAt":created,"updatedAt":updated,"draft":{},"messages":[],"mainAgent":"codex","modelAllowlist":[]}));
    }
    let active = project["activeChatId"]
        .as_str()
        .filter(|id| chats.contains_key(*id))
        .map(str::to_string)
        .or_else(|| draft_source.and_then(|source| ids.get(source).cloned()))
        .or_else(|| {
            ["codex", "direct", "google", "unknown"]
                .iter()
                .find_map(|source| ids.get(source).cloned())
        })
        .unwrap_or_else(|| chats.keys().next().unwrap().clone());
    result.insert("chats".into(), Value::Object(chats));
    result.insert("activeChatId".into(), json!(active));
    for key in [
        "messages",
        "composerDraft",
        "agentThreadId",
        "googleConversation",
    ] {
        result.remove(key);
    }
    Ok(Value::Object(result))
}

pub(super) fn migrate(source: &Value) -> Result<Value, String> {
    crate::creation_storage::validate_snapshot_value(source)?;
    let revision = source["revision"].as_u64().ok_or_else(bad)?;
    let has_legacy = source["projects"]
        .as_array()
        .ok_or_else(bad)?
        .iter()
        .any(|p| {
            [
                "messages",
                "composerDraft",
                "agentThreadId",
                "googleConversation",
            ]
            .iter()
            .any(|field| p.get(*field).is_some())
        });
    if source["version"] == 3 && !has_legacy {
        return Ok(source.clone());
    }
    if revision >= 9_007_199_254_740_991 {
        return Err(bad());
    }
    let mut result = source.clone();
    result["version"] = json!(3);
    result["revision"] = json!(revision + 1);
    result["projects"] = Value::Array(
        source["projects"]
            .as_array()
            .ok_or_else(bad)?
            .iter()
            .map(project)
            .collect::<Result<Vec<_>, _>>()?,
    );
    crate::creation_storage::validate_snapshot_value(&result)?;
    Ok(result)
}
