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
fn optional_strings(value: &Value, fields: &[&str]) -> Result<(), String> {
    for field in fields {
        if value.get(field).is_some_and(|v| !v.is_string()) {
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
        &["prompt", "model", "kind", "approvalMode", "privacyMode"],
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
    match value["version"].as_u64() {
        Some(2) => (),
        Some(_) => return Err("unsupported: 项目快照版本不受支持，已保留原文件".to_string()),
        None => return Err(corrupt("version")),
    }
    if !value["revision"]
        .as_u64()
        .is_some_and(|r| r <= 9_007_199_254_740_991)
    {
        return Err(corrupt("revision"));
    }
    reject_secrets(value)?;
    let projects = array(&value["projects"], "projects")?;
    let project_ids = unique_ids(projects, "projects")?;
    match value.get("activeProjectId") {
        Some(Value::Null) => (),
        Some(Value::String(active)) if project_ids.contains(active.as_str()) => (),
        _ => return Err(corrupt("activeProjectId")),
    }
    // Absent additive v2 fields are defaulted by the UI; malformed present fields fail.
    if let Some(home) = value.get("homeDraft") {
        draft(home)?;
    }
    for project in projects {
        optional_strings(project, &["name", "prompt", "model", "kind"])?;
        attachments(project)?;
        let items = array(&project["items"], "items")?;
        let node_ids = unique_ids(items, "items")?;
        for item in items {
            if !item["title"].is_string() || !item["description"].is_string() {
                return Err(corrupt("items"));
            }
            optional_strings(item, &["kind", "prompt", "model"])?;
        }
        let tasks = optional_arrays(project, "tasks")?;
        unique_ids(tasks, "tasks")?;
        for task in tasks {
            optional_strings(task, &["prompt", "model", "status", "kind"])?;
            optional_ids(task, &["sourceItemId"])?;
            task_submission(task)?;
            attachments(task)?;
        }
        let messages = optional_arrays(project, "messages")?;
        unique_ids(messages, "messages")?;
        for message in messages {
            if !message["content"].is_string()
                || !matches!(message["role"].as_str(), Some("user" | "system"))
            {
                return Err(corrupt("messages"));
            }
        }
        for field in ["favoriteIds", "likedIds"] {
            for entry in optional_arrays(project, field)? {
                id(entry, field)?;
            }
        }
        if let Some(composer) = project.get("composerDraft") {
            draft(composer)?;
        }
        if let Some(canvas) = project.get("canvas") {
            validate_canvas(canvas, &node_ids)?;
        }
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
    match value {
        Value::Object(map) => {
            for (key, child) in map {
                if [
                    "api_key",
                    "apikey",
                    "access_token",
                    "accesstoken",
                    "oauth_token",
                    "oauthtoken",
                    "refresh_token",
                    "refreshtoken",
                ]
                .iter()
                .any(|secret| key.eq_ignore_ascii_case(secret))
                {
                    return Err(corrupt("快照不能包含 API Key 或访问令牌"));
                }
                reject_secrets(child)?;
            }
        }
        Value::Array(values) => {
            for child in values {
                reject_secrets(child)?;
            }
        }
        _ => (),
    }
    Ok(())
}
