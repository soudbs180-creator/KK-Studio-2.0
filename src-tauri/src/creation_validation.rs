use crate::secret_filter;
use serde_json::{Map, Value};
use std::collections::HashSet;

fn corrupt(field: &str) -> String {
    format!("corrupt: 项目快照字段 {field} 无效，已保留原文件")
}
fn object<'a>(value: &'a Value, field: &str) -> Result<&'a Map<String, Value>, String> {
    value.as_object().ok_or_else(|| corrupt(field))
}
fn array<'a>(value: &'a Value, field: &str) -> Result<&'a Vec<Value>, String> {
    value.as_array().ok_or_else(|| corrupt(field))
}
fn id<'a>(value: &'a Value, field: &str) -> Result<&'a str, String> {
    value
        .as_str()
        .filter(|s| !s.trim().is_empty() && s.chars().count() <= 160)
        .ok_or_else(|| corrupt(field))
}
fn number(value: &Value, field: &str) -> Result<f64, String> {
    value
        .as_f64()
        .filter(|n| n.is_finite())
        .ok_or_else(|| corrupt(field))
}
fn optional_timestamp(value: &Value, field: &str) -> Result<(), String> {
    if let Some(value) = value.get(field) {
        if !value.as_u64().is_some_and(|n| n <= 9_007_199_254_740_991) {
            return Err(corrupt(field));
        }
    }
    Ok(())
}
fn project_groups(value: &Value, projects: &[Value]) -> Result<(), String> {
    let groups = optional_arrays(value, "projectGroups")?;
    unique_ids(groups, "projectGroups")?;
    for group in groups {
        let fields = object(group, "projectGroups")?;
        if fields
            .keys()
            .any(|key| !["id", "name", "deletedAt"].contains(&key.as_str()))
            || !group["name"]
                .as_str()
                .is_some_and(|name| !name.trim().is_empty() && name.encode_utf16().count() <= 120)
        {
            return Err(corrupt("projectGroups"));
        }
        optional_timestamp(group, "deletedAt")?;
    }
    for project in projects {
        optional_enum(project, "nameSource", &["auto", "manual"])?;
        optional_timestamp(project, "trashedAt")?;
        if let Some(group_id) = project.get("groupId") {
            let group_id = id(group_id, "groupId")?;
            if !groups.iter().any(|group| {
                group["id"].as_str() == Some(group_id) && group.get("deletedAt").is_none()
            }) {
                return Err(corrupt("groupId"));
            }
        }
    }
    Ok(())
}
fn sidebar_preferences(value: &Value, project_ids: &HashSet<&str>) -> Result<(), String> {
    let Some(preferences) = value.get("sidebarPreferences") else {
        return Ok(());
    };
    let fields = object(preferences, "sidebarPreferences")?;
    if fields
        .keys()
        .any(|key| !["sortMode", "pinnedProjectIds", "pinnedGroupIds"].contains(&key.as_str()))
        || !preferences["sortMode"]
            .as_str()
            .is_some_and(|mode| ["manual", "recent", "priority"].contains(&mode))
    {
        return Err(corrupt("sidebarPreferences"));
    }
    let groups = optional_arrays(value, "projectGroups")?;
    let group_ids = unique_ids(groups, "projectGroups")?;
    for (field, allowed_ids) in [
        ("pinnedProjectIds", project_ids),
        ("pinnedGroupIds", &group_ids),
    ] {
        let mut seen = HashSet::new();
        for entry in array(&preferences[field], field)? {
            let entry = id(entry, field)?;
            if entry.encode_utf16().count() > 160
                || !seen.insert(entry)
                || !allowed_ids.contains(entry)
            {
                return Err(corrupt(field));
            }
        }
    }
    Ok(())
}
fn optional_strings(value: &Value, fields: &[&str]) -> Result<(), String> {
    for field in fields {
        if value.get(field).is_some_and(|v| !v.is_string()) {
            return Err(corrupt(field));
        }
    }
    Ok(())
}
pub(crate) fn labels(value: &Value, field: &str) -> Result<(), String> {
    let Some(value) = value.get(field) else {
        return Ok(());
    };
    let entries = array(value, field)?;
    if entries.len() > 32 {
        return Err(corrupt(field));
    }
    let mut seen = HashSet::new();
    for entry in entries {
        let label = entry.as_str().ok_or_else(|| corrupt(field))?;
        if label.is_empty()
            || label.trim() != label
            || label.encode_utf16().count() > 40
            || !seen.insert(label)
        {
            return Err(corrupt(field));
        }
    }
    Ok(())
}
fn optional_ids(value: &Value, fields: &[&str]) -> Result<(), String> {
    for field in fields {
        if let Some(candidate) = value.get(field) {
            id(candidate, field)?;
        }
    }
    Ok(())
}
fn optional_enum(value: &Value, field: &str, options: &[&str]) -> Result<(), String> {
    if let Some(candidate) = value.get(field) {
        if !candidate
            .as_str()
            .is_some_and(|entry| options.contains(&entry))
        {
            return Err(corrupt(field));
        }
    }
    Ok(())
}
fn provider_routing(value: &Value) -> Result<(), String> {
    optional_enum(
        value,
        "providerProtocol",
        &[
            "openai-chat",
            "openai-responses",
            "anthropic",
            "azure-openai",
            "ollama",
        ],
    )?;
    optional_enum(value, "providerAuthMode", &["api-key", "none"])?;
    if value.get("providerAuthMode").and_then(Value::as_str) == Some("none") {
        let base = value
            .get("providerBaseUrl")
            .and_then(Value::as_str)
            .ok_or_else(|| corrupt("providerBaseUrl"))?;
        crate::task_host::validate_provider_options(
            base,
            value.get("providerProtocol").and_then(Value::as_str),
            Some("none"),
        )
        .map_err(|_| corrupt("providerAuthMode"))?;
    }
    Ok(())
}

fn task_submission(value: &Value) -> Result<(), String> {
    optional_enum(
        value,
        "submissionState",
        &["intent", "submitted", "unknown", "terminal"],
    )?;
    if let Some(submitted_at) = value.get("submittedAt") {
        let submitted_at = number(submitted_at, "submittedAt")?;
        if !(0.0..=9_007_199_254_740_991.0).contains(&submitted_at) || submitted_at.fract() != 0.0 {
            return Err(corrupt("submittedAt"));
        }
    }
    optional_enum(
        value,
        "status",
        &[
            "queued",
            "running",
            "unknown",
            "partial",
            "succeeded",
            "failed",
            "cancelled",
            "offline",
            "interrupted",
        ],
    )?;
    for output in optional_arrays(value, "outputs")? {
        object(output, "outputs")?;
        optional_enum(
            output,
            "status",
            &[
                "waiting",
                "running",
                "unknown",
                "succeeded",
                "failed",
                "cancelled",
            ],
        )?;
    }
    Ok(())
}
fn optional_arrays<'a>(value: &'a Value, field: &str) -> Result<&'a [Value], String> {
    match value.get(field) {
        None => Ok(&[]),
        Some(v) => array(v, field).map(Vec::as_slice),
    }
}
fn unique_ids<'a>(values: &'a [Value], field: &str) -> Result<HashSet<&'a str>, String> {
    let mut ids = HashSet::new();
    for value in values {
        object(value, field)?;
        if !ids.insert(id(&value["id"], field)?) {
            return Err(corrupt(&format!("{field} 包含重复 ID")));
        }
    }
    Ok(ids)
}
fn attachments(value: &Value) -> Result<(), String> {
    let values = optional_arrays(value, "attachments")?;
    unique_ids(values, "attachments")?;
    for attachment in values {
        for field in ["name", "mime"] {
            if !attachment[field].is_string() {
                return Err(corrupt(field));
            }
        }
        if number(&attachment["size"], "size")? < 0.0 {
            return Err(corrupt("size"));
        }
    }
    Ok(())
}
fn draft(value: &Value) -> Result<(), String> {
    object(value, "draft")?;
    optional_strings(
        value,
        &[
            "prompt",
            "text",
            "model",
            "kind",
            "approvalMode",
            "privacyMode",
        ],
    )?;
    attachments(value)?;
    for field in ["updatedAt", "outputCount"] {
        if let Some(n) = value.get(field) {
            number(n, field)?;
        }
    }
    Ok(())
}
pub fn validate(value: &Value) -> Result<(), String> {
    object(value, "snapshot")?;
    let version = match value["version"].as_u64() {
        Some(2) => 2,
        Some(3) => 3,
        Some(_) => return Err("unsupported: 项目快照版本不受支持，已保留原文件".to_string()),
        None => return Err(corrupt("version")),
    };
    if !value["revision"]
        .as_u64()
        .is_some_and(|r| r <= 9_007_199_254_740_991)
    {
        return Err(corrupt("revision"));
    }
    reject_secrets(value)?;
    let projects = array(&value["projects"], "projects")?;
    let project_ids = unique_ids(projects, "projects")?;
    project_groups(value, projects)?;
    sidebar_preferences(value, &project_ids)?;
    match value.get("activeProjectId") {
        Some(Value::Null) => (),
        Some(Value::String(active)) if project_ids.contains(active.as_str()) => (),
        _ => return Err(corrupt("activeProjectId")),
    }
    // Absent additive fields are defaulted by the UI; malformed present fields fail.
    if let Some(home) = value.get("homeDraft") {
        draft(home)?;
    }
    let mut threads = HashSet::new();
    for project in projects {
        validate_project(project, version)?;
        if version == 3 {
            for chat in project["chats"]
                .as_object()
                .ok_or_else(|| corrupt("chats"))?
                .values()
            {
                if let Some(thread) = chat["agentThreadId"].as_str() {
                    if !threads.insert(thread) {
                        return Err(corrupt("多个聊天不能共享同一 Agent 线程"));
                    }
                }
            }
        }
    }
    Ok(())
}

fn image_archive_receipts(project: &Value) -> Result<(), String> {
    let Some(value) = project.get("imageArchiveReceipts") else {
        return Ok(());
    };
    let receipts = object(value, "imageArchiveReceipts")?;
    let lower_hex = |value: &str| {
        value
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
    };
    if receipts.len() > 10000 {
        return Err(corrupt("imageArchiveReceipts"));
    }
    for (key, receipt) in receipts {
        object(receipt, "imageArchiveReceipts")?;
        let valid_key = key
            .strip_prefix("chatgpt-")
            .is_some_and(|hash| hash.len() == 32 && lower_hex(hash));
        let valid_job = receipt["jobId"].as_str().is_some_and(|job| {
            (1..=120).contains(&job.len())
                && job
                    .bytes()
                    .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-'))
        });
        let valid_hash = receipt["sha256"].as_str().is_some_and(|hash| {
            hash.len() == 64
                && lower_hex(hash)
                && receipt["assetId"].as_str() == Some(format!("asset-{}", &hash[..24]).as_str())
        });
        let valid_chat = receipt.get("chatId").is_some_and(|chat| {
            chat.is_null()
                || chat
                    .as_str()
                    .is_some_and(|id| !id.is_empty() && id.encode_utf16().count() <= 160)
        });
        if !(valid_key && valid_job && valid_hash && valid_chat) {
            return Err(corrupt("imageArchiveReceipts"));
        }
    }
    Ok(())
}

fn validate_project(project: &Value, version: u64) -> Result<(), String> {
    object(project, "project")?;
    id(&project["id"], "project.id")?;
    labels(project, "customTags")?;
    image_archive_receipts(project)?;
    provider_routing(project)?;
    optional_strings(project, &["name", "prompt", "model", "kind"])?;
    attachments(project)?;
    let items = array(&project["items"], "items")?;
    let node_ids = unique_ids(items, "items")?;
    for item in items {
        labels(item, "tags")?;
        if !item["title"].is_string() || !item["description"].is_string() {
            return Err(corrupt("items"));
        }
        optional_strings(item, &["kind", "prompt", "model"])?;
    }
    let tasks = optional_arrays(project, "tasks")?;
    unique_ids(tasks, "tasks")?;
    for task in tasks {
        optional_strings(task, &["prompt", "model", "status", "kind"])?;
        optional_ids(task, &["sourceItemId", "originChatId"])?;
        task_submission(task)?;
        provider_routing(task)?;
        attachments(task)?;
    }
    for field in ["favoriteIds", "likedIds"] {
        for entry in optional_arrays(project, field)? {
            id(entry, field)?;
        }
    }
    if let Some(canvas) = project.get("canvas") {
        validate_canvas(canvas, &node_ids)?;
    }

    if version == 3 {
        validate_v3_chats(project)?;
    } else {
        validate_v2_messages_and_draft(project)?;
    }
    Ok(())
}

fn validate_v2_messages_and_draft(project: &Value) -> Result<(), String> {
    let messages = optional_arrays(project, "messages")?;
    unique_ids(messages, "messages")?;
    for message in messages {
        if !message["content"].is_string()
            || !matches!(
                message["role"].as_str(),
                Some("user" | "system" | "assistant")
            )
        {
            return Err(corrupt("messages"));
        }
    }
    if let Some(composer) = project.get("composerDraft") {
        draft(composer)?;
    }
    Ok(())
}

fn validate_v3_chats(project: &Value) -> Result<(), String> {
    let active_chat_id = id(&project["activeChatId"], "activeChatId")?;
    let chats = object(&project["chats"], "chats")?;
    if !chats.contains_key(active_chat_id) {
        return Err(corrupt("activeChatId 在 chats 中不存在"));
    }
    for (chat_key, chat_val) in chats {
        let chat_obj = object(chat_val, "chat")?;
        let chat_id = id(&chat_obj["id"], "chat.id")?;
        if chat_obj
            .get("isTemporary")
            .is_some_and(|value| value != &Value::Bool(false))
        {
            return Err(corrupt("临时聊天尚不能持久化"));
        }
        if chat_id != chat_key {
            return Err(corrupt("chat key 与 chat.id 不匹配"));
        }
        if !chat_obj.get("name").is_some_and(|n| n.is_string()) {
            return Err(corrupt("chat.name"));
        }
        for time_field in ["createdAt", "updatedAt"] {
            if let Some(t_val) = chat_obj.get(time_field) {
                let t = number(t_val, time_field)?;
                if !(0.0..=9_007_199_254_740_991.0).contains(&t) || t.fract() != 0.0 {
                    return Err(corrupt(time_field));
                }
            }
        }
        if let Some(main_agent) = chat_obj.get("mainAgent") {
            if !main_agent.as_str().is_some_and(|s| !s.trim().is_empty()) {
                return Err(corrupt("chat.mainAgent"));
            }
        }
        if let Some(allowlist_val) = chat_obj.get("modelAllowlist") {
            let allowlist = array(allowlist_val, "chat.modelAllowlist")?;
            if allowlist.len() > 64 {
                return Err(corrupt("chat.modelAllowlist 超出长度限制"));
            }
            for model_id in allowlist {
                if !model_id
                    .as_str()
                    .is_some_and(|s| !s.trim().is_empty() && s.chars().count() <= 120)
                {
                    return Err(corrupt("chat.modelAllowlist 条目无效"));
                }
            }
        }
        if let Some(chat_draft) = chat_obj.get("draft") {
            draft(chat_draft)?;
        }
        if let Some(messages_val) = chat_obj.get("messages") {
            let messages = array(messages_val, "chat.messages")?;
            unique_ids(messages, "chat.messages")?;
            for message in messages {
                if !message["content"].is_string()
                    || !matches!(
                        message["role"].as_str(),
                        Some("user" | "assistant" | "system" | "tool" | "error")
                    )
                {
                    return Err(corrupt("chat.messages"));
                }
                optional_ids(message, &["taskId"])?;
                attachments(message)?;
                if let Some(created_at) = message.get("createdAt") {
                    number(created_at, "createdAt")?;
                }
            }
        }
        optional_ids(chat_val, &["originChatId"])?;
        if let Some(thread) = chat_obj.get("agentThreadId") {
            if !thread.as_str().is_some_and(|id| {
                (1..=160).contains(&id.len())
                    && id
                        .bytes()
                        .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'_' | b'-'))
            }) {
                return Err(corrupt("chat.agentThreadId"));
            }
        }
        if let Some(gc) = chat_obj.get("googleConversation") {
            object(gc, "googleConversation")?;
        }
    }
    // Also validate optional legacy messages and composerDraft if present during transition
    if let Some(messages_val) = project.get("messages") {
        let messages = array(messages_val, "messages")?;
        unique_ids(messages, "messages")?;
        for message in messages {
            if !message["content"].is_string()
                || !matches!(
                    message["role"].as_str(),
                    Some("user" | "assistant" | "system" | "tool" | "error")
                )
            {
                return Err(corrupt("messages"));
            }
        }
    }
    if let Some(composer) = project.get("composerDraft") {
        draft(composer)?;
    }
    Ok(())
}
fn validate_canvas(canvas: &Value, node_ids: &HashSet<&str>) -> Result<(), String> {
    object(canvas, "canvas")?;
    match canvas["version"].as_u64() {
        Some(1) => (),
        Some(_) => return Err("unsupported: 项目 canvas 版本不受支持，已保留原文件".to_string()),
        None => return Err(corrupt("canvas.version")),
    }
    let positions = object(&canvas["positions"], "canvas.positions")?;
    if positions.len() != node_ids.len() {
        return Err(corrupt("canvas.positions 与节点不匹配"));
    }
    for (node_id, position) in positions {
        if !node_ids.contains(node_id.as_str()) {
            return Err(corrupt("canvas.positions 引用未知节点"));
        }
        number(&position["x"], "canvas.x")?;
        number(&position["y"], "canvas.y")?;
    }
    let edges = array(&canvas["edges"], "canvas.edges")?;
    unique_ids(edges, "canvas.edges")?;
    let mut pairs = HashSet::new();
    for edge in edges {
        for endpoint in ["source", "target"] {
            if !node_ids.contains(id(&edge[endpoint], endpoint)?) {
                return Err(corrupt("canvas.edges 引用未知节点"));
            }
        }
        let source = id(&edge["source"], "source")?;
        let target = id(&edge["target"], "target")?;
        if source == target || !pairs.insert((source, target)) {
            return Err(corrupt("canvas.edges 重复或自连接"));
        }
        if edge
            .get("kind")
            .is_some_and(|kind| !matches!(kind.as_str(), Some("reference" | "result")))
        {
            return Err(corrupt("canvas.edges.kind"));
        }
    }
    let viewport = &canvas["viewport"];
    number(&viewport["x"], "viewport.x")?;
    number(&viewport["y"], "viewport.y")?;
    if !(0.2..=4.0).contains(&number(&viewport["scale"], "viewport.scale")?) {
        return Err(corrupt("viewport.scale"));
    }
    Ok(())
}
fn reject_secrets(value: &Value) -> Result<(), String> {
    secret_filter::reject_secrets(value, &|| corrupt("快照不能包含 API Key 或访问令牌"))
}
