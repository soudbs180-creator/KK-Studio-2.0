use base64::{engine::general_purpose::STANDARD, Engine};
use serde::Serialize;
use serde_json::{json, Value};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

#[path = "asset_io.rs"]
mod io;
#[cfg(test)]
#[path = "asset_storage_tests.rs"]
mod tests;
#[path = "asset_validation.rs"]
pub(crate) mod validation;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadAsset {
    pub metadata: Value,
    pub data_base64: String,
}

pub struct AssetRepository {
    root: PathBuf,
    lock: Mutex<()>,
}

impl AssetRepository {
    pub fn new(root: PathBuf) -> Self {
        Self {
            root,
            lock: Mutex::new(()),
        }
    }
    fn prepare(&self) -> Result<fs::File, String> {
        io::directory(&self.root)?;
        let lock = io::lock(&self.root)?;
        io::directory(&self.root.join("blobs"))?;
        io::directory(&self.root.join("records"))?;
        Ok(lock)
    }
    fn record_path(&self, id: &str) -> PathBuf {
        self.root.join("records").join(format!("{id}.json"))
    }
    fn blob_path(&self, sha: &str) -> PathBuf {
        self.root.join("blobs").join(sha)
    }
    fn record(&self, id: &str) -> Result<Option<Value>, String> {
        io::read(&self.record_path(id), validation::MAX_RECORD_BYTES)?
            .map(|bytes| validation::decode_record(&bytes, id))
            .transpose()
    }
    fn verified_blob(&self, metadata: &Value) -> Result<Vec<u8>, String> {
        let sha = metadata["sha256"].as_str().unwrap();
        let bytes = io::read(&self.blob_path(sha), validation::MAX_BYTES)?
            .ok_or_else(|| "missing: 素材记录对应的原件丢失，未重置归档".to_string())?;
        if bytes.is_empty() || validation::hash(&bytes) != sha {
            return Err("corrupt: 素材原件 SHA-256 校验失败，已保留原文件".into());
        }
        Ok(bytes)
    }
    pub fn store(&self, data_base64: String, metadata: Value) -> Result<Value, String> {
        validation::metadata(&metadata)?;
        if data_base64.len() > validation::MAX_BYTES.div_ceil(3) * 4 {
            return Err(validation::invalid("大小超过 100 MiB"));
        }
        let bytes = STANDARD
            .decode(data_base64)
            .map_err(|_| validation::invalid("dataBase64"))?;
        if bytes.is_empty() || bytes.len() > validation::MAX_BYTES {
            return Err(validation::invalid("大小必须为 1 至 100 MiB"));
        }
        let sha = validation::hash(&bytes);
        if metadata["sha256"] != sha {
            return Err(validation::invalid("SHA-256 与原件不匹配"));
        }
        let id = format!("asset-{}", &sha[..24]);
        let _guard = self.lock.lock().map_err(|_| io::error("素材锁不可用"))?;
        let _file_lock = self.prepare()?;
        let stored = if let Some(old) = self.record(&id)? {
            if old["sha256"] != sha {
                return Err("conflict: 素材 ID 的完整 SHA-256 不匹配".into());
            }
            self.verified_blob(&old)?;
            validation::merge(&old, &metadata)
        } else {
            if io::read(&self.blob_path(&sha), validation::MAX_BYTES)?.is_some() {
                self.verified_blob(&metadata)?;
            } else {
                io::atomic_write(&self.blob_path(&sha), &bytes, false)?;
            }
            metadata
        };
        // The immutable original is verified before the record can make it visible.
        self.verified_blob(&stored)?;
        let raw =
            serde_json::to_vec(&json!({"version":1, "metadata":stored})).map_err(io::error)?;
        if raw.len() > validation::MAX_RECORD_BYTES {
            return Err(validation::invalid("metadata 大小"));
        }
        io::atomic_write(&self.record_path(&id), &raw, true)?;
        Ok(stored)
    }
    pub fn read(&self, asset_id: &str) -> Result<Option<ReadAsset>, String> {
        validation::asset_id(asset_id)?;
        let _guard = self.lock.lock().map_err(|_| io::error("素材锁不可用"))?;
        let _file_lock = self.prepare()?;
        let Some(metadata) = self.record(asset_id)? else {
            return Ok(None);
        };
        let data_base64 = STANDARD.encode(self.verified_blob(&metadata)?);
        Ok(Some(ReadAsset {
            metadata,
            data_base64,
        }))
    }
    pub fn list(&self) -> Result<Vec<Value>, String> {
        let _guard = self.lock.lock().map_err(|_| io::error("素材锁不可用"))?;
        let _file_lock = self.prepare()?;
        let mut entries: Vec<_> = fs::read_dir(self.root.join("records"))
            .map_err(io::error)?
            .collect::<Result<_, _>>()
            .map_err(io::error)?;
        entries.sort_by_key(|entry| entry.file_name());
        let mut records = Vec::new();
        for entry in entries {
            let path = entry.path();
            // Crash-interrupted temporary files do not represent committed records.
            if path
                .extension()
                .is_some_and(|extension| extension != "json")
            {
                continue;
            }
            let id = path
                .file_stem()
                .and_then(|stem| stem.to_str())
                .ok_or_else(|| "corrupt: 素材记录文件名无效".to_string())?;
            validation::asset_id(id).map_err(|_| "corrupt: 素材记录文件名无效".to_string())?;
            let record = self
                .record(id)?
                .ok_or_else(|| "missing: 素材记录已丢失".to_string())?;
            self.verified_blob(&record)?;
            records.push(record);
        }
        Ok(records)
    }
}
