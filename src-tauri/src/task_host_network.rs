use super::{io, is_loopback_host, validated_provider_client};
use hyper_util::client::proxy::matcher::Matcher;
use reqwest::{Client, Proxy, Url};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;

const MAX_PREFERENCES_BYTES: usize = 4096;
const SETTINGS_ERROR: &str = "网络设置不可用，请在设置中重新保存";
const INVALID_PROXY: &str = "出站代理地址或协议不可用";

#[derive(Clone, Default, Deserialize, Serialize)]
#[serde(tag = "mode", rename_all = "camelCase", deny_unknown_fields)]
pub(crate) enum Preferences {
    #[default]
    System,
    Direct,
    Manual {
        #[serde(rename = "proxyUrl")]
        proxy_url: String,
    },
}

impl Preferences {
    fn validated(self) -> Result<Self, &'static str> {
        let Self::Manual { proxy_url } = self else {
            return Ok(self);
        };
        const INVALID: &str = "请输入不含账号、密码或路径的 HTTP(S) 代理地址";
        if proxy_url.len() > 2048 {
            return Err(INVALID);
        }
        let url = Url::parse(proxy_url.trim()).map_err(|_| INVALID)?;
        if !matches!(url.scheme(), "http" | "https")
            || url.host().is_none()
            || !url.username().is_empty()
            || url.password().is_some()
            || url.path() != "/"
            || url.query().is_some()
            || url.fragment().is_some()
            || url.port_or_known_default() == Some(0)
        {
            return Err(INVALID);
        }
        Ok(Self::Manual {
            proxy_url: url.to_string(),
        })
    }

    async fn proxy(&self, target: &Url) -> Result<(Option<Proxy>, Route), &'static str> {
        if target.host_str().is_some_and(is_loopback_host) {
            return Ok((None, Route::Local));
        }
        let (proxy, route) = match self {
            Self::Direct => (None, Route::Direct),
            Self::Manual { proxy_url } => (
                Some(Proxy::all(proxy_url.as_str()).map_err(|_| INVALID_PROXY)?),
                Route::Manual,
            ),
            Self::System => {
                let Some(proxy) = system_proxy(target).await? else {
                    return Ok((None, Route::Direct));
                };
                (Some(proxy), Route::System)
            }
        };
        Ok((proxy, route))
    }
}

fn match_proxy(target: &Url, matcher: Matcher) -> Result<Option<Proxy>, &'static str> {
    let uri = target
        .origin()
        .ascii_serialization()
        .parse()
        .map_err(|_| INVALID_PROXY)?;
    let Some(intercept) = matcher.intercept(&uri) else {
        return Ok(None);
    };
    let mut proxy = Proxy::all(intercept.uri().to_string()).map_err(|_| INVALID_PROXY)?;
    if let Some(auth) = intercept.basic_auth() {
        proxy = proxy.custom_http_auth(auth.clone());
    } else if let Some((user, password)) = intercept.raw_auth() {
        proxy = proxy.basic_auth(user, password);
    }
    Ok(Some(proxy))
}

#[cfg(not(windows))]
async fn system_proxy(target: &Url) -> Result<Option<Proxy>, &'static str> {
    match_proxy(target, Matcher::from_system())
}

#[cfg(windows)]
async fn system_proxy(target: &Url) -> Result<Option<Proxy>, &'static str> {
    use windows::core::HSTRING;
    use windows::Foundation::Uri;
    use windows::Networking::Connectivity::NetworkInformation;

    // Preserve inherited CLI proxy overrides and their matching NO_PROXY rules.
    if ["HTTPS_PROXY", "ALL_PROXY"]
        .into_iter()
        .any(|name| std::env::var_os(name).is_some_and(|value| !value.is_empty()))
    {
        return match_proxy(target, Matcher::from_env());
    }

    const UNAVAILABLE: &str = "无法读取系统代理线路，请检查系统网络设置或选择其他线路";
    let origin = Uri::CreateUri(&HSTRING::from(target.origin().ascii_serialization()))
        .map_err(|_| UNAVAILABLE)?;
    let lookup =
        NetworkInformation::GetProxyConfigurationAsync(&origin).map_err(|_| UNAVAILABLE)?;
    let config = match tokio::time::timeout(std::time::Duration::from_secs(6), lookup.clone()).await
    {
        Ok(result) => result.map_err(|_| UNAVAILABLE)?,
        Err(_) => {
            let _ = lookup.Cancel();
            return Err(UNAVAILABLE);
        }
    };
    let candidates = config.ProxyUris().map_err(|_| UNAVAILABLE)?;
    if candidates.Size().map_err(|_| UNAVAILABLE)? > 0 {
        let first = candidates.GetAt(0).map_err(|_| UNAVAILABLE)?;
        let proxy_url = first.AbsoluteUri().map_err(|_| UNAVAILABLE)?.to_string();
        return Proxy::all(proxy_url).map(Some).map_err(|_| INVALID_PROXY);
    }
    if config.CanConnectDirectly().map_err(|_| UNAVAILABLE)? {
        Ok(None)
    } else {
        Err(UNAVAILABLE)
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
enum Route {
    Local,
    Direct,
    System,
    Manual,
}

pub(super) enum Operation {
    Discovery,
    Text,
    Image,
}

#[derive(Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Routes {
    discovery: Option<Route>,
    text: Option<Route>,
    image: Option<Route>,
}

pub(crate) struct ProviderNetwork {
    path: PathBuf,
    access: Mutex<Routes>,
}

impl ProviderNetwork {
    pub(crate) fn new(path: PathBuf) -> Self {
        Self {
            path,
            access: Mutex::default(),
        }
    }

    fn read(&self) -> Result<Preferences, &'static str> {
        let Some(bytes) =
            io::read(&self.path, MAX_PREFERENCES_BYTES).map_err(|_| SETTINGS_ERROR)?
        else {
            return Ok(Preferences::default());
        };
        serde_json::from_slice::<Preferences>(&bytes)
            .map_err(|_| SETTINGS_ERROR)?
            .validated()
            .map_err(|_| SETTINGS_ERROR)
    }

    pub(crate) fn preferences(&self) -> Result<Preferences, &'static str> {
        let _guard = self.access.lock().map_err(|_| SETTINGS_ERROR)?;
        self.read()
    }

    pub(crate) fn save(&self, preferences: Preferences) -> Result<Preferences, &'static str> {
        let preferences = preferences.validated()?;
        let _guard = self.access.lock().map_err(|_| SETTINGS_ERROR)?;
        let bytes = serde_json::to_vec(&preferences).map_err(|_| SETTINGS_ERROR)?;
        io::checked_metadata(&self.path).map_err(|_| SETTINGS_ERROR)?;
        io::atomic_write(&self.path, &bytes, true).map_err(|_| SETTINGS_ERROR)?;
        Ok(preferences)
    }

    pub(crate) fn routes(&self) -> Result<Routes, &'static str> {
        Ok(self.access.lock().map_err(|_| SETTINGS_ERROR)?.clone())
    }

    pub(super) async fn client(
        &self,
        target: &Url,
        operation: Operation,
    ) -> Result<Client, &'static str> {
        let preferences = if target.host_str().is_some_and(is_loopback_host) {
            Preferences::Direct
        } else {
            self.preferences()?
        };
        let (proxy, route) = preferences.proxy(target).await?;
        let client = validated_provider_client(target, proxy).await?;
        let mut recent = self.access.lock().map_err(|_| SETTINGS_ERROR)?;
        match operation {
            Operation::Discovery => recent.discovery = Some(route),
            Operation::Text => recent.text = Some(route),
            Operation::Image => recent.image = Some(route),
        }
        Ok(client)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
    use tokio::net::TcpListener;

    #[tokio::test]
    async fn saved_proxy_serves_all_model_operations_but_bypasses_loopback() {
        let root = crate::task_host::tests::root();
        let path = root.join("provider-network.json");
        let settings = ProviderNetwork::new(path.clone());
        assert!(matches!(
            settings.preferences().unwrap(),
            Preferences::System
        ));
        let proxy = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let proxy_url = format!("http://{}", proxy.local_addr().unwrap());
        settings.save(Preferences::Manual { proxy_url }).unwrap();
        assert!(settings
            .save(Preferences::Manual {
                proxy_url: "http://user:password@127.0.0.1:7890".into(),
            })
            .is_err());
        let settings = ProviderNetwork::new(path);
        assert!(matches!(
            settings.preferences().unwrap(),
            Preferences::Manual { .. }
        ));
        let remote = Url::parse("https://1.1.1.1/v1").unwrap();
        let fixture = async {
            for _ in 0..3 {
                let (socket, _) = proxy.accept().await.unwrap();
                let mut socket = BufReader::new(socket);
                let mut line = String::new();
                socket.read_line(&mut line).await.unwrap();
                assert_eq!(line, "CONNECT 1.1.1.1:443 HTTP/1.1\r\n");
                loop {
                    line.clear();
                    socket.read_line(&mut line).await.unwrap();
                    assert!(!line.to_ascii_lowercase().contains("authorization"));
                    if line == "\r\n" {
                        break;
                    }
                    assert!(!line.is_empty());
                }
                socket
                    .get_mut()
                    .write_all(b"HTTP/1.1 502 Bad Gateway\r\nContent-Length: 0\r\nConnection: close\r\n\r\n")
                    .await
                    .unwrap();
            }
        };
        let calls = async {
            for operation in [Operation::Discovery, Operation::Text, Operation::Image] {
                let client = settings.client(&remote, operation).await.unwrap();
                assert!(client
                    .get(remote.clone())
                    .bearer_auth("fixture")
                    .send()
                    .await
                    .is_err());
            }
        };
        tokio::time::timeout(std::time::Duration::from_secs(5), async {
            tokio::join!(fixture, calls);
        })
        .await
        .unwrap();
        let routes = settings.routes().unwrap();
        assert_eq!(routes.discovery, Some(Route::Manual));
        assert_eq!(routes.text, Some(Route::Manual));
        assert_eq!(routes.image, Some(Route::Manual));

        let local = Url::parse("http://127.0.0.1:11434").unwrap();
        settings.client(&local, Operation::Discovery).await.unwrap();
        assert_eq!(settings.routes().unwrap().discovery, Some(Route::Local));
        assert!(settings
            .client(
                &Url::parse("https://192.168.1.1").unwrap(),
                Operation::Image
            )
            .await
            .is_err());

        settings.save(Preferences::Direct).unwrap();
        settings.client(&remote, Operation::Text).await.unwrap();
        assert_eq!(settings.routes().unwrap().text, Some(Route::Direct));
        std::fs::remove_dir_all(root).unwrap();
    }
}
