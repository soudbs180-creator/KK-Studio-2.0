use super::*;

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
        ],
        &["lensMm", "aperture"],
    )?;
    number(value, "lensMm", 4.0, 2000.0, false)?;
    texts(value, &[("focalDistance", 80), ("cameraBody", 120)])?;
    enumeration(value, "depthOfField", &["natural", "shallow", "deep"])?;
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
