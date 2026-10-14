use std::collections::HashMap;
use std::future::Future;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tokio::sync::watch;

const MAX_REQUESTS: usize = 16;
const PREPARED_TTL: Duration = Duration::from_secs(30);
const DISCOVERY_TIMEOUT: Duration = Duration::from_secs(10);
const CANCELLED: &str = "cancelled: 模型列表读取已取消";

struct Request {
    owner: String,
    cancellation: Arc<watch::Sender<bool>>,
    prepared_at: Instant,
    claimed: bool,
}

#[derive(Default)]
pub(crate) struct ModelRequests {
    requests: Mutex<HashMap<String, Request>>,
}

fn validate_id(request_id: &str) -> Result<(), String> {
    if request_id.len() != 36
        || !request_id.bytes().enumerate().all(|(index, byte)| {
            if matches!(index, 8 | 13 | 18 | 23) {
                byte == b'-'
            } else {
                byte.is_ascii_hexdigit()
            }
        })
    {
        return Err("invalid: requestId must be a UUID".into());
    }
    Ok(())
}

impl ModelRequests {
    pub(crate) fn prepare(&self, request_id: &str, owner: &str) -> Result<(), String> {
        validate_id(request_id)?;
        let mut requests = self.requests.lock().map_err(|_| "models: 请求状态不可用")?;
        requests
            .retain(|_, request| request.claimed || request.prepared_at.elapsed() < PREPARED_TTL);
        if requests.contains_key(request_id) {
            return Err("models: 请求已存在".into());
        }
        if requests.len() >= MAX_REQUESTS {
            return Err("models: 同时检测的连接过多".into());
        }
        let (cancellation, _) = watch::channel(false);
        requests.insert(
            request_id.into(),
            Request {
                owner: owner.into(),
                cancellation: Arc::new(cancellation),
                prepared_at: Instant::now(),
                claimed: false,
            },
        );
        Ok(())
    }

    pub(crate) fn claim(&self, request_id: &str, owner: &str) -> Result<ModelRequest<'_>, String> {
        validate_id(request_id)?;
        let mut requests = self.requests.lock().map_err(|_| "models: 请求状态不可用")?;
        let request = requests.get_mut(request_id).ok_or("models: 请求未准备")?;
        if request.owner != owner {
            return Err("models: 请求不属于当前窗口".into());
        }
        if request.claimed {
            return Err("models: 请求已开始".into());
        }
        if request.prepared_at.elapsed() >= PREPARED_TTL {
            requests.remove(request_id);
            return Err("models: 请求准备已过期".into());
        }
        if *request.cancellation.borrow() {
            requests.remove(request_id);
            return Err(CANCELLED.into());
        }
        request.claimed = true;
        Ok(ModelRequest {
            registry: self,
            request_id: request_id.into(),
            cancellation: Arc::clone(&request.cancellation),
        })
    }

    pub(crate) fn cancel(&self, request_id: &str, owner: &str) -> Result<bool, String> {
        validate_id(request_id)?;
        let requests = self.requests.lock().map_err(|_| "models: 请求状态不可用")?;
        let Some(request) = requests.get(request_id) else {
            return Ok(false);
        };
        if request.owner != owner {
            return Err("models: 请求不属于当前窗口".into());
        }
        // Keep cancellation even when fetch has not subscribed yet.
        request.cancellation.send_replace(true);
        Ok(true)
    }

    pub(crate) fn release(&self, request_id: &str, owner: &str) -> Result<bool, String> {
        validate_id(request_id)?;
        let mut requests = self.requests.lock().map_err(|_| "models: 请求状态不可用")?;
        let Some(request) = requests.get(request_id) else {
            return Ok(false);
        };
        if request.owner != owner {
            return Err("models: 请求不属于当前窗口".into());
        }
        if request.claimed {
            request.cancellation.send_replace(true);
        } else {
            requests.remove(request_id);
        }
        Ok(true)
    }
}

pub(crate) struct ModelRequest<'a> {
    registry: &'a ModelRequests,
    request_id: String,
    cancellation: Arc<watch::Sender<bool>>,
}

impl ModelRequest<'_> {
    pub(crate) async fn run<T>(
        self,
        future: impl Future<Output = Result<T, String>>,
    ) -> Result<T, String> {
        let mut cancellation = self.cancellation.subscribe();
        let result = tokio::select! {
            biased;
            _ = cancellation.wait_for(|cancelled| *cancelled) => Err(CANCELLED.into()),
            result = tokio::time::timeout(DISCOVERY_TIMEOUT, future) => {
                result.map_err(|_| "models: 模型列表读取超时".to_string())?
            }
        };
        drop(self);
        result
    }
}

impl Drop for ModelRequest<'_> {
    fn drop(&mut self) {
        if let Ok(mut requests) = self.registry.requests.lock() {
            if requests
                .get(&self.request_id)
                .is_some_and(|request| Arc::ptr_eq(&request.cancellation, &self.cancellation))
            {
                requests.remove(&self.request_id);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicBool, Ordering};

    const ID: &str = "4ce6d4db-0c7c-4d9a-9a5c-7bcfefbc2bfa";

    #[test]
    fn ids_ownership_and_duplicate_claims_are_checked() {
        let requests = ModelRequests::default();
        for invalid in [
            "",
            "a",
            "4ce6d4db0c7c4d9a9a5c7bcfefbc2bfa",
            "zce6d4db-0c7c-4d9a-9a5c-7bcfefbc2bfa",
        ] {
            assert!(requests.prepare(invalid, "main").is_err());
        }
        assert!(requests.claim(ID, "main").is_err());
        requests.prepare(ID, "main").unwrap();
        assert!(requests.prepare(ID, "main").is_err());
        assert!(requests.claim(ID, "other").is_err());
        assert!(requests.cancel(ID, "other").is_err());
        assert!(requests.release(ID, "other").is_err());
        let permit = requests.claim(ID, "main").unwrap();
        assert!(requests.claim(ID, "main").is_err());
        drop(permit);
        assert!(!requests.release(ID, "main").unwrap());
        requests.prepare(ID, "main").unwrap();
        assert!(requests.release(ID, "main").unwrap());
    }

    #[test]
    fn cancellation_before_fetch_is_preserved() {
        let requests = ModelRequests::default();
        requests.prepare(ID, "main").unwrap();
        assert!(requests.cancel(ID, "main").unwrap());
        assert_eq!(requests.claim(ID, "main").err().unwrap(), CANCELLED);
        assert!(!requests.release(ID, "main").unwrap());
    }

    #[test]
    fn abandoned_prepares_expire_without_evicting_live_requests() {
        let requests = ModelRequests::default();
        requests.prepare(ID, "main").unwrap();
        let permit = requests.claim(ID, "main").unwrap();
        for index in 1..MAX_REQUESTS {
            requests
                .prepare(&format!("00000000-0000-4000-8000-{index:012x}"), "main")
                .unwrap();
        }
        let next = "11111111-1111-4111-8111-111111111111";
        assert!(requests.prepare(next, "main").is_err());
        for request in requests.requests.lock().unwrap().values_mut() {
            request.prepared_at = Instant::now() - PREPARED_TTL;
        }
        requests.prepare(next, "main").unwrap();
        assert!(requests.claim(ID, "main").is_err());
        assert!(requests.cancel(ID, "main").unwrap());
        assert!(requests.claim(next, "main").is_ok());
        drop(permit);
    }

    #[test]
    fn expired_claim_is_rejected_and_old_guard_cannot_remove_replacement() {
        let requests = ModelRequests::default();
        requests.prepare(ID, "main").unwrap();
        requests
            .requests
            .lock()
            .unwrap()
            .get_mut(ID)
            .unwrap()
            .prepared_at = Instant::now() - PREPARED_TTL;
        assert!(requests.claim(ID, "main").is_err());
        requests.prepare(ID, "main").unwrap();
        let old = requests.claim(ID, "main").unwrap();
        requests.requests.lock().unwrap().remove(ID);
        requests.prepare(ID, "main").unwrap();
        drop(old);
        assert!(requests.claim(ID, "main").is_ok());
    }

    #[tokio::test]
    async fn claimed_cancellation_before_execution_skips_all_work() {
        let requests = ModelRequests::default();
        requests.prepare(ID, "main").unwrap();
        let permit = requests.claim(ID, "main").unwrap();
        requests.cancel(ID, "main").unwrap();
        let polled = AtomicBool::new(false);
        let result = permit
            .run(async {
                polled.store(true, Ordering::SeqCst);
                Ok(())
            })
            .await;
        assert_eq!(result.unwrap_err(), CANCELLED);
        assert!(!polled.load(Ordering::SeqCst));
        assert!(!requests.release(ID, "main").unwrap());
    }

    struct Dropped<'a>(&'a AtomicBool);
    impl Drop for Dropped<'_> {
        fn drop(&mut self) {
            self.0.store(true, Ordering::SeqCst);
        }
    }

    #[tokio::test]
    async fn release_cancels_claimed_work_and_drops_the_running_future() {
        let requests = ModelRequests::default();
        requests.prepare(ID, "main").unwrap();
        let permit = requests.claim(ID, "main").unwrap();
        let dropped = AtomicBool::new(false);
        let running = permit.run(async {
            let _drop = Dropped(&dropped);
            std::future::pending::<Result<(), String>>().await
        });
        let cancel = async {
            tokio::task::yield_now().await;
            assert!(requests.release(ID, "main").unwrap());
            assert!(requests.prepare(ID, "main").is_err());
        };
        let (result, ()) = tokio::time::timeout(Duration::from_secs(1), async {
            tokio::join!(running, cancel)
        })
        .await
        .unwrap();
        assert_eq!(result.unwrap_err(), CANCELLED);
        assert!(dropped.load(Ordering::SeqCst));
        requests.prepare(ID, "main").unwrap();
    }

    #[tokio::test]
    async fn cancellation_closes_actual_model_discovery_http_socket() {
        use tokio::io::{AsyncReadExt, AsyncWriteExt};

        for partial_body in [false, true] {
            let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
            let base_url = format!("http://{}/v1", listener.local_addr().unwrap());
            let (ready_tx, ready_rx) = tokio::sync::oneshot::channel();
            let server = tokio::spawn(async move {
                let (mut socket, _) = listener.accept().await.unwrap();
                let mut request = Vec::new();
                while !request.ends_with(b"\r\n\r\n") {
                    let mut bytes = [0; 1024];
                    let count = socket.read(&mut bytes).await.unwrap();
                    assert!(count > 0, "discovery must send its HTTP request");
                    request.extend_from_slice(&bytes[..count]);
                    assert!(request.len() <= 4096);
                }
                assert!(request.starts_with(b"GET /v1/models HTTP/1.1\r\n"));
                if partial_body {
                    socket
                        .write_all(b"HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: 100\r\n\r\n{\"data\":[{\"id\":\"fixture")
                        .await
                        .unwrap();
                }
                ready_tx.send(()).unwrap();
                let mut bytes = [0; 1];
                match socket.read(&mut bytes).await {
                    Ok(0) => (),
                    Err(error)
                        if matches!(
                            error.kind(),
                            std::io::ErrorKind::ConnectionReset
                                | std::io::ErrorKind::ConnectionAborted
                        ) =>
                    {
                        ()
                    }
                    result => panic!("cancelled discovery left its socket open: {result:?}"),
                }
            });
            let requests = ModelRequests::default();
            requests.prepare(ID, "main").unwrap();
            let running =
                requests
                    .claim(ID, "main")
                    .unwrap()
                    .run(crate::task_host::discover_models(
                        &base_url,
                        Some("ollama"),
                        Some("none"),
                        None,
                    ));
            let cancel = async {
                ready_rx.await.unwrap();
                tokio::task::yield_now().await;
                assert!(requests.cancel(ID, "main").unwrap());
            };
            let (result, (), closed) = tokio::time::timeout(Duration::from_secs(2), async {
                tokio::join!(running, cancel, server)
            })
            .await
            .expect("cancellation must close the actual HTTP socket promptly");
            closed.unwrap();
            assert_eq!(result.unwrap_err(), CANCELLED);
            assert!(!requests.release(ID, "main").unwrap());
            requests.prepare(ID, "main").unwrap();
        }
    }

    #[tokio::test]
    async fn timeout_drops_work_and_releases_capacity() {
        let requests = ModelRequests::default();
        requests.prepare(ID, "main").unwrap();
        let dropped = AtomicBool::new(false);
        let result = tokio::time::timeout(
            Duration::from_secs(11),
            requests.claim(ID, "main").unwrap().run(async {
                let _drop = Dropped(&dropped);
                std::future::pending::<Result<(), String>>().await
            }),
        )
        .await
        .unwrap();
        assert!(result.unwrap_err().starts_with("models:"));
        assert!(dropped.load(Ordering::SeqCst));
        requests.prepare(ID, "main").unwrap();
    }

    #[tokio::test]
    async fn completion_and_error_release_the_request() {
        let requests = ModelRequests::default();
        requests.prepare(ID, "main").unwrap();
        assert_eq!(
            requests
                .claim(ID, "main")
                .unwrap()
                .run(async { Ok(7) })
                .await
                .unwrap(),
            7
        );
        requests.prepare(ID, "main").unwrap();
        assert_eq!(
            requests
                .claim(ID, "main")
                .unwrap()
                .run(async { Err::<(), _>("credential: fixture".into()) })
                .await
                .unwrap_err(),
            "credential: fixture"
        );
        assert!(!requests.cancel(ID, "main").unwrap());
    }
}
