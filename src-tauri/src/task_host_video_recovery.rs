use super::*;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(in crate::task_host) struct VideoSlot {
    pub index: u32,
    pub acceptance: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub job_id: Option<String>,
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub partial: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(in crate::task_host) struct VideoReceipt {
    pub endpoint: String,
    pub model: String,
    pub credential_ref: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider_name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt_hash: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub concurrency_limit: Option<usize>,
    pub slots: Vec<VideoSlot>,
}

impl VideoReceipt {
    pub(in crate::task_host) fn validate(&self, record: &JobRecord) -> Result<(), String> {
        let invalid = || "corrupt: 视频受理回执无效，原记录已保留".to_string();
        video_base(&self.endpoint).map_err(|_| invalid())?;
        if !matches!(
            self.model.as_str(),
            "veo-3.1-generate-preview" | "veo-3.1-fast-generate-preview"
        ) || self.credential_ref.is_empty()
            || self.credential_ref.len() > MAX_ID
            || self
                .provider_name
                .as_ref()
                .is_some_and(|s| s.chars().count() > 80)
            || self
                .prompt_hash
                .as_ref()
                .is_some_and(|s| s.chars().count() > 200)
            || self.slots.len() != record.output_indices.len()
            || self.slots.len() > MAX_OUTPUTS
            || self
                .concurrency_limit
                .is_some_and(|limit| !(1..=256).contains(&limit))
        {
            return Err(invalid());
        }
        for (i, slot) in self.slots.iter().enumerate() {
            if !record.output_indices.contains(&slot.index)
                || self.slots[..i].iter().any(|s| s.index == slot.index)
                || !matches!(
                    slot.acceptance.as_str(),
                    "unsubmitted" | "unknown" | "accepted" | "rejected"
                )
                || (slot.acceptance == "accepted") != slot.job_id.is_some()
                || (slot.partial && slot.acceptance != "accepted")
                || slot.job_id.as_ref().is_some_and(|s| !valid_job_id(s))
            {
                return Err(invalid());
            }
        }
        Ok(())
    }

    pub(super) fn metadata(&self, task_id: &str, bytes: &[u8], mime: &str, job_id: &str) -> Value {
        let sha = format!("{:x}", Sha256::digest(bytes));
        let mut value = json!({"assetId":format!("asset-{}",&sha[..24]),"sha256":sha,"mime":mime,"tags":["generated"],"sourceJobId":task_id,"isAiGenerated":true,"source":"provider","provenance":{"provider":self.provider_name.as_deref().unwrap_or("12AI"),"model":self.model,"generatedAt":rfc3339_now(),"providerRequestId":job_id}});
        if let Some(hash) = &self.prompt_hash {
            value["promptHash"] = json!(hash);
        }
        value
    }
}

impl TaskHost {
    pub(super) fn persist_video_receipt(
        &self,
        task_id: &str,
        fingerprint: &str,
        receipt: &VideoReceipt,
    ) -> Result<(), String> {
        let _lock = self.lock()?;
        let mut journal = self
            .read_one_unlocked(task_id)?
            .ok_or("io: 原生任务记录缺失")?;
        if journal.fingerprint != fingerprint {
            return Err("conflict: 原生任务身份已变化".into());
        }
        receipt.validate(&journal.record)?;
        journal.video_receipt = Some(receipt.clone());
        self.write_one_unlocked(&journal)
    }

    /// Caller holds the existing journal/repository transaction, as for Comfy recovery.
    pub(in crate::task_host) fn recover_video_unlocked(
        self: Arc<Self>,
        mut journal: JournalRecord,
    ) -> Result<(), String> {
        let Some(receipt) = journal.video_receipt.clone() else {
            return Ok(());
        };
        if !matches!(journal.record.status.as_str(), "unknown" | "submitted")
            || journal
                .record
                .failure
                .as_ref()
                .is_some_and(|e| e.failure_class == "cancelled")
            || !receipt.slots.iter().any(|s| s.acceptance == "accepted")
        {
            return Ok(());
        }
        let mut jobs = self.jobs.lock().map_err(|_| "io: 原生任务锁不可用")?;
        if jobs.contains_key(&journal.record.task_id) {
            return Ok(());
        }
        if jobs
            .values()
            .filter(|job| job.capacity_key == receipt.credential_ref)
            .count()
            >= receipt.concurrency_limit.unwrap_or(1)
        {
            return Ok(());
        }
        journal.record.status = "submitted".into();
        journal.record.failure = None;
        self.write_one_unlocked(&journal)?;
        let control = JobControl {
            cancelled: Arc::new(AtomicBool::new(false)),
            wake: Arc::new(Notify::new()),
            capacity_key: receipt.credential_ref.clone(),
        };
        jobs.insert(journal.record.task_id.clone(), control.clone());
        let host = Arc::clone(&self);
        tauri::async_runtime::spawn(async move {
            let result = async {
                let base = video_base(&receipt.endpoint).map_err(|_| RunError::failed("invalid_request","原视频服务地址无效"))?;
                let client = tokio::select! {
                    biased;
                    _ = text::cancelled(&control) => return Err(stopped()),
                    result = pinned_download_client(&base) => result.map_err(|m| RunError::unknown("network",m,vec![]))?,
                };
                let secret = credential(&receipt.credential_ref).ok().flatten().filter(|v| !v.is_empty()).ok_or_else(|| RunError::unknown("unauthorized","原视频凭据不可用，请恢复原连接后重试查询",vec![]))?;
                host.poll_video_receipt(&journal.record, &journal.fingerprint, &control, &receipt, &client, &base, &secret).await
            }.await;
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
