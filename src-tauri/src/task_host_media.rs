//! Native media protocols share the durable TaskHost journal and asset repository.
use super::*;
#[path = "task_host_video_recovery.rs"]
mod recovery;
pub(super) use recovery::VideoReceipt;
#[cfg(test)]
#[path = "task_host_media_tests.rs"]
mod tests;

#[path = "task_host_media_protocol.rs"]
mod protocol;
use protocol::*;

pub(super) fn preflight(
    request: &TaskHostRequest,
    assets: &AssetRepository,
) -> Result<(), RunError> {
    if request.kind.as_deref() == Some("video") {
        video_body(request, assets)?;
    }
    Ok(())
}
impl TaskHost {
    pub(super) async fn perform_media(
        &self,
        request: &TaskHostRequest,
        fingerprint: &str,
        control: &JobControl,
        client: Client,
        secret: &str,
    ) -> Result<Vec<String>, RunError> {
        if request.kind.as_deref() == Some("video") {
            let base = video_base(&request.base_url)
                .map_err(|_| RunError::failed("invalid_request", "视频服务地址无效"))?;
            return self
                .perform_video(request, fingerprint, control, &client, &base, secret)
                .await;
        }
        let Some(MediaInput::Audio {
            voice,
            format,
            speed,
        }) = &request.media
        else {
            return Err(RunError::failed("invalid_request", "语音参数缺失"));
        };
        let mut ids = Vec::new();
        for index in &request.output_indices {
            if control.cancelled.load(Ordering::Acquire) {
                return Err(stopped());
            }
            let response = tokio::select! {
                biased;
                _=text::cancelled(control)=>return Err(stopped()),
                result=client.post(format!("{}/audio/speech",request.base_url.trim_end_matches('/')))
                    .bearer_auth(secret).header("Idempotency-Key",format!("{}-{index}",request.idempotency_key))
                    .json(&json!({"model":request.model,"input":request.prompt,"voice":voice,"response_format":format,"speed":speed})).send()=>result.map_err(|_|RunError::unknown("network","语音请求连接中断",ids.clone()))?,
            };
            if !response.status().is_success() {
                let status = response.status();
                return Err(RunError {
                    failure: failure(
                        class_for_status(status),
                        status.as_u16(),
                        None,
                        "语音服务拒绝了请求",
                    ),
                    request_started: !status.is_client_error()
                        || status == StatusCode::REQUEST_TIMEOUT,
                    asset_ids: ids,
                });
            }
            let request_id = response
                .headers()
                .get("x-request-id")
                .and_then(|v| v.to_str().ok())
                .and_then(|value| safe_speech_request_id(value, secret));
            let (bytes, mime) = read_media_response(response, "audio", Some(format), control)
                .await
                .map_err(|mut e| {
                    e.asset_ids = ids.clone();
                    e
                })?;
            let metadata = image_output_metadata(request, &bytes, mime, &request_id);
            ids.push(self.archive_media(
                &request.task_id,
                fingerprint,
                *index,
                &bytes,
                metadata,
            )?);
        }
        Ok(ids)
    }
    fn archive_media(
        &self,
        task_id: &str,
        fingerprint: &str,
        index: u32,
        bytes: &[u8],
        metadata: Value,
    ) -> Result<String, RunError> {
        let stored = self
            .assets
            .store(STANDARD.encode(bytes), metadata)
            .map_err(|_| {
                RunError::unknown(
                    "provider_unavailable",
                    "媒体原件归档失败，请先核对供应商",
                    vec![],
                )
            })?;
        let id = stored["assetId"].as_str().unwrap_or_default().to_owned();
        self.persist_output(task_id, fingerprint, index, &id)
            .map_err(|_| {
                RunError::unknown(
                    "provider_unavailable",
                    "媒体归档状态写入失败",
                    vec![id.clone()],
                )
            })?;
        Ok(id)
    }
    fn persist_media_failure(
        &self,
        task_id: &str,
        fingerprint: &str,
        index: u32,
    ) -> Result<(), RunError> {
        let _lock = self
            .lock()
            .map_err(|_| RunError::unknown("provider_unavailable", "视频状态锁不可用", vec![]))?;
        let mut journal = self
            .read_one_unlocked(task_id)
            .map_err(|_| RunError::unknown("provider_unavailable", "视频记录读取失败", vec![]))?
            .ok_or_else(|| RunError::unknown("provider_unavailable", "视频记录缺失", vec![]))?;
        if journal.fingerprint != fingerprint {
            return Err(RunError::unknown(
                "provider_unavailable",
                "视频身份已变化",
                vec![],
            ));
        }
        let output = journal
            .record
            .outputs
            .iter_mut()
            .find(|o| o.index == index)
            .ok_or_else(|| RunError::unknown("provider_unavailable", "视频输出不存在", vec![]))?;
        if output.status != "succeeded" {
            output.status = "failed".into();
            output.error = Some("供应商确认失败或该输出未提交".into());
        }
        self.write_one_unlocked(&journal)
            .map_err(|_| RunError::unknown("provider_unavailable", "视频失败状态保存失败", vec![]))
    }
    fn persist_video_partial(
        &self,
        task_id: &str,
        fingerprint: &str,
        index: u32,
    ) -> Result<(), RunError> {
        let _lock = self
            .lock()
            .map_err(|_| RunError::unknown("provider_unavailable", "视频状态锁不可用", vec![]))?;
        let mut journal = self
            .read_one_unlocked(task_id)
            .map_err(|_| RunError::unknown("provider_unavailable", "视频记录读取失败", vec![]))?
            .ok_or_else(|| RunError::unknown("provider_unavailable", "视频记录缺失", vec![]))?;
        if journal.fingerprint != fingerprint {
            return Err(RunError::unknown(
                "provider_unavailable",
                "视频身份已变化",
                vec![],
            ));
        }
        let slot = journal
            .video_receipt
            .as_mut()
            .and_then(|r| r.slots.iter_mut().find(|s| s.index == index))
            .ok_or_else(|| RunError::unknown("provider_unavailable", "视频回执缺失", vec![]))?;
        slot.partial = true;
        self.write_one_unlocked(&journal).map_err(|_| {
            RunError::unknown("provider_unavailable", "视频部分完成状态保存失败", vec![])
        })
    }
    async fn perform_video(
        &self,
        request: &TaskHostRequest,
        fingerprint: &str,
        control: &JobControl,
        client: &Client,
        base: &reqwest::Url,
        secret: &str,
    ) -> Result<Vec<String>, RunError> {
        let body = video_body(request, &self.assets)?;
        let mut receipt = VideoReceipt {
            endpoint: video_base(&request.base_url)
                .map_err(|_| RunError::failed("invalid_request", "视频服务地址无效"))?
                .to_string(),
            model: request.model.clone(),
            credential_ref: request.credential_ref.clone(),
            provider_name: request.provider_name.clone(),
            prompt_hash: request.prompt_hash.clone(),
            concurrency_limit: request.concurrency_limit,
            slots: request
                .output_indices
                .iter()
                .map(|index| recovery::VideoSlot {
                    index: *index,
                    acceptance: "unsubmitted".into(),
                    job_id: None,
                    partial: false,
                })
                .collect(),
        };
        self.persist_video_receipt(&request.task_id, fingerprint, &receipt)
            .map_err(|_| {
                RunError::failed("provider_unavailable", "无法保存视频提交记录，未发送请求")
            })?;
        for i in 0..receipt.slots.len() {
            if control.cancelled.load(Ordering::Acquire) {
                return Err(stopped());
            }
            receipt.slots[i].acceptance = "unknown".into();
            self.persist_video_receipt(&request.task_id, fingerprint, &receipt)
                .map_err(|_| {
                    RunError::unknown(
                        "provider_unavailable",
                        "视频提交状态写入失败，已停止提交",
                        vec![],
                    )
                })?;
            let response = tokio::select! {
                biased;
                _=text::cancelled(control)=>return Err(stopped()),
                result=client.post(format!("{}/task/submit",base.as_str().trim_end_matches('/'))).bearer_auth(secret).json(&body).send()=>result.map_err(|_|RunError::unknown("network","视频受理状态不明，请先核对供应商",vec![]))?,
            };
            let value = match task_response(response, true, control).await {
                Ok(value) => value,
                Err(mut error) => {
                    if !error.request_started {
                        receipt.slots[i].acceptance = "rejected".into();
                        self.persist_video_receipt(&request.task_id, fingerprint, &receipt)
                            .map_err(|_| {
                                RunError::unknown(
                                    "provider_unavailable",
                                    "视频拒绝回执写入失败",
                                    vec![],
                                )
                            })?;
                    }
                    // Earlier accepted outputs still need recovery even if this slot was rejected.
                    if receipt
                        .slots
                        .iter()
                        .any(|slot| slot.acceptance == "accepted")
                    {
                        error.request_started = true;
                    }
                    return Err(error);
                }
            };
            check_receipt_credentials(&value, secret)?;
            let (id, status, _) = parse_task(&value, None)?;
            if status != "queued" {
                return Err(RunError::unknown(
                    "provider_unavailable",
                    "视频受理回执状态无法确认",
                    vec![],
                ));
            }
            receipt.slots[i].acceptance = "accepted".into();
            receipt.slots[i].job_id = Some(id);
            self.persist_video_receipt(&request.task_id, fingerprint, &receipt)
                .map_err(|_| {
                    RunError::unknown(
                        "provider_unavailable",
                        "视频受理回执写入失败，已停止轮询",
                        vec![],
                    )
                })?;
        }
        let record = self
            .get(&request.task_id)
            .map_err(|_| RunError::unknown("provider_unavailable", "视频记录无法读取", vec![]))?
            .ok_or_else(|| RunError::unknown("provider_unavailable", "视频记录缺失", vec![]))?;
        self.poll_video_receipt(
            &record,
            fingerprint,
            control,
            &receipt,
            client,
            base,
            secret,
        )
        .await
    }
    async fn poll_video_receipt(
        &self,
        record: &JobRecord,
        fingerprint: &str,
        control: &JobControl,
        receipt: &VideoReceipt,
        client: &Client,
        base: &reqwest::Url,
        secret: &str,
    ) -> Result<Vec<String>, RunError> {
        let mut ids = record.asset_ids.clone();
        let polling = async {
            let mut incomplete = false;
            let mut failed = false;
            for slot in &receipt.slots {
                if slot.partial {
                    failed = true;
                }
                if record.outputs.iter().any(|o| {
                    o.index == slot.index && o.status == "succeeded" && o.asset_id.is_some()
                }) {
                    continue;
                }
                if record
                    .outputs
                    .iter()
                    .any(|o| o.index == slot.index && o.status == "failed")
                {
                    failed = true;
                    continue;
                }
                let Some(job_id) = slot
                    .job_id
                    .as_deref()
                    .filter(|_| slot.acceptance == "accepted")
                else {
                    if matches!(slot.acceptance.as_str(), "rejected" | "unsubmitted") {
                        self.persist_media_failure(&record.task_id, fingerprint, slot.index)?;
                        failed = true;
                    } else {
                        incomplete = true;
                    }
                    continue;
                };
                if credential_echo(job_id, secret) {
                    return Err(RunError::unknown(
                        "provider_unavailable",
                        "原回执包含不安全字段，已停止查询，请核对原任务",
                        vec![],
                    ));
                }
                loop {
                    let response = tokio::select! {biased; _=text::cancelled(control)=>return Err(stopped()),response=client.get(format!("{}/task/{job_id}",base.as_str().trim_end_matches('/'))).bearer_auth(secret).send()=>response.map_err(|_|RunError::unknown("network","视频状态查询中断，可恢复原回执继续查询",vec![]))?};
                    let value = task_response(response, false, control).await?;
                    check_receipt_credentials(&value, secret)?;
                    let (_, status, outputs) = parse_task(&value, Some(job_id))?;
                    match status.as_str() {
                        "failed" => {
                            self.persist_media_failure(&record.task_id, fingerprint, slot.index)?;
                            failed = true;
                            break;
                        }
                        "completed" | "partial_completed" => {
                            if outputs.len() != 1 {
                                return Err(RunError::unknown(
                                    "provider_unavailable",
                                    "视频结果数量与原输出不符",
                                    vec![],
                                ));
                            }
                            if status == "partial_completed" {
                                self.persist_video_partial(
                                    &record.task_id,
                                    fingerprint,
                                    slot.index,
                                )?;
                            }
                            let url = result_url(&outputs[0])?;
                            let download = async {
                                let client = pinned_download_client(&url).await.map_err(|m| {
                                    RunError::unknown("provider_unavailable", m, vec![])
                                })?;
                                download_video(&client, url, control).await
                            };
                            let (bytes, mime) = tokio::select! {biased; _=text::cancelled(control)=>return Err(stopped()),result=download=>result?};
                            if control.cancelled.load(Ordering::Acquire) {
                                return Err(stopped());
                            }
                            let id = self.archive_media(
                                &record.task_id,
                                fingerprint,
                                slot.index,
                                &bytes,
                                receipt.metadata(&record.task_id, &bytes, mime, job_id),
                            )?;
                            merge_asset_ids(&mut ids, vec![id]);
                            if status == "partial_completed" {
                                failed = true;
                            }
                            break;
                        }
                        _ => {
                            tokio::select! {biased; _=text::cancelled(control)=>return Err(stopped()),_=tokio::time::sleep(Duration::from_secs(2))=>{}}
                        }
                    }
                }
            }
            if incomplete {
                return Err(RunError::unknown(
                    "network",
                    "部分输出尚未确认受理，已恢复的输出已保留，请先核对供应商",
                    vec![],
                ));
            }
            if failed {
                return Err(RunError::failed(
                    "provider_unavailable",
                    "部分视频失败或未完成提交，已保留可用结果",
                ));
            }
            Ok(())
        };
        let result = tokio::time::timeout(Duration::from_secs(20 * 60), polling).await;
        match result {
            Ok(Ok(())) => Ok(ids),
            Ok(Err(mut error)) => {
                merge_asset_ids(&mut error.asset_ids, ids);
                Err(error)
            }
            Err(_) => Err(RunError::unknown(
                "network",
                "视频状态查询超时，可恢复原回执继续查询",
                ids,
            )),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase", deny_unknown_fields)]
pub enum MediaInput {
    #[serde(rename_all = "camelCase")]
    Video {
        duration: u8,
        aspect_ratio: String,
        resolution: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        audio: Option<bool>,
    },
    Audio {
        voice: String,
        format: String,
        speed: f64,
    },
}

fn video_base(value: &str) -> Result<reqwest::Url, String> {
    let mut url = reqwest::Url::parse(value).map_err(|_| "invalid: video baseUrl")?;
    if url.scheme() != "https"
        || !matches!(url.host_str(), Some("api.12ai.org" | "cdn.12ai.org"))
        || url.port().is_some()
        || !url.username().is_empty()
        || url.password().is_some()
        || url.query().is_some()
        || url.fragment().is_some()
        || !matches!(url.path(), "/" | "/v1" | "/v1/")
    {
        return Err("invalid: video baseUrl".into());
    }
    url.set_path("/v1");
    Ok(url)
}

pub(super) fn validate(request: &TaskHostRequest) -> Result<(), String> {
    let invalid = || "invalid: unsupported media parameters or references".to_string();
    for attachment in &request.attachments {
        if attachment
            .reference_frame
            .as_deref()
            .is_some_and(|v| !matches!(v, "first" | "last"))
            || attachment
                .role
                .as_ref()
                .is_some_and(|v| v.len() > 80 || v.chars().any(char::is_control))
            || attachment
                .mime
                .as_ref()
                .is_some_and(|v| v.len() > 120 || v.chars().any(char::is_control))
        {
            return Err(invalid());
        }
    }
    match (request.kind.as_deref(), &request.media) {
        (
            Some("video"),
            Some(MediaInput::Video {
                duration,
                aspect_ratio,
                resolution,
                ..
            }),
        ) => {
            video_base(&request.base_url)?;
            if !matches!(
                request.model.as_str(),
                "veo-3.1-generate-preview" | "veo-3.1-fast-generate-preview"
            ) || ![4, 6, 8].contains(duration)
                || !matches!(aspect_ratio.as_str(), "16:9" | "9:16")
                || !matches!(resolution.as_str(), "720p" | "1080p")
                || request.prompt.trim().is_empty()
                || request.prompt.chars().count() > 5000
            {
                return Err(invalid());
            }
            let first = request
                .attachments
                .iter()
                .filter(|a| a.reference_frame.as_deref() == Some("first"))
                .count();
            let last = request
                .attachments
                .iter()
                .filter(|a| a.reference_frame.as_deref() == Some("last"))
                .count();
            let refs = request.attachments.len() - first - last;
            if first > 1
                || last > 1
                || first != last
                || refs > 3
                || (refs > 0 && (first > 0 || request.model == "veo-3.1-fast-generate-preview"))
                || request.attachments.iter().any(|a| {
                    a.mime
                        .as_deref()
                        .is_some_and(|m| !matches!(m, "image/png" | "image/jpeg" | "image/webp"))
                })
                || request.attachments.iter().any(|a| {
                    a.role
                        .as_deref()
                        .is_some_and(|r| !matches!(r, "主体" | "风格" | "材质" | "构图"))
                })
            {
                return Err(invalid());
            }
        }
        (
            Some("audio"),
            Some(MediaInput::Audio {
                voice,
                format,
                speed,
            }),
        ) => {
            if ![
                "alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage",
                "shimmer", "verse", "marin", "cedar",
            ]
            .contains(&voice.as_str())
                || !matches!(format.as_str(), "mp3" | "wav")
                || !speed.is_finite()
                || !(0.25..=4.0).contains(speed)
                || !request.attachments.is_empty()
                || request.prompt.trim().is_empty()
                || request.prompt.chars().count() > 4096
            {
                return Err(invalid());
            }
        }
        (None | Some("image" | "text"), None) => return Ok(()),
        _ => return Err(invalid()),
    }
    if request.size.is_some()
        || request.image_edit_required == Some(true)
        || request.mask_asset_id.is_some()
        || request.comfy_workflow.is_some()
    {
        return Err(invalid());
    }
    Ok(())
}
