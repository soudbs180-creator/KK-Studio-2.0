use std::sync::Mutex;
use zeroize::Zeroize;

const SERVICE: &str = "com.kkstudio.provider";
// Platform stores can fail on concurrent RPCs even though Entry is thread-safe.
static VAULT_ACCESS: Mutex<()> = Mutex::new(());

fn validate_id(provider_id: &str) -> Result<(), String> {
    if provider_id.is_empty()
        || provider_id.len() > 128
        || !provider_id
            .bytes()
            .all(|value| value.is_ascii_alphanumeric() || value == b'_' || value == b'-')
    {
        return Err("凭据提供商 ID 无效".into());
    }
    Ok(())
}

#[cfg(any(target_os = "windows", target_os = "macos", target_os = "linux"))]
fn entry(provider_id: &str) -> Result<keyring::Entry, String> {
    keyring::Entry::new(SERVICE, provider_id).map_err(|_| "无法访问系统凭据库".into())
}

#[cfg(any(target_os = "windows", target_os = "macos", target_os = "linux"))]
fn get_from_entry(entry: &keyring::Entry) -> Result<Option<String>, String> {
    match entry.get_password() {
        Ok(secret) => Ok(Some(secret)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(_) => Err("无法读取系统凭据库".into()),
    }
}

#[cfg(any(target_os = "windows", target_os = "macos", target_os = "linux"))]
fn delete_from_entry(entry: &keyring::Entry) -> Result<bool, String> {
    match entry.delete_credential() {
        Ok(()) => Ok(true),
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(_) => Err("无法删除系统凭据".into()),
    }
}

#[cfg(any(target_os = "windows", target_os = "macos", target_os = "linux"))]
fn set_with(
    provider_id: &str,
    secret: &mut String,
    open: impl FnOnce() -> Result<keyring::Entry, String>,
) -> Result<bool, String> {
    let result = (|| {
        validate_id(provider_id)?;
        if secret.trim().is_empty() || secret.len() > 64 * 1024 {
            return Err("凭据内容为空或过长".into());
        }
        open()?
            .set_password(secret.trim())
            .map_err(|_| "无法写入系统凭据库".to_string())?;
        Ok(true)
    })();
    secret.zeroize();
    result
}

pub fn set(provider_id: &str, mut secret: String) -> Result<bool, String> {
    #[cfg(any(target_os = "windows", target_os = "macos", target_os = "linux"))]
    {
        let _guard = match VAULT_ACCESS.lock() {
            Ok(guard) => guard,
            Err(_) => {
                secret.zeroize();
                return Err("系统凭据库暂不可用".into());
            }
        };
        return set_with(provider_id, &mut secret, || entry(provider_id));
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        let _ = provider_id;
        secret.zeroize();
        Err("当前桌面平台不支持系统凭据库".into())
    }
}

pub fn get(provider_id: &str) -> Result<Option<String>, String> {
    validate_id(provider_id)?;
    #[cfg(any(target_os = "windows", target_os = "macos", target_os = "linux"))]
    {
        let _guard = VAULT_ACCESS.lock().map_err(|_| "系统凭据库暂不可用")?;
        get_from_entry(&entry(provider_id)?)
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    Err("当前桌面平台不支持系统凭据库".into())
}

pub fn delete(provider_id: &str) -> Result<bool, String> {
    validate_id(provider_id)?;
    #[cfg(any(target_os = "windows", target_os = "macos", target_os = "linux"))]
    {
        let _guard = VAULT_ACCESS.lock().map_err(|_| "系统凭据库暂不可用")?;
        delete_from_entry(&entry(provider_id)?)
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    Err("当前桌面平台不支持系统凭据库".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    use keyring::{mock::MockCredential, Entry, Error};

    fn entry() -> Entry {
        Entry::new_with_credential(Box::new(MockCredential::default()))
    }

    #[test]
    fn absent_credentials_are_distinct_from_vault_failures() {
        let entry = entry();
        assert_eq!(get_from_entry(&entry).unwrap(), None);
        assert!(!delete_from_entry(&entry).unwrap());
        let mock = entry
            .get_credential()
            .downcast_ref::<MockCredential>()
            .unwrap();
        mock.set_error(Error::Invalid(
            "synthetic-private-account".into(),
            "synthetic-secret".into(),
        ));
        let error = get_from_entry(&entry).unwrap_err();
        assert!(!error.contains("synthetic"));
        assert!(!error.is_empty());
    }

    #[test]
    fn secret_is_cleared_for_invalid_identity_and_vault_write_failure() {
        let mut secret = "synthetic-private-secret".to_string();
        assert!(set_with("../wrong", &mut secret, || panic!(
            "invalid identity must not open the vault"
        ))
        .is_err());
        assert!(secret.is_empty());
        secret = "synthetic-private-secret".to_string();
        let entry = entry();
        entry
            .get_credential()
            .downcast_ref::<MockCredential>()
            .unwrap()
            .set_error(Error::Invalid(
                "synthetic-vault".into(),
                "synthetic-private-secret".into(),
            ));
        let error = set_with("provider-1", &mut secret, || Ok(entry)).unwrap_err();
        assert!(secret.is_empty());
        assert!(!error.contains("synthetic"));
    }

    #[test]
    fn empty_and_oversized_secrets_never_reach_the_vault() {
        for mut secret in ["  ".to_string(), "a".repeat(65 * 1024)] {
            assert!(set_with("provider-1", &mut secret, || panic!(
                "invalid secret must not open the vault"
            ))
            .is_err());
            assert!(secret.is_empty());
        }
    }

    #[test]
    fn identity_is_validated_before_get_and_delete() {
        for id in [
            "",
            "../provider",
            "provider/key",
            "provider\n",
            &"x".repeat(129),
        ] {
            assert!(get(id).is_err());
            assert!(delete(id).is_err());
        }
    }

    #[test]
    fn present_secret_roundtrips_and_is_removed_without_persistent_test_state() {
        let entry = entry();
        entry.set_password("synthetic-value").unwrap();
        assert_eq!(
            get_from_entry(&entry).unwrap().as_deref(),
            Some("synthetic-value")
        );
        assert!(delete_from_entry(&entry).unwrap());
        assert_eq!(get_from_entry(&entry).unwrap(), None);
    }
}
