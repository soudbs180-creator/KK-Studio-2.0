use super::{
    catalog::{hex, FileSpec},
    paths,
};
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs::{File, OpenOptions};
use std::io::{Read, Seek, SeekFrom, Write};
use std::net::{IpAddr, SocketAddr};
use std::path::{Path, PathBuf};
use std::sync::{atomic::AtomicBool, Arc};
use std::time::Duration;

const CHECKPOINT: u64 = 8 * 1024 * 1024;
#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Partial {
    version: u8,
    source: String,
    sha256: String,
    bytes: u64,
    completed: u64,
    prefix_sha256: String,
    validator: Option<String>,
    directory_identity: String,
    #[serde(default)]
    restart_required: bool,
    #[serde(default)]
    file_identity: Option<String>,
}
pub(super) struct Transport {
    #[cfg(test)]
    pub local_fixture: bool,
}
impl Default for Transport {
    fn default() -> Self {
        Self {
            #[cfg(test)]
            local_fixture: false,
        }
    }
}
async fn wait_cancel(cancel: &AtomicBool) {
    loop {
        if paths::cancelled(cancel).is_err() {
            return;
        }
        tokio::time::sleep(Duration::from_millis(20)).await;
    }
}

fn public(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(v) => {
            let b = v.octets();
            !v.is_private()
                && !v.is_loopback()
                && !v.is_link_local()
                && !v.is_multicast()
                && !v.is_unspecified()
                && !v.is_broadcast()
                && b[0] != 0
                && b[0] < 224
                && !(b[0] == 100 && (64..=127).contains(&b[1]))
                && !(b[0] == 192 && (b[1] == 0 || b[1] == 2))
                && !(b[0] == 198 && (b[1] == 18 || b[1] == 19 || b[1] == 51))
                && !(b[0] == 203 && b[1] == 0 && b[2] == 113)
        }
        IpAddr::V6(v) => {
            if let Some(v4) = v.to_ipv4_mapped() {
                return public(IpAddr::V4(v4));
            }
            let s = v.segments();
            s[0] & 0xe000 == 0x2000
                && s[0] != 0x2002
                && !(s[0] == 0x2001 && (s[1] == 0xdb8 || s[1] < 0x200))
        }
    }
}
fn allowed(host: &str) -> bool {
    matches!(
        host,
        "github.com"
            | "release-assets.githubusercontent.com"
            | "objects.githubusercontent.com"
            | "huggingface.co"
            | "cdn-lfs.huggingface.co"
            | "cdn-lfs.hf.co"
            | "cdn-lfs-us-1.hf.co"
            | "cdn-lfs-eu-1.hf.co"
            | "cas-bridge.xethub.hf.co"
            | "cas-server.xethub.hf.co"
            | "cas-server.xethub-eu.hf.co"
            | "transfer.xethub.hf.co"
            | "transfer.xethub-eu.hf.co"
            | "us.aws.cdn.hf.co"
            | "us.gcp.cdn.hf.co"
            | "modelscope.cn"
            | "cdn-lfs-cn-1.modelscope.cn"
            | "cdn-lfs-cn-2.modelscope.cn"
    )
}
impl Transport {
    async fn client(&self, url: &reqwest::Url) -> Result<reqwest::Client, String> {
        if !url.username().is_empty() || url.password().is_some() || url.fragment().is_some() {
            return Err("network: 下载地址无效".into());
        }
        #[cfg(test)]
        if self.local_fixture && url.scheme() == "http" && url.host_str() == Some("127.0.0.1") {
            return reqwest::Client::builder()
                .no_proxy()
                .redirect(reqwest::redirect::Policy::none())
                .build()
                .map_err(|_| "network: 测试客户端失败".into());
        }
        let host = url.host_str().ok_or("network: 下载地址无效")?;
        if url.scheme() != "https" || !allowed(host) || url.port_or_known_default() != Some(443) {
            return Err("network: 下载重定向来源尚未受信".into());
        }
        let resolved =
            tokio::time::timeout(Duration::from_secs(8), tokio::net::lookup_host((host, 443)))
                .await
                .map_err(|_| "network: 下载域名解析超时")?
                .map_err(|_| "network: 下载域名解析失败")?
                .collect::<Vec<SocketAddr>>();
        if resolved.is_empty() || resolved.iter().any(|a| !public(a.ip())) {
            return Err("network: 下载域名解析到受限网络".into());
        }
        reqwest::Client::builder()
            .no_proxy()
            .redirect(reqwest::redirect::Policy::none())
            .connect_timeout(Duration::from_secs(15))
            .resolve(host, resolved[0])
            .build()
            .map_err(|_| "network: 下载客户端不可用".into())
    }
    async fn response(
        &self,
        spec: &FileSpec,
        offset: u64,
        validator: Option<&str>,
        cancel: &AtomicBool,
    ) -> Result<reqwest::Response, String> {
        let mut url = reqwest::Url::parse(&spec.source).map_err(|_| "network: 固定来源无效")?;
        for _ in 0..5 {
            paths::cancelled(cancel)?;
            let client = self.client(&url).await?;
            let mut request = client
                .get(url.clone())
                .header("Accept-Encoding", "identity");
            if offset > 0 {
                request = request.header("Range", format!("bytes={offset}-"));
                if let Some(value) = validator {
                    request = request.header("If-Range", value);
                }
            }
            let response = tokio::time::timeout(Duration::from_secs(30), request.send())
                .await
                .map_err(|_| "network: 下载响应超时")?
                .map_err(|_| "network: 下载连接失败")?;
            if response.status().is_redirection() {
                let value = response
                    .headers()
                    .get("location")
                    .and_then(|v| v.to_str().ok())
                    .ok_or("network: 下载重定向无效")?;
                url = url.join(value).map_err(|_| "network: 下载重定向无效")?;
                continue;
            }
            return Ok(response);
        }
        Err("network: 下载重定向次数过多".into())
    }
}
fn validator(response: &reqwest::Response) -> Option<String> {
    response
        .headers()
        .get("etag")
        .and_then(|v| v.to_str().ok())
        .filter(|v| {
            v.len() >= 2
                && v.len() <= 256
                && v.starts_with('"')
                && v.ends_with('"')
                && !v.chars().any(char::is_control)
        })
        .map(str::to_owned)
}
fn response_bounds(response: &reqwest::Response, offset: u64, expected: u64) -> Result<(), String> {
    if response
        .headers()
        .get("content-encoding")
        .is_some_and(|v| v != "identity")
    {
        return Err("integrity: 下载内容编码不符".into());
    }
    if offset > 0 {
        if response.status() != reqwest::StatusCode::PARTIAL_CONTENT {
            return Err("resume: 服务未确认精确续传，部分文件已保留".into());
        }
        let range = response
            .headers()
            .get("content-range")
            .and_then(|v| v.to_str().ok())
            .ok_or("resume: 响应缺少范围")?;
        if range != format!("bytes {offset}-{}/{expected}", expected - 1) {
            return Err("resume: 响应范围与固定制品不符".into());
        }
    } else if response.status() != reqwest::StatusCode::OK {
        return Err("network: 制品下载未返回成功状态".into());
    }
    if response
        .content_length()
        .is_some_and(|n| n != expected - offset)
    {
        return Err("integrity: 下载声明长度不符".into());
    }
    Ok(())
}
fn checkpoint(
    file: &mut File,
    record: &Path,
    meta: &mut Partial,
    bytes: u64,
    sha: &Sha256,
) -> Result<(), String> {
    file.sync_all().map_err(paths::error)?;
    meta.completed = bytes;
    meta.prefix_sha256 = format!("{:x}", sha.clone().finalize());
    paths::write_record(record, &serde_json::to_value(meta).map_err(paths::error)?)
}
fn reject(record: &Path, meta: &mut Partial) -> Result<(), String> {
    meta.restart_required = true;
    paths::write_record(record, &serde_json::to_value(meta).map_err(paths::error)?)
}
async fn verified(path: PathBuf, spec: FileSpec, cancel: Arc<AtomicBool>) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        if paths::file_hash(&path, spec.bytes, &cancel)? != spec.sha256 {
            return Err("integrity: 完整模型文件摘要不符，未发布".into());
        }
        Ok(())
    })
    .await
    .map_err(|_| "io: 文件校验线程失败")?
}
fn prefix(
    mut file: File,
    completed: u64,
    digest: String,
    cancel: &AtomicBool,
) -> Result<Sha256, String> {
    file.seek(SeekFrom::Start(0)).map_err(paths::error)?;
    let mut left = completed;
    let mut sha = Sha256::new();
    let mut buffer = [0u8; 65536];
    while left > 0 {
        paths::cancelled(cancel)?;
        let n = file
            .read(&mut buffer[..usize::min(left as usize, 65536)])
            .map_err(paths::error)?;
        if n == 0 {
            return Err("integrity: 续传前缀缺失".into());
        }
        sha.update(&buffer[..n]);
        left -= n as u64;
    }
    if format!("{:x}", sha.clone().finalize()) != digest {
        return Err("integrity: 续传前缀改变，未继续追加".into());
    }
    Ok(sha)
}
fn open_partial(path: &Path, exists: bool) -> Result<(File, String), String> {
    let mut options = OpenOptions::new();
    options.read(true).write(true);
    if exists {
        options.create(false);
    } else {
        options.create_new(true);
    }
    #[cfg(windows)]
    {
        use std::os::windows::fs::OpenOptionsExt;
        options.share_mode(0).custom_flags(0x00200000);
    }
    let file = options.open(path).map_err(paths::error)?;
    let identity = paths::partial_identity(&file, path)?;
    Ok((file, identity))
}
fn partial_record(
    directory: &paths::Directory,
    spec: &FileSpec,
    record: &Path,
) -> Result<Option<Partial>, String> {
    let Some(value) = paths::read_record(record)? else {
        return Ok(None);
    };
    let meta: Partial =
        serde_json::from_value(value).map_err(|_| "corrupt: 续传记录损坏，已保留")?;
    if meta.source != spec.source
        || meta.sha256 != spec.sha256
        || meta.bytes != spec.bytes
        || meta.directory_identity != directory.identity
        || meta.completed > spec.bytes
        || !hex(&meta.prefix_sha256, 64)
        || meta
            .validator
            .as_ref()
            .is_some_and(|v| v.len() > 256 || v.chars().any(char::is_control))
    {
        return Err("conflict: 续传记录不属于当前制品或目录".into());
    }
    Ok(Some(meta))
}
pub(super) fn reusable_bytes(
    directory: &paths::Directory,
    spec: &FileSpec,
    cancel: &AtomicBool,
) -> Result<u64, String> {
    let target = directory.child(&spec.relative, false)?;
    if paths::metadata(&target)?.is_some() {
        return if paths::file_hash(&target, spec.bytes, cancel)? == spec.sha256 {
            Ok(spec.bytes)
        } else {
            Err("integrity: 已有目标摘要不符，未抵扣空间".into())
        };
    }
    let part = directory.child(&format!(".partials/{}.part", spec.sha256), false)?;
    let record = directory.child(&format!(".partials/{}.json", spec.sha256), false)?;
    let Some(meta) = partial_record(directory, spec, &record)? else {
        return Ok(0);
    };
    if meta.restart_required || paths::metadata(&part)?.is_none() {
        return Ok(0);
    }
    let file = File::open(&part).map_err(paths::error)?;
    let identity = paths::partial_identity(&file, &part)?;
    if meta.file_identity.as_ref().is_some_and(|v| v != &identity) {
        return Err("conflict: 部分文件身份与回执不符".into());
    }
    let bytes = file.metadata().map_err(paths::error)?.len();
    if bytes < meta.completed || bytes > spec.bytes {
        return Ok(0);
    }
    match prefix(file, meta.completed, meta.prefix_sha256, cancel) {
        Ok(sha)
            if meta.completed < spec.bytes
                || format!("{:x}", sha.clone().finalize()) == spec.sha256 =>
        {
            Ok(meta.completed)
        }
        Err(error) if error.starts_with("cancelled:") => Err(error),
        _ => Ok(0),
    }
}
pub(super) async fn transfer(
    directory: &paths::Directory,
    spec: &FileSpec,
    cancel: Arc<AtomicBool>,
    transport: &Transport,
    progress: impl Fn(u64),
) -> Result<(), String> {
    paths::cancelled(&cancel)?;
    let target = directory.child(&spec.relative, true)?;
    if paths::metadata(&target)?.is_some() {
        verified(target, spec.clone(), Arc::clone(&cancel)).await?;
        progress(spec.bytes);
        return Ok(());
    }
    let part = directory.child(&format!(".partials/{}.part", spec.sha256), true)?;
    let record = directory.child(&format!(".partials/{}.json", spec.sha256), true)?;
    let existing = partial_record(directory, spec, &record)?;
    let mut meta = match existing {
        Some(value) => value,
        None => {
            if paths::metadata(&part)?.is_some() {
                return Err("conflict: 无身份的部分文件已保留".into());
            }
            Partial {
                version: 1,
                source: spec.source.clone(),
                sha256: spec.sha256.clone(),
                bytes: spec.bytes,
                completed: 0,
                prefix_sha256: format!("{:x}", Sha256::new().finalize()),
                validator: None,
                directory_identity: directory.identity.clone(),
                restart_required: false,
                file_identity: None,
            }
        }
    };
    // A second explicit Install may restart a rejected partial; keep the original failure evidence.
    if meta.restart_required {
        paths::cancelled(&cancel)?;
        let id = paths::random_id()?;
        if let Some(existing) = paths::metadata(&part)? {
            if !existing.is_file() {
                return Err("conflict: 部分文件被其他类型占用".into());
            }
            paths::rename(
                &part,
                &directory.child(&format!(".partials/rejected-{id}.part"), true)?,
                false,
            )?;
        }
        paths::rename(
            &record,
            &directory.child(&format!(".partials/rejected-{id}.json"), true)?,
            false,
        )?;
        meta.completed = 0;
        meta.prefix_sha256 = format!("{:x}", Sha256::new().finalize());
        meta.validator = None;
        meta.restart_required = false;
        meta.file_identity = None;
    }
    let exists = paths::metadata(&part)?;
    let (mut file, identity) = open_partial(&part, exists.is_some())?;
    if meta.file_identity.as_ref().is_some_and(|v| v != &identity) {
        return Err("conflict: 部分文件身份与回执不符".into());
    }
    meta.file_identity = Some(identity.clone());
    let mut sha = if exists.is_some() {
        let m = file.metadata().map_err(paths::error)?;
        if !m.is_file() {
            return Err("conflict: 部分文件被其他类型占用".into());
        }
        if m.len() < meta.completed || m.len() > spec.bytes {
            reject(&record, &mut meta)?;
            return Err("integrity: 部分文件长度不符".into());
        }
        let cloned = file.try_clone().map_err(paths::error)?;
        let completed = meta.completed;
        let digest = meta.prefix_sha256.clone();
        let flag = Arc::clone(&cancel);
        match tokio::task::spawn_blocking(move || prefix(cloned, completed, digest, &flag))
            .await
            .map_err(|_| "io: 前缀校验线程失败")?
        {
            Ok(value) => value,
            Err(error) => {
                if error.starts_with("integrity:") {
                    reject(&record, &mut meta)?;
                }
                return Err(error);
            }
        }
    } else {
        if meta.completed != 0 {
            reject(&record, &mut meta)?;
            return Err("integrity: 部分文件丢失".into());
        }
        Sha256::new()
    };
    paths::write_record(&record, &serde_json::to_value(&meta).map_err(paths::error)?)?;
    paths::partial_unchanged(&file, &identity)?;
    file.set_len(meta.completed).map_err(paths::error)?;
    file.seek(SeekFrom::Start(meta.completed))
        .map_err(paths::error)?;
    let mut completed = meta.completed;
    progress(completed);
    if completed < spec.bytes {
        let response = tokio::select! {biased;_=wait_cancel(&cancel)=>return Err("cancelled: 安装已取消，部分文件保留".into()),response=transport.response(spec,completed,meta.validator.as_deref(),&cancel)=>response?};
        if let Err(error) = response_bounds(&response, completed, spec.bytes) {
            if error.starts_with("resume:") {
                reject(&record, &mut meta)?;
            }
            return Err(error);
        }
        let current = validator(&response);
        if completed > 0 && meta.validator.is_some() && current != meta.validator {
            reject(&record, &mut meta)?;
            return Err("resume: 远端制品校验标识改变".into());
        }
        meta.validator = current;
        let mut stream = response.bytes_stream();
        let mut saved = completed;
        let result=async {
            loop {
                paths::cancelled(&cancel)?;
                let chunk=tokio::select!{biased;_=wait_cancel(&cancel)=>return Err("cancelled: 安装已取消，部分文件保留".into()),result=tokio::time::timeout(Duration::from_secs(30),stream.next())=>result.map_err(|_| "network: 模型下载读取超时")?};
                let Some(chunk)=chunk else{break;}; let chunk=chunk.map_err(|_| "network: 模型下载中断")?;
                if chunk.len()>1024*1024 || completed.saturating_add(chunk.len() as u64)>spec.bytes {return Err("integrity: 下载字节超过边界".into());}
                for bytes in chunk.chunks(65536) {paths::cancelled(&cancel)?;paths::partial_unchanged(&file,&identity)?; file.write_all(bytes).map_err(paths::error)?; sha.update(bytes); completed+=bytes.len() as u64;}
                if completed-saved>=CHECKPOINT {checkpoint(&mut file,&record,&mut meta,completed,&sha)?;saved=completed;}
                progress(completed);
            }
            if completed!=spec.bytes {return Err("integrity: 模型下载未完整结束".into());} Ok::<_,String>(())
        }.await;
        checkpoint(&mut file, &record, &mut meta, completed, &sha)?;
        result?;
    }
    drop(file);
    if let Err(error) = verified(part.clone(), spec.clone(), Arc::clone(&cancel)).await {
        if error.starts_with("integrity:") {
            reject(&record, &mut meta)?;
        }
        return Err(error);
    }
    paths::cancelled(&cancel)?;
    directory.child(&spec.relative, false)?;
    paths::rename(&part, &target, false)?;
    progress(spec.bytes);
    Ok(())
}
#[cfg(test)]
#[path = "download_tests.rs"]
mod tests;
