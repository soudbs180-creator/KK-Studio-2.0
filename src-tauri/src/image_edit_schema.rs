//! Bounded additive Mask contracts for portable projects. Coordinates are original pixels.
use serde_json::Value;
use std::collections::HashSet;
fn invalid() -> String {
    "corrupt: 图片编辑蒙版或上下文无效，原件已保留".into()
}
fn shape(value: &Value, allowed: &[&str], required: &[&str]) -> Result<(), String> {
    let map = value.as_object().ok_or_else(invalid)?;
    if map.keys().any(|key| !allowed.contains(&key.as_str()))
        || required.iter().any(|key| !map.contains_key(*key))
    {
        return Err(invalid());
    }
    Ok(())
}
fn text(value: &Value, max: usize) -> Result<&str, String> {
    value
        .as_str()
        .filter(|s| s.encode_utf16().count() <= max)
        .ok_or_else(invalid)
}
fn integer(value: &Value, min: i64, max: i64) -> Result<i64, String> {
    let number = value.as_f64().ok_or_else(invalid)?;
    if !number.is_finite() || number.fract() != 0.0 || number < min as f64 || number > max as f64 {
        return Err(invalid());
    }
    Ok(number as i64)
}
fn asset(value: &Value) -> Result<(), String> {
    let id = text(value, 30)?;
    if !id.strip_prefix("asset-").is_some_and(|s| {
        s.len() == 24
            && s.bytes()
                .all(|c| c.is_ascii_hexdigit() && !c.is_ascii_uppercase())
    }) {
        return Err(invalid());
    }
    Ok(())
}
pub(super) fn references(value: &Value) -> Result<(), String> {
    let ids = value.as_array().ok_or_else(invalid)?;
    if ids.len() > 64 {
        return Err(invalid());
    }
    for id in ids {
        asset(id)?;
    }
    Ok(())
}
pub(super) fn context(value: &Value) -> Result<(), String> {
    shape(
        value,
        &[
            "originalPrompt",
            "originalAssetId",
            "referenceAssetIds",
            "lastInstruction",
        ],
        &["originalPrompt", "referenceAssetIds"],
    )?;
    text(&value["originalPrompt"], 4000)?;
    references(&value["referenceAssetIds"])?;
    if let Some(id) = value.get("originalAssetId") {
        asset(id)?;
    }
    if let Some(previous) = value.get("lastInstruction") {
        text(previous, 4000)?;
    }
    Ok(())
}
pub(super) fn mask(value: &Value) -> Result<(), String> {
    shape(
        value,
        &["width", "height", "regions", "colorCounters"],
        &["width", "height", "regions"],
    )?;
    let width = integer(&value["width"], 1, 16384)?;
    let height = integer(&value["height"], 1, 16384)?;
    if width * height > 64 * 1024 * 1024 {
        return Err(invalid());
    }
    if let Some(counters) = value.get("colorCounters") {
        let map = counters.as_object().ok_or_else(invalid)?;
        if map.len() > 200 {
            return Err(invalid());
        }
        for (name, count) in map {
            if name.encode_utf16().count() > 40 {
                return Err(invalid());
            }
            integer(count, 0, 9_007_199_254_740_991)?;
        }
    }
    let regions = value["regions"].as_array().ok_or_else(invalid)?;
    if regions.len() > 200 {
        return Err(invalid());
    }
    let mut ids = HashSet::new();
    let mut count = 0;
    for region in regions {
        shape(
            region,
            &["id", "runs", "color", "colorName", "number", "instruction"],
            &["id", "runs"],
        )?;
        let id = text(&region["id"], 160)?;
        if id.is_empty() || !ids.insert(id) {
            return Err(invalid());
        }
        if let Some(name) = region.get("colorName") {
            text(name, 40)?;
        }
        if let Some(number) = region.get("number") {
            integer(number, 1, 9_007_199_254_740_991)?;
        }
        if let Some(color) = region.get("color") {
            if !text(color, 7)?
                .strip_prefix('#')
                .is_some_and(|s| s.len() == 6 && s.bytes().all(|c| c.is_ascii_hexdigit()))
            {
                return Err(invalid());
            }
            text(&region["colorName"], 40)?;
            integer(&region["number"], 1, 9_007_199_254_740_991)?;
        }
        if let Some(instruction) = region.get("instruction") {
            text(instruction, 2000)?;
        }
        let runs = region["runs"].as_array().ok_or_else(invalid)?;
        count += runs.len();
        if count > 500000 {
            return Err(invalid());
        }
        for run in runs {
            let array = run
                .as_array()
                .filter(|a| a.len() == 3)
                .ok_or_else(invalid)?;
            integer(&array[0], 0, height - 1)?;
            let start = integer(&array[1], 0, width - 1)?;
            let end = integer(&array[2], 1, width)?;
            if start >= end {
                return Err(invalid());
            }
        }
    }
    Ok(())
}
pub(super) fn edit(value: &Value) -> Result<(), String> {
    shape(
        value,
        &[
            "sourceAssetId",
            "maskAssetId",
            "groupId",
            "document",
            "crop",
            "nativeMask",
        ],
        &["sourceAssetId", "groupId", "document", "crop", "nativeMask"],
    )?;
    asset(&value["sourceAssetId"])?;
    if let Some(id) = value.get("maskAssetId") {
        asset(id)?;
    }
    if text(&value["groupId"], 160)?.is_empty() {
        return Err(invalid());
    }
    let native = value["nativeMask"].as_bool().ok_or_else(invalid)?;
    if native && value.get("maskAssetId").is_none() {
        return Err(invalid());
    }
    mask(&value["document"])?;
    let crop = &value["crop"];
    shape(
        crop,
        &["x", "y", "width", "height", "regionIds"],
        &["x", "y", "width", "height", "regionIds"],
    )?;
    let width = integer(&crop["width"], 1, 18024)?;
    let height = integer(&crop["height"], 1, 18024)?;
    let x = integer(
        &crop["x"],
        -width,
        integer(&value["document"]["width"], 1, 16384)? - 1,
    )?;
    let y = integer(
        &crop["y"],
        -height,
        integer(&value["document"]["height"], 1, 16384)? - 1,
    )?;
    let ids = crop["regionIds"].as_array().ok_or_else(invalid)?;
    if ids.is_empty() || ids.len() > 200 {
        return Err(invalid());
    }
    let mut unique = HashSet::new();
    for id in ids {
        let id = text(id, 160)?;
        if !unique.insert(id) {
            return Err(invalid());
        }
        let region = value["document"]["regions"]
            .as_array()
            .unwrap()
            .iter()
            .find(|r| r["id"].as_str() == Some(id))
            .ok_or_else(invalid)?;
        let runs = region["runs"].as_array().unwrap();
        if runs.is_empty() {
            return Err(invalid());
        }
        for run in runs {
            let row = integer(&run[0], 0, 16383)?;
            let start = integer(&run[1], 0, 16383)?;
            let end = integer(&run[2], 1, 16384)?;
            if row < y || row >= y + height || start < x || end > x + width {
                return Err(invalid());
            }
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn portable_schema_uses_the_same_web_vectors() {
        let vectors: Value =
            serde_json::from_str(include_str!("../../tests/fixtures/image-edit-schema.json"))
                .unwrap();
        for case in vectors["cases"].as_array().unwrap() {
            let kind = case["kind"].as_str().unwrap();
            let mut input = vectors["base"][kind].clone();
            for change in case["changes"].as_array().unwrap() {
                let path = change["path"].as_array().unwrap();
                let mut target = &mut input;
                for segment in &path[..path.len() - 1] {
                    let key = segment.as_str().unwrap();
                    target = if target.is_array() {
                        &mut target[key.parse::<usize>().unwrap()]
                    } else {
                        &mut target[key]
                    };
                }
                target[path.last().unwrap().as_str().unwrap()] = change["value"].clone();
            }
            let result = match kind {
                "mask" => mask(&input),
                "context" => context(&input),
                "edit" => edit(&input),
                _ => unreachable!(),
            };
            assert_eq!(
                result.is_ok(),
                case["valid"].as_bool().unwrap(),
                "{}",
                case["name"]
            );
        }
    }
}
