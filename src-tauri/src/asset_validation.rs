use serde_json::{Map, Value};
use sha2::{Digest, Sha256};

pub const MAX_BYTES: usize = 100 * 1024 * 1024;
pub const MAX_RECORD_BYTES: usize = 1024 * 1024;

pub fn invalid(field: &str) -> String {
    format!("invalid: 素材字段 {field} 无效")
}
pub fn hash(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}
fn hex(value: &str, len: usize) -> bool {
    value.len() == len
        && value
            .bytes()
            .all(|c| c.is_ascii_digit() || (b'a'..=b'f').contains(&c))
}
pub fn asset_id(id: &str) -> Result<(), String> {
    if id
        .strip_prefix("asset-")
        .is_some_and(|suffix| hex(suffix, 24))
    {
        Ok(())
    } else {
        Err(invalid("assetId"))
    }
}
fn keys<'a>(
    value: &'a Value,
    allowed: &[&str],
    field: &str,
) -> Result<&'a Map<String, Value>, String> {
    let object = value.as_object().ok_or_else(|| invalid(field))?;
    if object.keys().any(|key| !allowed.contains(&key.as_str())) {
        return Err(invalid(field));
    }
    Ok(object)
}
fn text<'a>(value: &'a Value, max: usize, field: &str) -> Result<&'a str, String> {
    value
        .as_str()
        .filter(|s| s.chars().count() <= max)
        .ok_or_else(|| invalid(field))
}
fn optional_text(value: &Value, fields: &[(&str, usize)]) -> Result<(), String> {
    for (field, max) in fields {
        if let Some(v) = value.get(field) {
            text(v, *max, field)?;
        }
    }
    Ok(())
}
pub(crate) fn utc_date(value: &str) -> bool {
    let bytes = value.as_bytes();
    if bytes.len() < 20
        || !value.is_ascii()
        || bytes[4] != b'-'
        || bytes[7] != b'-'
        || bytes[10] != b'T'
        || bytes[13] != b':'
        || bytes[16] != b':'
        || bytes[bytes.len() - 1] != b'Z'
    {
        return false;
    }
    let parts: Option<Vec<u32>> = [(0, 4), (5, 7), (8, 10), (11, 13), (14, 16), (17, 19)]
        .iter()
        .map(|(a, b)| {
            let part = &value[*a..*b];
            part.bytes()
                .all(|byte| byte.is_ascii_digit())
                .then(|| part.parse().ok())
                .flatten()
        })
        .collect();
    let Some(p) = parts else {
        return false;
    };
    let leap = p[0] % 4 == 0 && (p[0] % 100 != 0 || p[0] % 400 == 0);
    let days = match p[1] {
        2 if leap => 29,
        2 => 28,
        4 | 6 | 9 | 11 => 30,
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        _ => 0,
    };
    let fraction = bytes.len() == 20
        || (bytes.len() > 21
            && bytes[19] == b'.'
            && bytes[20..bytes.len() - 1].iter().all(u8::is_ascii_digit));
    p[2] >= 1 && p[2] <= days && p[3] < 24 && p[4] < 60 && p[5] < 60 && fraction
}
fn provenance(value: &Value) -> Result<(), String> {
    keys(
        value,
        &[
            "provider",
            "model",
            "providerRequestId",
            "connectionId",
            "c2paPresent",
            "synthIdSignal",
            "generatedAt",
        ],
        "provenance",
    )?;
    optional_text(
        value,
        &[
            ("provider", 80),
            ("model", 120),
            ("providerRequestId", 200),
            ("connectionId", 160),
        ],
    )?;
    if !utc_date(text(&value["generatedAt"], 64, "generatedAt")?) {
        return Err(invalid("generatedAt"));
    }
    for field in ["c2paPresent", "synthIdSignal"] {
        if value.get(field).is_some_and(|v| !v.is_boolean()) {
            return Err(invalid(field));
        }
    }
    Ok(())
}
fn origin_fields(value: &Value) -> Result<(), String> {
    optional_text(
        value,
        &[("sourceJobId", 200), ("promptHash", 200), ("parentId", 200)],
    )?;
    provenance(&value["provenance"])
}
pub fn metadata(value: &Value) -> Result<(), String> {
    keys(
        value,
        &[
            "assetId",
            "sha256",
            "mime",
            "tags",
            "sourceJobId",
            "promptHash",
            "parentId",
            "isAiGenerated",
            "source",
            "origins",
            "provenance",
        ],
        "metadata",
    )?;
    let id = text(&value["assetId"], 30, "assetId")?;
    asset_id(id)?;
    let sha = text(&value["sha256"], 64, "sha256")?;
    if !hex(sha, 64) || id != format!("asset-{}", &sha[..24]) {
        return Err(invalid("sha256/assetId"));
    }
    let mime = text(&value["mime"], 40, "mime")?.to_ascii_lowercase();
    if ![
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/gif",
        "video/mp4",
        "video/webm",
        "audio/mpeg",
        "audio/wav",
        "audio/ogg",
    ]
    .contains(&mime.as_str())
    {
        return Err(invalid("mime"));
    }
    let tags = value["tags"]
        .as_array()
        .filter(|v| v.len() <= 20)
        .ok_or_else(|| invalid("tags"))?;
    for tag in tags {
        text(tag, 200, "tag")?;
    }
    if value.get("isAiGenerated").is_some_and(|v| !v.is_boolean()) {
        return Err(invalid("isAiGenerated"));
    }
    if value
        .get("source")
        .is_some_and(|v| !matches!(v.as_str(), Some("provider" | "upload")))
    {
        return Err(invalid("source"));
    }
    origin_fields(value)?;
    if let Some(origins) = value.get("origins") {
        let origins = origins
            .as_array()
            .filter(|v| v.len() <= 200)
            .ok_or_else(|| invalid("origins"))?;
        for origin in origins {
            keys(
                origin,
                &["sourceJobId", "promptHash", "parentId", "provenance"],
                "origin",
            )?;
            origin_fields(origin)?;
        }
    }
    Ok(())
}

pub fn decode_record(bytes: &[u8], expected_id: &str) -> Result<Value, String> {
    let value: Value = serde_json::from_slice(bytes)
        .map_err(|_| "corrupt: 素材记录 JSON 损坏，已保留原文件".to_string())?;
    if value["version"].as_u64().is_some_and(|version| version > 1) {
        return Err("unsupported: 素材记录版本不受支持".into());
    }
    let result = (|| {
        keys(&value, &["version", "metadata"], "record")?;
        if value["version"] != 1 {
            return Err(invalid("version"));
        }
        metadata(&value["metadata"])?;
        if value["metadata"]["assetId"] != expected_id {
            return Err(invalid("assetId"));
        }
        Ok(value["metadata"].clone())
    })();
    result.map_err(|_| "corrupt: 素材记录字段损坏，已保留原文件".into())
}
fn origin(value: &Value) -> Value {
    let mut result = Map::new();
    for field in ["sourceJobId", "promptHash", "parentId", "provenance"] {
        if let Some(v) = value.get(field) {
            result.insert(field.into(), v.clone());
        }
    }
    Value::Object(result)
}
pub fn merge(old: &Value, incoming: &Value) -> Value {
    let mut origins = old
        .get("origins")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_else(|| vec![origin(old)]);
    origins.push(origin(incoming));
    let mut unique: Vec<Value> = Vec::new();
    for entry in origins {
        if !unique.iter().any(|item| {
            item.get("sourceJobId") == entry.get("sourceJobId")
                && item.get("promptHash") == entry.get("promptHash")
        }) {
            unique.push(entry);
        }
    }
    if unique.len() > 200 {
        unique.drain(..unique.len() - 200);
    }
    let mut tags = old["tags"].as_array().unwrap().clone();
    for tag in incoming["tags"].as_array().unwrap() {
        if !tags.contains(tag) && tags.len() < 20 {
            tags.push(tag.clone());
        }
    }
    let mut canonical = if old["isAiGenerated"] != false || incoming["isAiGenerated"] != true {
        old.clone()
    } else {
        incoming.clone()
    };
    canonical["origins"] = Value::Array(unique);
    canonical["tags"] = Value::Array(tags);
    canonical
}
