use super::*;
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct ComfyReceipt {
    pub endpoint: String,
    pub prompt_id: String,
    pub output_node_ids: Vec<String>,
    pub model: String,
    pub provider_name: Option<String>,
    pub prompt_hash: Option<String>,
}
#[cfg(test)]
#[path = "task_host_comfy_recovery_tests.rs"]
mod tests;
impl ComfyReceipt {
    pub(super) fn validate(&self) -> Result<(), String> {
        crate::comfy_transport::loopback_endpoint(Some(&self.endpoint))?;
        let valid = |id: &str| {
            !id.is_empty()
                && id.len() <= 160
                && id
                    .bytes()
                    .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'_' | b'-'))
        };
        if !valid(&self.prompt_id)
            || self.output_node_ids.is_empty()
            || self.output_node_ids.len() > 16
            || self.output_node_ids.iter().any(|id| !valid(id))
            || self.model.len() > 120
            || self
                .provider_name
                .as_ref()
                .is_some_and(|name| name.len() > 240)
            || self
                .prompt_hash
                .as_ref()
                .is_some_and(|hash| hash.len() > 200)
        {
            return Err("corrupt: ComfyUI 受理回执无效，原记录已保留".into());
        }
        Ok(())
    }
    pub(super) fn output_metadata(&self, task_id: &str, bytes: &[u8], mime: &str) -> Value {
        let sha = format!("{:x}", Sha256::digest(bytes));
        let mut metadata = json!({"assetId":format!("asset-{}", &sha[..24]),"sha256":sha,"mime":mime,"tags":["generated"],"sourceJobId":task_id,"isAiGenerated":true,"source":"provider","provenance":{"provider":self.provider_name.as_deref().unwrap_or("ComfyUI"),"model":self.model,"generatedAt":rfc3339_now(),"providerRequestId":self.prompt_id}});
        if let Some(hash) = &self.prompt_hash {
            metadata["promptHash"] = json!(hash);
        }
        metadata
    }
}
impl TaskHost {
    pub(super) fn persist_comfy_receipt(
        &self,
        task_id: &str,
        fingerprint: &str,
        receipt: &ComfyReceipt,
    ) -> Result<(), String> {
        receipt.validate()?;
        let _lock = self.lock()?;
        let mut journal = self
            .read_one_unlocked(task_id)?
            .ok_or("io: 原生任务记录缺失")?;
        if journal.fingerprint != fingerprint {
            return Err("conflict: 原生任务身份已变化".into());
        }
        journal.comfy_receipt = Some(receipt.clone());
        self.write_one_unlocked(&journal)
    }
    pub(crate) fn recover_comfy(self: Arc<Self>, task_id: &str) -> Result<(), String> {
        validate_id(task_id, "taskId")?;
        let _lock = self.lock()?;
        let Some(mut journal) = self.read_one_unlocked(task_id)? else {
            return Ok(());
        };
        let Some(receipt) = journal.comfy_receipt.clone() else {
            return Ok(());
        };
        if !matches!(journal.record.status.as_str(), "unknown" | "submitted")
            || journal
                .record
                .failure
                .as_ref()
                .is_some_and(|error| error.failure_class == "cancelled")
        {
            return Ok(());
        }
        let mut jobs = self.jobs.lock().map_err(|_| "io: 原生任务锁不可用")?;
        if jobs.contains_key(task_id) {
            return Ok(());
        }
        journal.record.status = "submitted".into();
        journal.record.failure = None;
        self.write_one_unlocked(&journal)?;
        let control = JobControl {
            cancelled: Arc::new(AtomicBool::new(false)),
            wake: Arc::new(Notify::new()),
            capacity_key: format!("local:{}", receipt.endpoint.trim_end_matches('/')),
        };
        jobs.insert(task_id.into(), control.clone());
        let host = Arc::clone(&self);
        tauri::async_runtime::spawn(async move {
            let result = host
                .poll_comfy_receipt(&journal.record, &journal.fingerprint, &control, &receipt)
                .await;
            host.finish_run(
                &journal.record.task_id,
                &journal.fingerprint,
                control,
                result,
            );
        });
        Ok(())
    }
}
