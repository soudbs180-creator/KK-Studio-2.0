//! Shared credential-key rejection for every JSON payload that crosses a
//! persistence or transport boundary.
//!
//! This module is the single definition of "does this key name look like a
//! secret?". It previously existed as two independent copies — one in
//! `creation_validation.rs` and one in `project_package.rs` — with different
//! rule sets: the project-package copy also matched `client_secret`,
//! `bearer_token`, `authorization`, and any key merely *containing* `secret`,
//! while the snapshot copy matched only eight exact names. A payload accepted
//! by one caller could therefore be rejected by the other for the same key.
//!
//! The stricter union is now the only rule, so both callers agree.

use serde_json::Value;

/// Normalised substrings that mark a key as credential-bearing.
///
/// Keys are lowercased with `_` and `-` removed before matching, so
/// `API-Key`, `api_key`, and `apikey` are all caught by one entry.
const SECRET_KEY_FRAGMENTS: [&str; 12] = [
    "api_key",
    "apikey",
    "bearer_token",
    "bearertoken",
    "access_token",
    "accesstoken",
    "oauthtoken",
    "oauth_token",
    "refreshtoken",
    "refresh_token",
    "client_secret",
    "clientsecret",
];

/// Whole-key names that are credentials but are too generic to match by
/// fragment without also rejecting unrelated fields.
const SECRET_KEY_NAMES: [&str; 2] = ["authorization", "secret"];

/// True when `key` names a credential.
///
/// Matching is deliberately name-based: it never inspects free-text values, so
/// a secret pasted into a prompt or note is *not* detected here. Callers must
/// not describe this as covering every credential leak path.
pub fn is_secret_key(key: &str) -> bool {
    let normalized = key.to_ascii_lowercase().replace(['_', '-'], "");
    if SECRET_KEY_NAMES.contains(&normalized.as_str()) {
        return true;
    }
    SECRET_KEY_FRAGMENTS
        .iter()
        .any(|fragment| normalized.contains(fragment))
}

/// Recursively rejects any object key that names a credential.
///
/// `error` builds the caller-specific failure message so each surface keeps its
/// own error vocabulary (`corrupt:` for snapshots, `secret-present:` for
/// project packages) while sharing one traversal and one rule set.
///
/// The closure is taken by reference and passed on as `&F`: passing it by value
/// would give each recursion level a distinct `F` type and monomorphise into a
/// type-depth blowup that only shows up at compile time.
pub fn reject_secrets<F>(value: &Value, error: &F) -> Result<(), String>
where
    F: Fn() -> String,
{
    match value {
        Value::Object(map) => {
            for (key, child) in map {
                if is_secret_key(key) {
                    return Err(error());
                }
                reject_secrets(child, error)?;
            }
        }
        Value::Array(values) => {
            for child in values {
                reject_secrets(child, error)?;
            }
        }
        _ => {}
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{is_secret_key, reject_secrets};
    use serde_json::{json, Value};

    #[test]
    fn matches_known_credential_key_spellings() {
        for key in [
            "api_key",
            "API-KEY",
            "apiKey",
            "apikey",
            "access_token",
            "accessToken",
            "refresh_token",
            "oauth_token",
            "bearer_token",
            "client_secret",
            "clientSecret",
            "authorization",
            "Authorization",
            "secret",
        ] {
            assert!(is_secret_key(key), "{key} must be treated as a secret");
        }
    }

    #[test]
    fn ignores_ordinary_domain_keys() {
        for key in [
            "projects",
            "assets",
            "secretPresent",
            "tasks",
            "prompt",
            "author",
            "authorizedAt",
        ] {
            assert!(!is_secret_key(key), "{key} must not be treated as a secret");
        }
    }

    #[test]
    fn rejects_nested_and_arrayed_secret_keys() {
        let payload = json!({
            "projects": [{ "assets": [{ "meta": { "client_secret": "x" } }] }]
        });
        assert!(reject_secrets(&payload, &|| "secret-present: denied".to_string()).is_err());
    }

    #[test]
    fn accepts_payloads_without_credential_keys() {
        let payload = json!({ "version": 2, "projects": [], "assets": [] });
        assert_eq!(
            reject_secrets(&payload, &|| "secret-present: denied".to_string()),
            Ok(())
        );
    }

    #[test]
    fn passes_non_object_roots_through() {
        assert_eq!(
            reject_secrets(&Value::Null, &|| "denied".to_string()),
            Ok(())
        );
        assert_eq!(
            reject_secrets(&json!("text"), &|| "denied".to_string()),
            Ok(())
        );
    }

    #[test]
    fn both_call_surfaces_reject_the_same_payload() {
        // The regression this module exists to prevent: the two former copies
        // disagreed, so `client_secret` passed snapshot validation.
        let payload = json!({ "meta": { "client_secret": "x" } });
        let snapshot = reject_secrets(&payload, &|| "corrupt: denied".to_string());
        let package = reject_secrets(&payload, &|| "secret-present: denied".to_string());
        assert!(snapshot.is_err());
        assert!(package.is_err());
    }
}
