use super::*;
use crate::comfy_transport;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ComfyTaskWorkflow {
    nodes: serde_json::Map<String, Value>,
    output_node_ids: Vec<String>,
    image_binding: Option<ImageBinding>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ImageBinding {
    node_id: String,
    input: String,
}

fn contains_credentials(value: &Value) -> bool {
    match value {
        Value::Object(values) => values.iter().any(|(key, value)| {
            matches!(
                key.to_ascii_lowercase().replace(['_', '-'], "").as_str(),
                "apikey"
                    | "password"
                    | "accesstoken"
                    | "refreshtoken"
                    | "clientsecret"
                    | "authorization"
            ) || contains_credentials(value)
        }),
        Value::Array(values) => values.iter().any(contains_credentials),
        Value::String(value) => value.split("sk-").skip(1).any(|part| {
            part.bytes()
                .take_while(|b| b.is_ascii_alphanumeric() || matches!(b, b'_' | b'-'))
                .count()
                >= 12
        }),
        _ => false,
    }
}
pub(super) fn validate(request: &TaskHostRequest) -> Result<(), String> {
    comfy_transport::loopback_endpoint(Some(&request.base_url))?;
    if request.kind.as_deref() == Some("text")
        || request.auth_mode.as_deref() != Some("none")
        || !request.credential_ref.is_empty()
        || request.mask_asset_id.is_some()
        || request.image_edit_required == Some(true)
    {
        return Err(
            "invalid: ComfyUI requires an explicit local image workflow without vault credentials"
                .into(),
        );
    }
    let workflow = request
        .comfy_workflow
        .as_ref()
        .ok_or("invalid: ComfyUI workflow missing")?;
    let raw = serde_json::to_value(workflow).map_err(|_| "invalid: ComfyUI workflow")?;
    if workflow.nodes.is_empty()
        || serde_json::to_vec(&raw)
            .map_err(|_| "invalid: ComfyUI workflow")?
            .len()
            > 256 * 1024
        || contains_credentials(&raw)
    {
        return Err("invalid: ComfyUI workflow empty, oversized or contains credentials".into());
    }
    if workflow.nodes.iter().any(|(id, node)| {
        id.is_empty()
            || id.len() > 160
            || node["class_type"]
                .as_str()
                .is_none_or(|value| value.is_empty() || value.len() > 160)
            || !node["inputs"].is_object()
    }) {
        return Err("invalid: ComfyUI API nodes".into());
    }
    let outputs = &workflow.output_node_ids;
    if outputs.is_empty()
        || outputs.len() > 16
        || outputs.iter().enumerate().any(|(i, id)| {
            outputs[..i].contains(id)
                || workflow
                    .nodes
                    .get(id)
                    .is_none_or(|node| node["class_type"] != "SaveImage")
        })
    {
        return Err(
            "invalid: ComfyUI outputs must explicitly name distinct SaveImage nodes".into(),
        );
    }
    match (&workflow.image_binding, request.attachments.len()) {
        (None, 0) => {}
        (Some(binding), 1)
            if binding.input == "image"
                && workflow
                    .nodes
                    .get(&binding.node_id)
                    .is_some_and(|node| node["class_type"] == "LoadImage") => {}
        _ => {
            return Err(
                "invalid: ComfyUI image must bind one archived original to LoadImage.image".into(),
            )
        }
    }
    Ok(())
}

impl TaskHost {
    pub(super) async fn perform_comfy(
        &self,
        request: &TaskHostRequest,
        fingerprint: &str,
        control: &JobControl,
    ) -> Result<Vec<String>, RunError> {
        let mut graph = request
            .comfy_workflow
            .clone()
            .ok_or_else(|| RunError::failed("invalid_request", "ComfyUI 工作流缺失"))?;
        if let Some(binding) = &graph.image_binding {
            let attachment = &request.attachments[0];
            let asset = self
                .assets
                .read(&attachment.asset_id)
                .map_err(|_| RunError::failed("invalid_request", "原图无法读取"))?
                .ok_or_else(|| RunError::failed("invalid_request", "原图未归档"))?;
            let mime = asset.metadata["mime"].as_str().unwrap_or("");
            let extension = match mime {
                "image/png" => "png",
                "image/jpeg" => "jpg",
                "image/webp" => "webp",
                _ => return Err(RunError::failed("invalid_request", "原图格式不支持")),
            };
            let bytes = STANDARD
                .decode(&asset.data_base64)
                .map_err(|_| RunError::failed("invalid_request", "原图编码无效"))?;
            if bytes.is_empty() || bytes.len() > 32 * 1024 * 1024 {
                return Err(RunError::failed("invalid_request", "原图超过大小限制"));
            }
            let part = reqwest::multipart::Part::bytes(bytes)
                .file_name(format!("{}.{}", attachment.asset_id, extension))
                .mime_str(mime)
                .map_err(|_| RunError::failed("invalid_request", "原图格式无效"))?;
            let form = reqwest::multipart::Form::new()
                .part("image", part)
                .text("type", "input")
                .text("overwrite", "false");
            let client = comfy_transport::client().map_err(|e| RunError::failed("network", &e))?;
            let response = tokio::select! {
                biased;
                _ = text::cancelled(control) => return Err(RunError::failed("cancelled", "任务在推理前取消")),
                value = client.post(format!("{}/upload/image", request.base_url.trim_end_matches('/'))).multipart(form).send() => value.map_err(|_| RunError::failed("network", "原图上传失败，未提交推理"))?,
            };
            let uploaded: Value = serde_json::from_slice(
                &comfy_transport::bounded(response, 1024 * 1024)
                    .await
                    .map_err(|e| RunError::failed("network", &e))?,
            )
            .map_err(|_| RunError::failed("invalid_request", "ComfyUI 上传回执无效"))?;
            let name = uploaded["name"]
                .as_str()
                .filter(|name| !name.is_empty())
                .ok_or_else(|| RunError::failed("invalid_request", "上传回执缺少文件名"))?;
            let folder = uploaded["subfolder"].as_str().unwrap_or("");
            if uploaded["type"] != "input"
                || [name, folder].iter().any(|part| {
                    part.len() > 1024
                        || part.starts_with('/')
                        || part.contains(['\\', ':', '?', '#', '%'])
                        || part.chars().any(char::is_control)
                        || part.split('/').any(|s| matches!(s, "." | ".."))
                })
            {
                return Err(RunError::failed("invalid_request", "上传回执路径无效"));
            }
            graph.nodes.get_mut(&binding.node_id).unwrap()["inputs"][&binding.input] =
                json!(if folder.is_empty() {
                    name.to_string()
                } else {
                    format!("{folder}/{name}")
                });
        }
        if control.cancelled.load(Ordering::Acquire) {
            return Err(RunError::failed("cancelled", "任务在推理前取消"));
        }
        let prompt = json!({"prompt":graph.nodes,"client_id":format!("kk-task-{}",request.idempotency_key),"extra_data":{"kk_submission_id":request.idempotency_key}});
        if serde_json::to_vec(&prompt)
            .map_err(|_| RunError::failed("invalid_request", "工作流无效"))?
            .len()
            > 256 * 1024
        {
            return Err(RunError::failed("invalid_request", "工作流超过256KiB"));
        }
        let response = tokio::select! {
            biased;
            _ = text::cancelled(control) => return Err(RunError::unknown("cancelled", "受理状态需核对，未自动重发", vec![])),
            value = comfy_transport::json_request_at(Some(&request.base_url), "/prompt", Some(prompt)) => value.map_err(|e| {
                if ["400", "401", "403", "404", "405", "413", "422"].iter().any(|code| e.contains(&format!("HTTP {code}"))) { RunError::failed("invalid_request", &e) }
                else { RunError::unknown("network", "ComfyUI 受理状态不明，未自动重发", vec![]) }
            })?,
        };
        let prompt_id = response["prompt_id"]
            .as_str()
            .filter(|id| {
                !id.is_empty()
                    && id.len() <= 160
                    && id
                        .bytes()
                        .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'_' | b'-'))
            })
            .ok_or_else(|| {
                RunError::unknown(
                    "provider_unavailable",
                    "ComfyUI 回执无效，请核对队列",
                    vec![],
                )
            })?;
        let receipt = super::comfy_recovery::ComfyReceipt {
            endpoint: request.base_url.clone(),
            prompt_id: prompt_id.into(),
            output_node_ids: graph.output_node_ids,
            model: request.model.clone(),
            provider_name: request.provider_name.clone(),
            prompt_hash: request.prompt_hash.clone(),
        };
        self.persist_comfy_receipt(&request.task_id, fingerprint, &receipt)
            .map_err(|_| RunError::unknown("network", "受理回执保存失败，请核对原任务", vec![]))?;
        let record = self
            .get(&request.task_id)
            .map_err(|_| RunError::unknown("network", "原任务记录无法读取", vec![]))?
            .ok_or_else(|| RunError::unknown("network", "原任务记录缺失", vec![]))?;
        self.poll_comfy_receipt(&record, fingerprint, control, &receipt)
            .await
    }
    pub(super) async fn poll_comfy_receipt(
        &self,
        record: &JobRecord,
        fingerprint: &str,
        control: &JobControl,
        receipt: &super::comfy_recovery::ComfyReceipt,
    ) -> Result<Vec<String>, RunError> {
        let started = std::time::Instant::now();
        let result = loop {
            if started.elapsed() > Duration::from_secs(900) {
                return Err(RunError::unknown(
                    "timeout",
                    "ComfyUI 未返回，已保留受理回执供恢复查询",
                    record.asset_ids.clone(),
                ));
            }
            let history_path = format!("/history/{}", receipt.prompt_id);
            let response = tokio::select! {
                biased;
                _ = text::cancelled(control) => return Err(RunError::unknown("cancelled", "已停止等待，请核对原任务", record.asset_ids.clone())),
                result = comfy_transport::json_request_at(Some(&receipt.endpoint), &history_path, None) => result,
            };
            if let Ok(history) = response {
                if let Some(entry) = history.get(&receipt.prompt_id) {
                    if entry["status"]["completed"] == true
                        || entry["status"]["status_str"] == "error"
                    {
                        break entry.clone();
                    }
                }
            }
            tokio::select! { biased; _ = text::cancelled(control) => return Err(RunError::unknown("cancelled", "已停止等待，请核对原任务", record.asset_ids.clone())), _ = tokio::time::sleep(Duration::from_millis(500)) => {} }
        };
        let failed = result["status"]["status_str"] == "error";
        let extra_outputs = if receipt.output_node_ids.len() == 1 {
            result["outputs"][&receipt.output_node_ids[0]]["images"]
                .as_array()
                .is_some_and(|files| files.len() > record.output_indices.len())
        } else {
            receipt.output_node_ids.iter().any(|node| {
                result["outputs"][node]["images"]
                    .as_array()
                    .is_some_and(|files| files.len() > 1)
            })
        };
        let mut ids = record.asset_ids.clone();
        let slots: Vec<(u32, Value)> = if receipt.output_node_ids.len() == 1 {
            let files = result["outputs"][&receipt.output_node_ids[0]]["images"]
                .as_array()
                .cloned()
                .unwrap_or_default();
            record.output_indices.iter().copied().zip(files).collect()
        } else {
            receipt
                .output_node_ids
                .iter()
                .zip(record.output_indices.iter().copied())
                .filter_map(|(node, index)| {
                    result["outputs"][node]["images"]
                        .as_array()
                        .and_then(|images| images.first())
                        .cloned()
                        .map(|file| (index, file))
                })
                .collect()
        };
        for (index, file) in slots {
            if record
                .outputs
                .iter()
                .any(|output| output.index == index && output.status == "succeeded")
            {
                continue;
            }
            let file: comfy_transport::OutputFile = serde_json::from_value(file).map_err(|_| {
                RunError::unknown("provider_unavailable", "产物路径无效", ids.clone())
            })?;
            let mut attempts = 0;
            let (bytes, mime) = loop {
                match comfy_transport::read_image(file.clone(), Some(&receipt.endpoint)).await {
                    Ok(image) => break image,
                    Err(message) => {
                        attempts += 1;
                        if attempts >= 3 {
                            return Err(RunError::unknown("network", &message, ids.clone()));
                        }
                        tokio::time::sleep(Duration::from_millis(500)).await;
                    }
                }
            };
            let stored = self
                .assets
                .store(
                    STANDARD.encode(&bytes),
                    receipt.output_metadata(&record.task_id, &bytes, &mime),
                )
                .map_err(|_| {
                    RunError::unknown("provider_unavailable", "产物归档失败", ids.clone())
                })?;
            let asset_id = stored["assetId"].as_str().unwrap_or_default().to_string();
            merge_asset_ids(&mut ids, vec![asset_id.clone()]);
            self.persist_output(&record.task_id, fingerprint, index, &asset_id)
                .map_err(|_| {
                    RunError::unknown("provider_unavailable", "产物记录保存失败", ids.clone())
                })?;
        }
        if failed {
            let mut error = RunError::failed(
                "provider_unavailable",
                "ComfyUI 执行失败，已归档成功分支，剩余结果请检查节点和模型",
            );
            error.asset_ids = ids;
            return Err(error);
        }
        let current = self
            .get(&record.task_id)
            .map_err(|_| RunError::unknown("network", "产物记录读取失败", ids.clone()))?;
        if extra_outputs
            || current.as_ref().is_none_or(|value| {
                value
                    .outputs
                    .iter()
                    .any(|output| output.status != "succeeded")
            })
        {
            return Err(RunError::unknown(
                "provider_unavailable",
                "工作流输出数量不匹配，已有产物已归档",
                ids,
            ));
        }
        Ok(ids)
    }
}
