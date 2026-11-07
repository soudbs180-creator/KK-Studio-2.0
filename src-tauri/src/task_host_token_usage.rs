use super::TokenUsage;
use serde_json::Value;

pub(super) fn read(value: &Value, previous: Option<&TokenUsage>) -> Option<TokenUsage> {
    let Some(usage) = value
        .get("usage")
        .or_else(|| value.get("response").and_then(|r| r.get("usage")))
        .or_else(|| value.get("message").and_then(|m| m.get("usage")))
    else {
        return previous.cloned();
    };
    let prompt = usage
        .get("prompt_tokens")
        .or_else(|| usage.get("input_tokens"));
    let completion = usage
        .get("completion_tokens")
        .or_else(|| usage.get("output_tokens"));
    if prompt.is_none() && completion.is_none() {
        return previous.cloned();
    }
    let parse = |v: Option<&Value>, fallback| match v {
        Some(v) => v.as_u64().filter(|n| *n <= 9_007_199_254_740_991),
        None => Some(fallback),
    };
    let parsed = (|| {
        let prompt_tokens = parse(prompt, previous.map_or(0, |p| p.prompt_tokens))?;
        let completion_tokens = parse(completion, previous.map_or(0, |p| p.completion_tokens))?;
        let total_tokens = parse(
            usage.get("total_tokens"),
            prompt_tokens.checked_add(completion_tokens)?,
        )?;
        Some(TokenUsage {
            prompt_tokens,
            completion_tokens,
            total_tokens,
        })
    })();
    parsed.or_else(|| previous.cloned())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    #[test]
    fn merges_real_provider_usage_and_rejects_invalid_counts() {
        let first = read(&json!({"message":{"usage":{"input_tokens":13}}}), None).unwrap();
        let second = read(&json!({"usage":{"output_tokens":5}}), Some(&first)).unwrap();
        assert_eq!(second.prompt_tokens, 13);
        assert_eq!(second.total_tokens, 18);
        assert_eq!(
            read(&json!({"type":"message_stop"}), Some(&second))
                .unwrap()
                .total_tokens,
            18
        );
        assert_eq!(
            read(&json!({"usage":{"output_tokens":-1}}), Some(&second))
                .unwrap()
                .total_tokens,
            18
        );
    }
}
