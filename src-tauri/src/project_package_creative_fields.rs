use super::*;

pub(super) fn blueprint(value: &Value) -> Result<(), String> {
    shape(
        value,
        "blueprint",
        &["kind", "paths", "summary", "parentId"],
        &["kind", "paths", "summary"],
    )?;
    enumeration(
        value,
        "kind",
        &[
            "ui", "service", "worker", "feature", "data", "library", "external",
        ],
    )?;
    text(value, "summary", 0, 3000)?;
    text(value, "parentId", 1, 160)?;
    let paths = array(value, "paths")?;
    if paths.len() > 100
        || paths
            .iter()
            .any(|p| !p.as_str().is_some_and(|s| s.encode_utf16().count() <= 1000))
    {
        return Err(invalid("blueprint.paths"));
    }
    Ok(())
}

pub(super) fn comments(value: &Value) -> Result<(), String> {
    let rows = value.as_array().ok_or_else(|| invalid("comments"))?;
    if rows.len() > 100 {
        return Err(invalid("comments"));
    }
    for row in rows {
        shape(
            row,
            "comment",
            &["id", "text", "resolved"],
            &["id", "text", "resolved"],
        )?;
        text(row, "id", 1, 160)?;
        text(row, "text", 1, 2000)?;
        if !row["resolved"].is_boolean() {
            return Err(invalid("comments.resolved"));
        }
    }
    Ok(())
}

pub(super) fn presentation(value: &Value) -> Result<(), String> {
    shape(
        value,
        "canvasPresentation",
        &["width", "height", "locked", "color"],
        &[],
    )?;
    number(value, "width", 80.0, 4000.0, false)?;
    number(value, "height", 44.0, 4000.0, false)?;
    if value.get("locked").is_some_and(|v| !v.is_boolean()) {
        return Err(invalid("canvasPresentation.locked"));
    }
    enumeration(value, "color", &["default", "accent", "warning", "success"])
}
pub(super) fn optics(value: &Value) -> Result<(), String> {
    shape(
        value,
        "optics",
        &[
            "lensMm",
            "aperture",
            "focalDistance",
            "cameraBody",
            "depthOfField",
            "shotScale",
            "cameraAngle",
            "azimuthDeg",
            "elevationDeg",
        ],
        &["lensMm", "aperture"],
    )?;
    number(value, "lensMm", 4.0, 2000.0, false)?;
    texts(value, &[("focalDistance", 80), ("cameraBody", 120)])?;
    enumeration(value, "depthOfField", &["natural", "shallow", "deep"])?;
    enumeration(value, "shotScale", &["ECU", "CU", "MCU", "MS", "WS", "EWS"])?;
    enumeration(
        value,
        "cameraAngle",
        &[
            "bird-eye",
            "high-angle",
            "eye-level",
            "low-angle",
            "dutch-angle",
        ],
    )?;
    number(value, "azimuthDeg", -180.0, 180.0, false)?;
    number(value, "elevationDeg", -90.0, 90.0, false)?;
    let aperture = value["aperture"]
        .as_str()
        .ok_or_else(|| invalid("optics.aperture"))?;
    let aperture = aperture.strip_prefix("f/").unwrap_or(aperture);
    if aperture.is_empty()
        || !aperture.chars().all(|c| c.is_ascii_digit() || c == '.')
        || !aperture
            .parse::<f64>()
            .is_ok_and(|n| n.is_finite() && (0.7..=64.0).contains(&n))
    {
        return Err(invalid("optics.aperture"));
    }
    Ok(())
}
pub(super) fn usage(value: &Value) -> Result<(), String> {
    shape(
        value,
        "tokenUsage",
        &["promptTokens", "completionTokens", "totalTokens"],
        &["promptTokens", "completionTokens", "totalTokens"],
    )?;
    for field in ["promptTokens", "completionTokens", "totalTokens"] {
        number(value, field, 0.0, MAX_SAFE_INTEGER, true)?;
    }
    Ok(())
}
pub(super) fn mandate(value: &Value) -> Result<(), String> {
    shape(
        value,
        "executionMandate",
        &[
            "id",
            "authorizedBy",
            "allowedTools",
            "maxStepCount",
            "issuedAt",
            "expiresAt",
            "scope",
        ],
        &[
            "id",
            "authorizedBy",
            "allowedTools",
            "maxStepCount",
            "issuedAt",
        ],
    )?;
    texts(
        value,
        &[
            ("id", 160),
            ("issuedAt", 80),
            ("expiresAt", 80),
            ("scope", 4000),
        ],
    )?;
    enumeration(value, "authorizedBy", &["User", "Router"])?;
    number(value, "maxStepCount", 1.0, MAX_SAFE_INTEGER, true)?;
    let tools = array(value, "allowedTools")?;
    if tools.len() > 500
        || tools.iter().any(|tool| {
            !tool
                .as_str()
                .is_some_and(|s| !s.is_empty() && s.len() <= 160)
        })
    {
        return Err(invalid("executionMandate.allowedTools"));
    }
    Ok(())
}
