//! Package-only validation of every field consumed by the current UI reader.
//! Missing additive fields may acquire defaults; supplied fields must survive
//! `normalizeCreationSnapshot` without truncation, replacement or removal.

use serde_json::Value;
use std::collections::HashSet;

const MAX_SAFE_INTEGER: f64 = 9_007_199_254_740_991.0;
const MEDIA_LIMIT: usize = 16 * 1024 * 1024;
const KINDS: &[&str] = &["image", "video", "audio", "text"];

fn invalid(field: &str) -> String {
    format!("corrupt: 项目包快照字段 {field} 无法完整读取")
}

fn shape(value: &Value, label: &str, allowed: &[&str], required: &[&str]) -> Result<(), String> {
    let map = value.as_object().ok_or_else(|| invalid(label))?;
    if map.keys().any(|key| !allowed.contains(&key.as_str()))
        || required.iter().any(|key| !map.contains_key(*key))
    {
        return Err(invalid(label));
    }
    Ok(())
}

fn text(value: &Value, field: &str, min: usize, max: usize) -> Result<(), String> {
    if let Some(value) = value.get(field) {
        // JavaScript slice/string length count UTF-16 code units, not Unicode scalars.
        let length = value
            .as_str()
            .ok_or_else(|| invalid(field))?
            .encode_utf16()
            .count();
        if length < min || length > max {
            return Err(invalid(field));
        }
    }
    Ok(())
}

fn texts(value: &Value, fields: &[(&str, usize)]) -> Result<(), String> {
    for (field, max) in fields {
        text(value, field, 0, *max)?;
    }
    Ok(())
}

fn enumeration(value: &Value, field: &str, options: &[&str]) -> Result<(), String> {
    if let Some(value) = value.get(field) {
        if !value.as_str().is_some_and(|entry| options.contains(&entry)) {
            return Err(invalid(field));
        }
    }
    Ok(())
}

fn number(value: &Value, field: &str, min: f64, max: f64, integer: bool) -> Result<(), String> {
    if let Some(value) = value.get(field) {
        let number = value.as_f64().ok_or_else(|| invalid(field))?;
        if !number.is_finite() || number < min || number > max || (integer && number.fract() != 0.0)
        {
            return Err(invalid(field));
        }
    }
    Ok(())
}

fn finite(value: &Value, field: &str) -> Result<(), String> {
    number(value, field, -f64::MAX, f64::MAX, false)
}

fn array<'a>(value: &'a Value, field: &str) -> Result<&'a [Value], String> {
    match value.get(field) {
        None => Ok(&[]),
        Some(value) => value
            .as_array()
            .map(Vec::as_slice)
            .ok_or_else(|| invalid(field)),
    }
}

fn routing(value: &Value) -> Result<(), String> {
    text(value, "providerName", 1, 80)?;
    if let Some(credential) = value.get("providerCredentialRef") {
        let credential = credential
            .as_str()
            .ok_or_else(|| invalid("providerCredentialRef"))?;
        if credential.is_empty()
            || credential.len() > 160
            || !credential
                .bytes()
                .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-'))
        {
            return Err(invalid("providerCredentialRef"));
        }
    }
    if let Some(raw) = value.get("providerBaseUrl") {
        let raw = raw.as_str().ok_or_else(|| invalid("providerBaseUrl"))?;
        let url = reqwest::Url::parse(raw).map_err(|_| invalid("providerBaseUrl"))?;
        let normalized = url.as_str().strip_suffix('/').unwrap_or(url.as_str());
        if !matches!(url.scheme(), "http" | "https")
            || !url.username().is_empty()
            || url.password().is_some()
            || url.query().is_some()
            || url.fragment().is_some()
            || raw != normalized
        {
            return Err(invalid("providerBaseUrl"));
        }
    }
    Ok(())
}

fn attachments(value: &Value) -> Result<(), String> {
    for attachment in array(value, "attachments")? {
        shape(
            attachment,
            "attachments",
            &["id", "assetId", "name", "mime", "size", "dataUrl"],
            &["id", "name", "mime", "size"],
        )?;
        text(attachment, "id", 1, 160)?;
        text(attachment, "assetId", 1, 160)?;
        texts(attachment, &[("name", usize::MAX), ("mime", usize::MAX)])?;
        number(attachment, "size", 0.0, MAX_SAFE_INTEGER, true)?;
        if let Some(data) = attachment.get("dataUrl") {
            let data = data
                .as_str()
                .ok_or_else(|| invalid("attachments.dataUrl"))?;
            let reference = data.strip_prefix("kk-asset:asset-").is_some_and(|id| {
                id.len() == 24
                    && id
                        .bytes()
                        .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
            });
            let embedded = ["png", "jpeg", "webp", "gif"].iter().any(|mime| {
                let prefix = format!("data:image/{mime};base64,");
                data.get(..prefix.len())
                    .is_some_and(|start| start.eq_ignore_ascii_case(&prefix))
            });
            if !data.is_empty()
                && !reference
                && !(embedded && data.encode_utf16().count() <= MEDIA_LIMIT)
            {
                return Err(invalid("attachments.dataUrl"));
            }
        }
    }
    Ok(())
}

fn draft(value: &Value) -> Result<(), String> {
    shape(
        value,
        "draft",
        &[
            "prompt",
            "model",
            "kind",
            "attachments",
            "approvalMode",
            "privacyMode",
            "outputCount",
            "updatedAt",
        ],
        &[],
    )?;
    texts(value, &[("prompt", usize::MAX), ("model", usize::MAX)])?;
    enumeration(value, "kind", KINDS)?;
    enumeration(value, "approvalMode", &["auto", "ask"])?;
    enumeration(
        value,
        "privacyMode",
        &["local_only", "byok_local", "platform_backed"],
    )?;
    number(value, "outputCount", 1.0, 64.0, true)?;
    finite(value, "updatedAt")?;
    attachments(value)
}

fn item(value: &Value) -> Result<(), String> {
    shape(
        value,
        "items",
        &[
            "id",
            "parameters",
            "title",
            "description",
            "kind",
            "prompt",
            "model",
            "assetId",
            "parentAssetId",
            "preview",
            "updatedAt",
            "referenceMode",
            "referenceOnly",
            "referenceSlot",
            "generationStatus",
            "generationIndex",
            "result",
        ],
        &["id", "title", "description", "kind"],
    )?;
    text(value, "id", 1, 160)?;
    text(value, "parentAssetId", 1, 160)?;
    texts(
        value,
        &[
            ("title", 160),
            ("description", 500),
            ("prompt", 4000),
            ("model", 120),
            ("assetId", 160),
            ("preview", MEDIA_LIMIT),
        ],
    )?;
    enumeration(value, "kind", KINDS)?;
    enumeration(
        value,
        "referenceSlot",
        &["主体", "风格", "材质", "构图", "Mask"],
    )?;
    enumeration(value, "generationStatus", &["pending", "ready", "error"])?;
    finite(value, "updatedAt")?;
    finite(value, "generationIndex")?;
    for field in ["referenceMode", "referenceOnly"] {
        if value
            .get(field)
            .is_some_and(|flag| flag.as_bool() != Some(true))
        {
            return Err(invalid(field));
        }
    }
    if let Some(parameters) = value.get("parameters") {
        shape(
            parameters,
            "parameters",
            &["ratio", "quality", "duration", "count", "soundEnabled"],
            &[],
        )?;
        texts(
            parameters,
            &[
                ("ratio", 30),
                ("quality", 30),
                ("duration", 10),
                ("count", 10),
            ],
        )?;
        if parameters
            .get("soundEnabled")
            .is_some_and(|flag| !flag.is_boolean())
        {
            return Err(invalid("parameters.soundEnabled"));
        }
    }
    if let Some(result) = value.get("result") {
        shape(
            result,
            "result",
            &[
                "id",
                "kind",
                "title",
                "src",
                "poster",
                "text",
                "description",
                "source",
            ],
            &["id", "kind", "title", "description", "source"],
        )?;
        text(result, "id", 1, 160)?;
        texts(
            result,
            &[
                ("title", 160),
                ("src", MEDIA_LIMIT),
                ("poster", MEDIA_LIMIT),
                ("text", 10000),
                ("description", 500),
            ],
        )?;
        enumeration(result, "kind", KINDS)?;
        enumeration(result, "source", &["demo", "provider"])?;
    }
    Ok(())
}

fn task(value: &Value) -> Result<(), String> {
    shape(
        value,
        "tasks",
        &[
            "id",
            "sourceItemId",
            "prompt",
            "model",
            "kind",
            "status",
            "submissionState",
            "submittedAt",
            "error",
            "resultItemId",
            "createdAt",
            "updatedAt",
            "attachments",
            "attempt",
            "requestedOutputs",
            "completedOutputs",
            "idempotencyKey",
            "batchId",
            "privacyMode",
            "providerConnectionId",
            "providerCredentialRef",
            "providerBaseUrl",
            "providerName",
            "outputs",
            "estimatedCostUsd",
            "actualCostUsd",
            "approvedGates",
            "retryOfTaskId",
            "retryOutputIndices",
        ],
        &["id", "prompt", "model", "status"],
    )?;
    text(value, "id", 1, 160)?;
    text(value, "sourceItemId", 1, 160)?;
    texts(
        value,
        &[
            ("prompt", 4000),
            ("model", 120),
            ("error", 500),
            ("resultItemId", 160),
            ("batchId", 160),
            ("providerConnectionId", 160),
        ],
    )?;
    text(value, "idempotencyKey", 1, 200)?;
    text(value, "retryOfTaskId", 1, 160)?;
    enumeration(value, "kind", KINDS)?;
    enumeration(
        value,
        "submissionState",
        &["intent", "submitted", "unknown", "terminal"],
    )?;
    number(value, "submittedAt", 0.0, MAX_SAFE_INTEGER, true)?;
    enumeration(
        value,
        "status",
        &[
            "queued",
            "running",
            "partial",
            "succeeded",
            "failed",
            "cancelled",
            "offline",
            "interrupted",
            "unknown",
        ],
    )?;
    // The current task reader rewrites local_only to byok_local. Fail closed
    // instead of claiming a portable package can preserve that privacy boundary.
    enumeration(value, "privacyMode", &["byok_local", "platform_backed"])?;
    finite(value, "createdAt")?;
    finite(value, "updatedAt")?;
    number(value, "attempt", 1.0, 100.0, true)?;
    number(value, "requestedOutputs", 1.0, 64.0, true)?;
    number(value, "completedOutputs", 0.0, MAX_SAFE_INTEGER, true)?;
    number(value, "estimatedCostUsd", 0.0, f64::MAX, false)?;
    number(value, "actualCostUsd", 0.0, f64::MAX, false)?;
    routing(value)?;
    attachments(value)?;
    let outputs = array(value, "outputs")?;
    if outputs.len() > 64 {
        return Err(invalid("outputs"));
    }
    let mut indices = HashSet::new();
    for output in outputs {
        shape(
            output,
            "outputs",
            &[
                "index",
                "status",
                "assetId",
                "model",
                "provider",
                "promptHash",
                "error",
                "createdAt",
            ],
            &[],
        )?;
        number(output, "index", 0.0, 63.0, true)?;
        let index = output.get("index").and_then(Value::as_f64).unwrap_or(0.0) as u8;
        if !indices.insert(index) {
            return Err(invalid("outputs.index"));
        }
        enumeration(
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
        texts(output, &[("assetId", 160), ("model", 120)])?;
        text(output, "provider", 1, 80)?;
        text(output, "promptHash", 1, 120)?;
        text(output, "error", 1, 500)?;
        finite(output, "createdAt")?;
    }
    for gate in array(value, "approvedGates")? {
        if !gate.as_str().is_some_and(|gate| {
            [
                "remote_transfer",
                "high_cost_batch",
                "overwrite_original",
                "external_share",
                "account_or_billing_change",
            ]
            .contains(&gate)
        }) {
            return Err(invalid("approvedGates"));
        }
    }
    for index in array(value, "retryOutputIndices")? {
        if !index
            .as_f64()
            .is_some_and(|n| n.is_finite() && n.abs() <= MAX_SAFE_INTEGER && n.fract() == 0.0)
        {
            return Err(invalid("retryOutputIndices"));
        }
    }
    Ok(())
}

fn review_comments(value: &Value) -> Result<(), String> {
    let comments = array(value, "reviewComments")?;
    if comments.len() > 500 {
        return Err(invalid("reviewComments"));
    }
    for comment in comments {
        shape(
            comment,
            "reviewComments",
            &[
                "id",
                "sourceTaskId",
                "assetId",
                "content",
                "region",
                "regionLabel",
                "assignee",
                "reviewTaskId",
                "status",
                "createdAt",
            ],
            &[
                "id",
                "sourceTaskId",
                "content",
                "regionLabel",
                "assignee",
                "status",
                "createdAt",
            ],
        )?;
        texts(
            comment,
            &[
                ("id", 160),
                ("sourceTaskId", 160),
                ("assetId", 160),
                ("regionLabel", 60),
                ("reviewTaskId", 160),
            ],
        )?;
        text(comment, "content", 1, 2000)?;
        enumeration(
            comment,
            "assignee",
            &[
                "planner",
                "prompt_compiler",
                "reference_analyst",
                "generation_worker",
                "asset_tagger",
                "reviewer",
                "compositor_exporter",
            ],
        )?;
        enumeration(comment, "status", &["comment", "open", "done"])?;
        finite(comment, "createdAt")?;
        if let Some(region) = comment.get("region") {
            shape(
                region,
                "reviewComments.region",
                &["x", "y", "width", "height"],
                &["x", "y", "width", "height"],
            )?;
            for field in ["x", "y", "width", "height"] {
                number(region, field, 0.0, 1.0, false)?;
            }
        }
    }
    Ok(())
}

fn canvas(value: &Value) -> Result<(), String> {
    shape(
        value,
        "canvas",
        &["version", "positions", "edges", "viewport"],
        &["version", "positions", "edges", "viewport"],
    )?;
    let positions = value["positions"]
        .as_object()
        .ok_or_else(|| invalid("canvas.positions"))?;
    for position in positions.values() {
        shape(position, "canvas.positions", &["x", "y"], &["x", "y"])?;
    }
    for edge in array(value, "edges")? {
        shape(
            edge,
            "canvas.edges",
            &["id", "source", "target", "kind"],
            &["id", "source", "target"],
        )?;
        text(edge, "id", 1, 160)?;
        text(edge, "source", 1, 160)?;
        text(edge, "target", 1, 160)?;
    }
    shape(
        &value["viewport"],
        "canvas.viewport",
        &["x", "y", "scale"],
        &["x", "y", "scale"],
    )
}

pub(super) fn validate(snapshot: &Value) -> Result<(), String> {
    crate::creation_storage::validate_snapshot_value(snapshot)?;
    shape(
        snapshot,
        "snapshot",
        &[
            "version",
            "revision",
            "activeProjectId",
            "projects",
            "homeDraft",
        ],
        &[
            "version",
            "revision",
            "activeProjectId",
            "projects",
            "homeDraft",
        ],
    )?;
    draft(&snapshot["homeDraft"])?;
    for project in array(snapshot, "projects")? {
        shape(
            project,
            "projects",
            &[
                "canvas",
                "id",
                "name",
                "kind",
                "prompt",
                "model",
                "attachments",
                "providerBaseUrl",
                "providerName",
                "providerCredentialRef",
                "items",
                "messages",
                "tasks",
                "reviewComments",
                "favoriteIds",
                "likedIds",
                "composerDraft",
                "createdAt",
                "updatedAt",
            ],
            &["id", "items"],
        )?;
        text(project, "id", 1, 160)?;
        texts(project, &[("name", 120), ("prompt", 4000), ("model", 120)])?;
        enumeration(project, "kind", KINDS)?;
        finite(project, "createdAt")?;
        finite(project, "updatedAt")?;
        routing(project)?;
        attachments(project)?;
        for entry in array(project, "items")? {
            item(entry)?;
        }
        for entry in array(project, "tasks")? {
            task(entry)?;
        }
        for message in array(project, "messages")? {
            shape(
                message,
                "messages",
                &["id", "role", "content", "createdAt"],
                &["id", "role", "content"],
            )?;
            text(message, "id", 1, 160)?;
            text(message, "content", 0, 10000)?;
            finite(message, "createdAt")?;
        }
        for field in ["favoriteIds", "likedIds"] {
            for id in array(project, field)? {
                if !id
                    .as_str()
                    .is_some_and(|id| id.encode_utf16().count() <= 160)
                {
                    return Err(invalid(field));
                }
            }
        }
        review_comments(project)?;
        if let Some(value) = project.get("composerDraft") {
            draft(value)?;
        }
        if let Some(value) = project.get("canvas") {
            canvas(value)?;
        }
    }
    Ok(())
}
