//! Text requests share the native host identity, journal, cancellation and vault.
//! Partial text is a journal draft, never a successful image/asset output.
use super::*;
use std::time::Instant;

pub(super) const MAX_TEXT_BYTES: usize = 32 * 1024;
const MAX_SSE_LINE_BYTES: usize = 64 * 1024;
const MAX_TEXT_RESPONSE_BYTES: usize = 2 * 1024 * 1024;

#[derive(Default)]
struct TextStream {
    line: Vec<u8>,
    event: Vec<u8>,
    received: usize,
    text: String,
    finished: bool,
    done: bool,
    error_event: bool,
}

impl TextStream {
    fn feed(&mut self, bytes: &[u8]) -> Result<(), &'static str> {
        self.received = self.received.saturating_add(bytes.len());
        if self.received > MAX_TEXT_RESPONSE_BYTES {
            return Err("文本响应过大");
        }
        for byte in bytes {
            if *byte != b'\n' {
                if self.line.len() >= MAX_SSE_LINE_BYTES {
                    return Err("文本响应单行过大");
                }
                self.line.push(*byte);
                continue;
            }
            let bytes = std::mem::take(&mut self.line);
            let line = std::str::from_utf8(&bytes)
                .map_err(|_| "文本响应包含无效 UTF-8")?
                .trim_end_matches('\r');
            if line.is_empty() {
                self.dispatch()?;
            } else if let Some(event) = line.strip_prefix("event:") {
                self.error_event = event.trim() == "error";
            } else if let Some(data) = line.strip_prefix("data:") {
                let data = data.strip_prefix(' ').unwrap_or(data);
                if self.event.len().saturating_add(data.len() + 1) > MAX_SSE_LINE_BYTES {
                    return Err("文本响应事件过大");
                }
                self.event.extend_from_slice(data.as_bytes());
                self.event.push(b'\n');
            }
        }
        Ok(())
    }

    fn dispatch(&mut self) -> Result<(), &'static str> {
        if std::mem::take(&mut self.error_event) {
            return Err("供应商返回文本流错误");
        }
        if self.event.is_empty() {
            return Ok(());
        }
        let bytes = std::mem::take(&mut self.event);
        let data = std::str::from_utf8(&bytes)
            .map_err(|_| "文本响应包含无效 UTF-8")?
            .trim();
        if self.done {
            return Err("文本流终止后仍返回数据");
        }
        if data == "[DONE]" {
            self.done = true;
            return Ok(());
        }
        let value: Value = serde_json::from_str(data).map_err(|_| "文本流数据格式无效")?;
        if value.get("error").is_some() {
            return Err("供应商返回文本流错误");
        }
        let choices = value
            .get("choices")
            .and_then(Value::as_array)
            .ok_or("文本流缺少结果字段")?;
        // Usage-only chunks carry an empty choices array.
        if choices.is_empty() {
            return Ok(());
        }
        if choices.len() != 1 || choices[0].get("index").and_then(Value::as_u64) != Some(0) {
            return Err("文本流返回了意外的输出序号");
        }
        let choice = &choices[0];
        let delta = choice
            .get("delta")
            .and_then(Value::as_object)
            .ok_or("文本流缺少增量字段")?;
        if ["tool_calls", "function_call", "refusal"]
            .iter()
            .any(|key| delta.get(*key).is_some_and(|value| !value.is_null()))
        {
            return Err("文本服务返回了不支持的工具调用或拒绝响应");
        }
        if let Some(content) = delta.get("content").filter(|value| !value.is_null()) {
            let content = content.as_str().ok_or("文本流内容格式无效")?;
            if self.finished && !content.is_empty() {
                return Err("文本流完成后仍返回内容");
            }
            if self.text.len().saturating_add(content.len()) > MAX_TEXT_BYTES {
                return Err("生成文本超过本地保存上限");
            }
            self.text.push_str(content);
        }
        if let Some(reason) = choice.get("finish_reason").filter(|value| !value.is_null()) {
            if reason.as_str() != Some("stop") {
                return Err("文本生成未完整结束，请检查输出限制或模型响应");
            }
            self.finished = true;
        }
        Ok(())
    }

    fn complete(&self) -> Result<&str, &'static str> {
        if !self.line.is_empty() || !self.event.is_empty() || !(self.done || self.finished) {
            return Err("文本流提前结束，生成结果尚未确认");
        }
        if self.text.trim().is_empty() {
            return Err("供应商没有返回文本内容");
        }
        Ok(&self.text)
    }
}

async fn cancelled(control: &JobControl) {
    // Enabling before checking the flag closes the notify-before-wait race.
    let notified = control.wake.notified();
    tokio::pin!(notified);
    notified.as_mut().enable();
    if !control.cancelled.load(Ordering::Acquire) {
        notified.await;
    }
}

fn unknown_text(message: &str) -> RunError {
    RunError::unknown("provider_unavailable", message, vec![])
}

impl TaskHost {
    fn persist_text(
        &self,
        request: &TaskHostRequest,
        fingerprint: &str,
        text: &str,
        complete: bool,
    ) -> Result<(), String> {
        let _lock = self.lock()?;
        let mut journal = self
            .read_one(&request.task_id)?
            .ok_or_else(|| "io: 原生文本任务记录丢失".to_string())?;
        if journal.fingerprint != fingerprint {
            return Err("conflict: 原生文本任务身份已变化".into());
        }
        let output = journal
            .record
            .outputs
            .iter_mut()
            .find(|output| output.index == request.output_indices[0])
            .ok_or_else(|| "corrupt: 原生文本输出不存在".to_string())?;
        output.text = Some(text.to_string());
        output.asset_id = None;
        output.status = if complete { "succeeded" } else { "submitted" }.into();
        output.error = None;
        journal.record.updated_at = now_ms();
        self.write_one_unlocked(&journal)
    }

    pub(super) async fn perform_text(
        &self,
        request: &TaskHostRequest,
        fingerprint: &str,
        control: &JobControl,
        client: Client,
        secret: &str,
    ) -> Result<Vec<String>, RunError> {
        let send = client
            .post(format!(
                "{}/chat/completions",
                request.base_url.trim_end_matches('/')
            ))
            .bearer_auth(secret)
            .header("Idempotency-Key", &request.idempotency_key)
            .header(header::ACCEPT, "text/event-stream")
            .json(&json!({
                "model": request.model,
                "messages": [{"role": "user", "content": request.prompt}],
                "stream": true
            }))
            .send();
        let response = tokio::select! {
            biased;
            _ = cancelled(control) => return Err(RunError::unknown("cancelled", "已停止等待文本生成，供应商最终状态需核对", vec![])),
            result = send => result.map_err(|_| RunError::unknown("network", "文本服务连接中断，受理状态需核对", vec![]))?,
        };
        if !response.status().is_success() {
            // An explicit HTTP rejection is terminal; no response body is
            // exposed because it may echo credentials or private prompts.
            return Err(RunError {
                failure: failure(
                    class_for_status(response.status()),
                    response.status().as_u16(),
                    response
                        .headers()
                        .get(header::RETRY_AFTER)
                        .and_then(|v| v.to_str().ok())
                        .and_then(|v| v.parse::<u64>().ok())
                        .map(|v| v.min(86_400)),
                    "供应商拒绝了文本请求，请检查连接、模型和输入",
                ),
                request_started: false,
                asset_ids: vec![],
            });
        }
        if response
            .content_length()
            .is_some_and(|len| len > MAX_TEXT_RESPONSE_BYTES as u64)
        {
            return Err(unknown_text("文本响应过大"));
        }
        if response
            .headers()
            .get(header::CONTENT_TYPE)
            .and_then(|value| value.to_str().ok())
            .is_none_or(|value| {
                !value
                    .split(';')
                    .next()
                    .unwrap_or("")
                    .trim()
                    .eq_ignore_ascii_case("text/event-stream")
            })
        {
            return Err(unknown_text("文本服务没有返回流式响应"));
        }
        let mut decoder = TextStream::default();
        let mut stream = response.bytes_stream();
        let mut saved_bytes = 0;
        let mut saved_at = Instant::now();
        loop {
            let chunk = tokio::select! {
                biased;
                _ = cancelled(control) => return Err(RunError::unknown("cancelled", "已停止等待文本生成，供应商最终状态需核对", vec![])),
                result = stream.next() => result,
            };
            let Some(chunk) = chunk else { break };
            let chunk = chunk.map_err(|_| {
                RunError::unknown("network", "文本响应读取中断，受理状态需核对", vec![])
            })?;
            decoder.feed(&chunk).map_err(unknown_text)?;
            if decoder.text.len() > saved_bytes
                && (saved_bytes == 0
                    || decoder.text.len() - saved_bytes >= 256
                    || saved_at.elapsed() >= Duration::from_millis(100))
            {
                self.persist_text(request, fingerprint, &decoder.text, false)
                    .map_err(|_| unknown_text("文本草稿保存失败，供应商受理状态需核对"))?;
                saved_bytes = decoder.text.len();
                saved_at = Instant::now();
            }
            if decoder.done {
                break;
            }
        }
        let text = decoder.complete().map_err(unknown_text)?;
        if control.cancelled.load(Ordering::Acquire) {
            return Err(RunError::unknown(
                "cancelled",
                "已停止等待文本生成，供应商最终状态需核对",
                vec![],
            ));
        }
        self.persist_text(request, fingerprint, text, true)
            .map_err(|_| unknown_text("文本结果保存失败，供应商受理状态需核对"))?;
        Ok(vec![])
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const CHINESE: &str = "data: {\"choices\":[{\"index\":0,\"delta\":{\"content\":\"你好🌍\"},\"finish_reason\":null}]}\r\n\r\n";
    const STOP: &str =
        "data:{\"choices\":[{\"index\":0,\"delta\":{},\"finish_reason\":\"stop\"}]}\n\n";

    #[test]
    fn utf8_network_boundaries_and_done_preserve_text() {
        let mut decoder = TextStream::default();
        for byte in CHINESE.as_bytes() {
            decoder.feed(&[*byte]).unwrap();
        }
        assert_eq!(decoder.text, "你好🌍");
        assert!(decoder.complete().is_err());
        decoder.feed(b"data:[DONE]\n\n").unwrap();
        assert_eq!(decoder.complete().unwrap(), "你好🌍");
    }

    #[test]
    fn normal_finish_without_done_is_complete_but_partial_line_is_not() {
        let mut decoder = TextStream::default();
        decoder.feed(CHINESE.as_bytes()).unwrap();
        decoder.feed(STOP.as_bytes()).unwrap();
        assert_eq!(decoder.complete().unwrap(), "你好🌍");
        decoder.feed(b"data: {").unwrap();
        assert!(decoder.complete().is_err());
    }

    #[test]
    fn malformed_truncated_empty_and_tool_responses_never_succeed() {
        for bad in [
            "data: nonsense\n\n",
            "data: {\"error\": {\"message\":\"secret\"}}\n\n",
            "data: {\"choices\":[{\"index\":0,\"delta\":{},\"finish_reason\":\"length\"}]}\n\n",
            "data: {\"choices\":[{\"index\":0,\"delta\":{},\"finish_reason\":\"tool_calls\"}]}\n\n",
            "data: {\"choices\":[{\"index\":1,\"delta\":{\"content\":\"wrong\"}}]}\n\n",
        ] {
            let mut decoder = TextStream::default();
            decoder.feed(CHINESE.as_bytes()).unwrap();
            assert!(decoder.feed(bad.as_bytes()).is_err(), "{bad}");
        }
        let mut empty = TextStream::default();
        empty.feed(b"data: [DONE]\n\n").unwrap();
        assert!(empty.complete().is_err());
        let mut invalid_utf8 = TextStream::default();
        assert!(invalid_utf8.feed(b"data: \xff\n\n").is_err());
    }

    #[test]
    fn text_line_event_and_body_limits_fail_closed() {
        let mut decoder = TextStream::default();
        assert!(decoder.feed(&vec![b'x'; MAX_SSE_LINE_BYTES + 1]).is_err());
        let mut decoder = TextStream::default();
        let frame = format!(
            "data: {}\n\n",
            json!({"choices":[{"index":0,"delta":{"content":"x".repeat(MAX_TEXT_BYTES + 1)}}]})
        );
        assert!(decoder.feed(frame.as_bytes()).is_err());
        let mut decoder = TextStream::default();
        assert!(decoder
            .feed(&vec![b'\n'; MAX_TEXT_RESPONSE_BYTES + 1])
            .is_err());
    }

    #[test]
    fn event_errors_and_non_text_deltas_never_become_success() {
        for tail in [
            "event: error\ndata: [DONE]\n\n",
            "data: {\"choices\":[{\"index\":0,\"delta\":{\"tool_calls\":[]}}]}\n\n",
            "data: {\"choices\":[{\"index\":0,\"delta\":{\"refusal\":\"cannot\"}}]}\n\n",
            "data: {\"choices\":[{\"index\":0,\"delta\":{\"function_call\":{}}}]}\n\n",
        ] {
            let mut decoder = TextStream::default();
            decoder.feed(CHINESE.as_bytes()).unwrap();
            assert!(decoder.feed(tail.as_bytes()).is_err(), "{tail}");
        }
    }
}
