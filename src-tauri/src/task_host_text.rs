//! Text requests share the native host identity, journal, cancellation and vault.
//! Partial text is a journal draft, never a successful image/asset output.
use super::*;
use std::time::Instant;

pub(super) const MAX_TEXT_BYTES: usize = 32 * 1024;
const MAX_SSE_LINE_BYTES: usize = 64 * 1024;
const MAX_TEXT_RESPONSE_BYTES: usize = 2 * 1024 * 1024;

#[derive(Default)]
struct TextStream {
    protocol: String,
    started: bool,
    anthropic_stop: bool,
    line: Vec<u8>,
    event: Vec<u8>,
    received: usize,
    text: String,
    finished: bool,
    done: bool,
    error_event: bool,
    event_name: String,
    modern: Option<protocol_stream::ProtocolStream>,
}

impl TextStream {
    fn for_protocol(protocol: provider::Protocol) -> Self {
        Self {
            protocol: if protocol == provider::Protocol::Gemini {
                "gemini".into()
            } else {
                String::new()
            },
            modern: protocol_stream::ProtocolStream::for_protocol(protocol),
            ..Self::default()
        }
    }

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
                self.event_name = event.trim().to_owned();
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
        let event_name = std::mem::take(&mut self.event_name);
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
        if data == "[DONE]" && !matches!(self.protocol.as_str(), "anthropic-messages" | "gemini") {
            if self.modern.is_some() {
                return Err("文本流缺少协议终止确认");
            }
            self.done = true;
            return Ok(());
        }
        let value: Value = serde_json::from_str(data).map_err(|_| "文本流数据格式无效")?;
        if value.get("error").is_some_and(|error| !error.is_null()) {
            return Err("供应商返回文本流错误");
        }
        if let Some(modern) = &mut self.modern {
            if !event_name.is_empty() && value["type"].as_str() != Some(event_name.as_str()) {
                return Err("文本流事件类型不匹配");
            }
            modern.dispatch(&value, &mut self.text)?;
            self.done = modern.done();
            self.finished = self.done;
            return Ok(());
        }
        if matches!(self.protocol.as_str(), "anthropic-messages" | "gemini") {
            return self.dispatch_protocol(&value);
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

    fn append(&mut self, value: &str) -> Result<(), &'static str> {
        if self.finished && !value.is_empty() {
            return Err("文本流完成后仍返回内容");
        }
        if self.text.len().saturating_add(value.len()) > MAX_TEXT_BYTES {
            return Err("生成文本超过本地保存上限");
        }
        self.text.push_str(value);
        Ok(())
    }

    fn dispatch_protocol(&mut self, value: &Value) -> Result<(), &'static str> {
        if self.protocol == "anthropic-messages" {
            match value["type"].as_str().ok_or("文本流事件类型无效")? {
                "ping" => Ok(()),
                "message_start" => {
                    if self.started {
                        return Err("文本流重复开始");
                    }
                    self.started = true;
                    let content = value["message"]["content"]
                        .as_array()
                        .ok_or("文本流起始内容无效")?;
                    for part in content {
                        if part["type"] != "text" {
                            return Err("文本流包含非文本内容");
                        }
                        self.append(part["text"].as_str().ok_or("文本内容无效")?)?;
                    }
                    Ok(())
                }
                "content_block_start" => {
                    if !self.started || value["content_block"]["type"] != "text" {
                        return Err("文本流包含非文本内容");
                    }
                    self.append(
                        value["content_block"]["text"]
                            .as_str()
                            .ok_or("文本内容无效")?,
                    )
                }
                "content_block_delta" => {
                    if !self.started || value["delta"]["type"] != "text_delta" {
                        return Err("文本流包含非文本增量");
                    }
                    self.append(value["delta"]["text"].as_str().ok_or("文本内容无效")?)
                }
                "content_block_stop" => {
                    if self.started {
                        Ok(())
                    } else {
                        Err("文本流尚未开始")
                    }
                }
                "message_delta" => {
                    if !self.started {
                        return Err("文本流尚未开始");
                    }
                    if let Some(reason) = value["delta"]["stop_reason"].as_str() {
                        if !matches!(reason, "end_turn" | "stop_sequence") {
                            return Err("文本生成未完整结束");
                        }
                        self.anthropic_stop = true;
                    }
                    Ok(())
                }
                "message_stop" => {
                    if !self.started || !self.anthropic_stop {
                        return Err("文本流提前结束");
                    }
                    self.finished = true;
                    self.done = true;
                    Ok(())
                }
                _ => Err("文本流事件无效"),
            }
        } else {
            if !value["promptFeedback"]["blockReason"].is_null() {
                return Err("文本生成被服务拒绝");
            }
            let Some(candidates) = value["candidates"].as_array() else {
                return if value.get("usageMetadata").is_some() {
                    Ok(())
                } else {
                    Err("文本流缺少候选")
                };
            };
            if candidates.len() != 1 {
                return Err("文本流返回意外的候选数量");
            }
            let candidate = &candidates[0];
            if let Some(content) = candidate.get("content") {
                for part in content["parts"].as_array().ok_or("文本内容无效")? {
                    let text = part["text"].as_str().ok_or("文本流包含非文本内容")?;
                    if part["thought"] != true {
                        self.append(text)?;
                    }
                }
            }
            if let Some(reason) = candidate["finishReason"].as_str() {
                if reason != "STOP" {
                    return Err("文本生成未完整结束");
                }
                self.finished = true;
            }
            Ok(())
        }
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

pub(super) async fn cancelled(control: &JobControl) {
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
        let (builder, protocol) = provider::text_request(&client, request, secret)
            .map_err(|_| RunError::failed("invalid_request", "文本协议或认证配置无效"))?;
        let send = builder.send();
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
        let mut decoder = TextStream::for_protocol(protocol);
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
            if let Err(message) = decoder.feed(&chunk) {
                if !decoder.text.is_empty() {
                    self.persist_text(request, fingerprint, &decoder.text, false)
                        .map_err(|_| unknown_text("文本草稿保存失败，供应商受理状态需核对"))?;
                }
                return Err(unknown_text(message));
            }
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
    fn anthropic_success_requires_message_stop_and_end_turn() {
        let mut stream = TextStream {
            protocol: "anthropic-messages".into(),
            ..Default::default()
        };
        for frame in [
            json!({"type":"message_start","message":{"content":[]}}),
            json!({"type":"content_block_start","content_block":{"type":"text","text":"你好"}}),
            json!({"type":"content_block_delta","delta":{"type":"text_delta","text":"🌍"}}),
            json!({"type":"message_delta","delta":{"stop_reason":"end_turn"}}),
        ] {
            stream
                .feed(format!("data: {frame}\n\n").as_bytes())
                .unwrap();
        }
        assert!(stream.complete().is_err());
        stream
            .feed(b"data: {\"type\":\"message_stop\"}\n\n")
            .unwrap();
        assert_eq!(stream.complete().unwrap(), "你好🌍");
        assert!(stream
            .feed(b"data: {\"type\":\"message_stop\"}\n\n")
            .is_err());
    }
    #[test]
    fn gemini_success_requires_stop_and_text_parts() {
        let mut stream = TextStream {
            protocol: "gemini".into(),
            ..Default::default()
        };
        stream
            .feed(
                format!(
                    "data: {}\n\n",
                    json!({"candidates":[{"content":{"parts":[{"text":"answer"}]}}]})
                )
                .as_bytes(),
            )
            .unwrap();
        assert!(stream.complete().is_err());
        stream
            .feed(
                format!(
                    "data: {}\n\n",
                    json!({"candidates":[{"finishReason":"STOP"}]})
                )
                .as_bytes(),
            )
            .unwrap();
        assert_eq!(stream.complete().unwrap(), "answer");
        for value in [
            json!({"candidates":[{"finishReason":"MAX_TOKENS"}]}),
            json!({"candidates":[{"content":{"parts":[{"functionCall":{}}]}}]}),
        ] {
            let mut invalid = TextStream {
                protocol: "gemini".into(),
                ..Default::default()
            };
            assert!(invalid
                .feed(format!("data: {value}\n\n").as_bytes())
                .is_err());
        }
    }

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

    fn modern_frame(value: Value) -> String {
        format!(
            "event: {}\r\ndata: {}\r\n\r\n",
            value["type"].as_str().unwrap(),
            value
        )
    }

    #[test]
    fn responses_framing_keeps_utf8_and_requires_matching_terminal() {
        let delta = json!({"type":"response.output_text.delta","item_id":"msg_fixture","output_index":0,"content_index":0,"delta":"你好🌍"});
        let final_event = json!({"type":"response.completed","response":{"id":"resp_fixture","status":"completed","output":[{"type":"message","id":"msg_fixture","role":"assistant","status":"completed","content":[{"type":"output_text","text":"你好🌍"}]}]}});
        let mut decoder = TextStream::for_protocol(provider::Protocol::Responses);
        for byte in modern_frame(delta).as_bytes() {
            decoder.feed(&[*byte]).unwrap();
        }
        assert!(decoder.complete().is_err());
        decoder.feed(modern_frame(final_event).as_bytes()).unwrap();
        assert_eq!(decoder.complete().unwrap(), "你好🌍");
        assert!(decoder.feed(b"data:[DONE]\n\n").is_err());
    }

    #[test]
    fn protocol_streams_do_not_accept_chat_done_or_mismatched_event_names() {
        for protocol in [provider::Protocol::Responses, provider::Protocol::Anthropic] {
            let mut decoder = TextStream::for_protocol(protocol);
            assert!(decoder.feed(b"data:[DONE]\n\n").is_err());
            let mut decoder = TextStream::for_protocol(protocol);
            assert!(decoder
                .feed(b"event: message_stop\ndata:{\"type\":\"response.completed\"}\n\n")
                .is_err());
            assert!(decoder.complete().is_err());
        }
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
