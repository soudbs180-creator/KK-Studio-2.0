//! Plain-text terminals for Responses and Messages; framing limits stay in TextStream.
use super::provider::Protocol;
use super::*;

#[derive(Default)]
pub(super) struct ResponsesState {
    response_id: Option<String>,
    item_id: Option<String>,
    output_index: Option<u64>,
    content_index: Option<u64>,
    sequence: Option<u64>,
    text_done: bool,
    done: bool,
}

#[derive(Clone, Copy)]
enum BlockKind {
    Text,
    Thinking,
}

#[derive(Default)]
pub(super) struct AnthropicState {
    started: bool,
    blocks: u64,
    active: Option<(u64, BlockKind)>,
    end_turn: bool,
    done: bool,
}

pub(super) enum ProtocolStream {
    Responses(ResponsesState),
    Anthropic(AnthropicState),
}

impl ProtocolStream {
    pub(super) fn for_protocol(protocol: Protocol) -> Option<Self> {
        match protocol {
            Protocol::Responses => Some(Self::Responses(ResponsesState::default())),
            Protocol::Anthropic => Some(Self::Anthropic(AnthropicState::default())),
            _ => None,
        }
    }

    pub(super) fn dispatch(
        &mut self,
        value: &Value,
        text: &mut String,
    ) -> Result<(), &'static str> {
        match self {
            Self::Responses(state) => state.dispatch(value, text),
            Self::Anthropic(state) => state.dispatch(value, text),
        }
    }

    pub(super) fn done(&self) -> bool {
        match self {
            Self::Responses(state) => state.done,
            Self::Anthropic(state) => state.done,
        }
    }
}

fn event_type(value: &Value) -> Result<&str, &'static str> {
    value
        .get("type")
        .and_then(Value::as_str)
        .ok_or("文本流缺少事件类型")
}

fn short_id(value: &Value) -> Result<&str, &'static str> {
    value
        .as_str()
        .filter(|id| !id.is_empty() && id.len() <= MAX_ID && !id.chars().any(char::is_control))
        .ok_or("文本流结果身份无效")
}

fn append_text(text: &mut String, content: &str) -> Result<(), &'static str> {
    if text.len().saturating_add(content.len()) > text::MAX_TEXT_BYTES {
        return Err("生成文本超过本地保存上限");
    }
    text.push_str(content);
    Ok(())
}

impl ResponsesState {
    fn bind_text(&mut self, value: &Value) -> Result<(), &'static str> {
        let id = short_id(&value["item_id"])?;
        let output = value["output_index"]
            .as_u64()
            .filter(|index| *index < 64)
            .ok_or("文本流输出序号无效")?;
        let content = value["content_index"]
            .as_u64()
            .filter(|index| *index < 64)
            .ok_or("文本流内容序号无效")?;
        if self.item_id.as_deref().is_some_and(|old| old != id)
            || self.output_index.is_some_and(|old| old != output)
            || self.content_index.is_some_and(|old| old != content)
        {
            return Err("文本流返回了冲突的文本输出");
        }
        self.item_id = Some(id.to_owned());
        self.output_index = Some(output);
        self.content_index = Some(content);
        Ok(())
    }

    fn sequence(&mut self, value: &Value) -> Result<(), &'static str> {
        if let Some(raw) = value.get("sequence_number") {
            let next = raw.as_u64().ok_or("文本流事件序号无效")?;
            if self.sequence.is_some_and(|old| next <= old) {
                return Err("文本流事件顺序无效");
            }
            self.sequence = Some(next);
        }
        Ok(())
    }

    fn dispatch(&mut self, value: &Value, text: &mut String) -> Result<(), &'static str> {
        self.sequence(value)?;
        match event_type(value)? {
            "response.created" => {
                let id = short_id(&value["response"]["id"])?;
                if self.response_id.as_deref().is_some_and(|old| old != id) {
                    return Err("文本流响应身份冲突");
                }
                self.response_id = Some(id.to_owned());
            }
            "response.output_text.delta" => {
                self.bind_text(value)?;
                if self.text_done {
                    return Err("文本流完成后仍返回内容");
                }
                append_text(text, value["delta"].as_str().ok_or("文本流内容格式无效")?)?;
            }
            "response.output_text.done" => {
                self.bind_text(value)?;
                if self.text_done || value["text"].as_str() != Some(text.as_str()) {
                    return Err("文本流最终文本不匹配");
                }
                self.text_done = true;
            }
            "response.completed" => self.complete(&value["response"], text)?,
            "response.failed" | "response.incomplete" | "error" => {
                return Err("文本生成未完整结束，请核对供应商")
            }
            "response.refusal.delta" | "response.refusal.done" => {
                return Err("文本服务返回了拒绝响应")
            }
            "response.output_item.added" | "response.output_item.done" => {
                match value["item"]["type"].as_str() {
                    Some("message") if value["item"]["role"].as_str() == Some("assistant") => {}
                    Some("reasoning") => {}
                    _ => return Err("文本服务返回了不支持的输出类型"),
                }
            }
            "response.content_part.added" | "response.content_part.done" => {
                if value["part"]["type"].as_str() != Some("output_text") {
                    return Err("文本服务返回了不支持的内容类型");
                }
            }
            _ => {} // Future metadata is bounded and cannot satisfy a terminal.
        }
        Ok(())
    }

    fn complete(&mut self, response: &Value, text: &mut String) -> Result<(), &'static str> {
        if response["status"].as_str() != Some("completed")
            || response.get("error").is_some_and(|value| !value.is_null())
            || response
                .get("incomplete_details")
                .is_some_and(|value| !value.is_null())
        {
            return Err("文本响应未完整完成");
        }
        let id = short_id(&response["id"])?;
        if self.response_id.as_deref().is_some_and(|old| old != id) {
            return Err("文本流响应身份冲突");
        }
        let output = response["output"]
            .as_array()
            .filter(|items| !items.is_empty() && items.len() <= 64)
            .ok_or("文本响应缺少输出")?;
        let mut final_text = None;
        for (index, item) in output.iter().enumerate() {
            match item["type"].as_str() {
                Some("reasoning") => {}
                Some("message") if final_text.is_none() => {
                    final_text = Some(self.final_message(item, index as u64)?);
                }
                _ => return Err("文本响应包含不支持或重复的输出"),
            }
        }
        let final_text = final_text.ok_or("文本响应缺少正文")?;
        if text.is_empty() && self.item_id.is_none() {
            append_text(text, final_text)?;
        } else if text.as_str() != final_text {
            return Err("文本流最终文本不匹配");
        }
        self.response_id = Some(id.to_owned());
        self.done = true;
        Ok(())
    }

    fn final_message<'a>(&self, item: &'a Value, index: u64) -> Result<&'a str, &'static str> {
        let id = short_id(&item["id"])?;
        let content = item["content"]
            .as_array()
            .filter(|parts| parts.len() == 1)
            .ok_or("文本响应包含不支持的内容")?;
        if item["role"].as_str() != Some("assistant")
            || item["status"].as_str() != Some("completed")
            || content[0]["type"].as_str() != Some("output_text")
            || self.item_id.as_deref().is_some_and(|old| old != id)
            || self.output_index.is_some_and(|old| old != index)
            || self.content_index.is_some_and(|old| old != 0)
        {
            return Err("文本流最终输出身份或类型无效");
        }
        content[0]["text"]
            .as_str()
            .filter(|value| !value.trim().is_empty())
            .ok_or("供应商没有返回文本内容")
    }
}

impl AnthropicState {
    fn dispatch(&mut self, value: &Value, text: &mut String) -> Result<(), &'static str> {
        match event_type(value)? {
            "message_start" => {
                let message = &value["message"];
                short_id(&message["id"])?;
                if self.started
                    || message["role"].as_str() != Some("assistant")
                    || message["content"]
                        .as_array()
                        .is_none_or(|parts| !parts.is_empty())
                {
                    return Err("文本流起始消息无效");
                }
                self.started = true;
            }
            "content_block_start" => self.start_block(value, text)?,
            "content_block_delta" => self.delta(value, text)?,
            "content_block_stop" => {
                let index = value["index"].as_u64().ok_or("文本流内容序号无效")?;
                if self.active.is_none_or(|(active, _)| active != index) {
                    return Err("文本流内容块未正确结束");
                }
                self.active = None;
            }
            "message_delta" => {
                if !self.started || self.active.is_some() {
                    return Err("文本流消息顺序无效");
                }
                let delta = value["delta"].as_object().ok_or("文本流消息增量无效")?;
                if delta
                    .get("stop_details")
                    .is_some_and(|details| details["type"].as_str() == Some("refusal"))
                {
                    return Err("文本服务返回了拒绝响应");
                }
                if let Some(reason) = delta.get("stop_reason").filter(|reason| !reason.is_null()) {
                    if reason.as_str() != Some("end_turn") {
                        return Err("文本生成未完整结束，请检查输出限制或模型响应");
                    }
                    self.end_turn = true;
                }
            }
            "message_stop" => {
                if !self.started || self.active.is_some() || !self.end_turn {
                    return Err("文本流缺少完整终止确认");
                }
                self.done = true;
            }
            "error" => return Err("供应商返回文本流错误"),
            _ => {} // Ping and future metadata do not count as text or completion.
        }
        Ok(())
    }

    fn start_block(&mut self, value: &Value, text: &mut String) -> Result<(), &'static str> {
        let index = value["index"].as_u64().ok_or("文本流内容序号无效")?;
        if !self.started
            || self.active.is_some()
            || self.end_turn
            || index != self.blocks
            || self.blocks >= 64
        {
            return Err("文本流内容块顺序无效");
        }
        let block = &value["content_block"];
        let kind = match block["type"].as_str() {
            Some("text") => {
                append_text(text, block["text"].as_str().ok_or("文本流内容格式无效")?)?;
                BlockKind::Text
            }
            Some("thinking" | "redacted_thinking") => BlockKind::Thinking,
            _ => return Err("文本服务返回了不支持的工具或内容类型"),
        };
        self.active = Some((index, kind));
        self.blocks += 1;
        Ok(())
    }

    fn delta(&mut self, value: &Value, text: &mut String) -> Result<(), &'static str> {
        let index = value["index"].as_u64().ok_or("文本流内容序号无效")?;
        let (active, kind) = self.active.ok_or("文本流缺少内容块起始")?;
        if index != active || self.end_turn {
            return Err("文本流内容序号无效");
        }
        let delta = &value["delta"];
        match (kind, delta["type"].as_str()) {
            (BlockKind::Text, Some("text_delta")) => {
                append_text(text, delta["text"].as_str().ok_or("文本流内容格式无效")?)?;
            }
            (BlockKind::Thinking, Some("thinking_delta" | "signature_delta")) => {}
            _ => return Err("文本服务返回了不支持的增量类型"),
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn response(text: &str) -> Value {
        json!({"type":"response.completed","response":{"id":"resp_fixture","status":"completed","output":[{"type":"message","id":"msg_fixture","role":"assistant","status":"completed","content":[{"type":"output_text","text":text}]}]}})
    }

    #[test]
    fn responses_require_completed_matching_plain_text() {
        let mut state = ResponsesState::default();
        let mut text = String::new();
        state.dispatch(&json!({"type":"response.output_text.delta","item_id":"msg_fixture","output_index":0,"content_index":0,"delta":"你好🌍"}), &mut text).unwrap();
        state.dispatch(&json!({"type":"response.output_text.done","item_id":"msg_fixture","output_index":0,"content_index":0,"text":"你好🌍"}), &mut text).unwrap();
        assert!(!state.done);
        state.dispatch(&response("你好🌍"), &mut text).unwrap();
        assert!(state.done);
        assert_eq!(text, "你好🌍");
    }

    #[test]
    fn responses_incomplete_tools_conflict_and_wrong_status_do_not_complete() {
        for event in [
            json!({"type":"response.failed"}),
            json!({"type":"response.incomplete"}),
            json!({"type":"response.output_item.added","item":{"type":"function_call"}}),
            json!({"type":"response.refusal.delta","delta":"refused"}),
        ] {
            assert!(ResponsesState::default()
                .dispatch(&event, &mut String::new())
                .is_err());
        }
        let mut wrong = response("hello");
        wrong["response"]["status"] = json!("in_progress");
        assert!(ResponsesState::default()
            .dispatch(&wrong, &mut String::new())
            .is_err());
        let mut state = ResponsesState::default();
        let mut text = String::new();
        state.dispatch(&json!({"type":"response.output_text.delta","item_id":"msg_fixture","output_index":0,"content_index":0,"delta":"partial"}), &mut text).unwrap();
        assert!(state.dispatch(&response("different"), &mut text).is_err());
        assert_eq!(text, "partial");
        assert!(!state.done);
    }

    fn start() -> Value {
        json!({"type":"message_start","message":{"id":"msg_fixture","role":"assistant","content":[]}})
    }
    fn block() -> Value {
        json!({"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}})
    }

    #[test]
    fn anthropic_requires_closed_blocks_end_turn_and_message_stop() {
        let mut state = AnthropicState::default();
        let mut text = String::new();
        for event in [
            start(),
            block(),
            json!({"type":"ping"}),
            json!({"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"正文"}}),
            json!({"type":"content_block_stop","index":0}),
            json!({"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":4}}),
        ] {
            state.dispatch(&event, &mut text).unwrap();
        }
        assert!(!state.done);
        state
            .dispatch(&json!({"type":"message_stop"}), &mut text)
            .unwrap();
        assert!(state.done);
        assert_eq!(text, "正文");
    }

    #[test]
    fn anthropic_unfinished_tool_refusal_and_truncation_fail_closed() {
        for reason in [
            "max_tokens",
            "tool_use",
            "pause_turn",
            "refusal",
            "model_context_window_exceeded",
        ] {
            let mut state = AnthropicState::default();
            let mut text = String::new();
            state.dispatch(&start(), &mut text).unwrap();
            assert!(state
                .dispatch(
                    &json!({"type":"message_delta","delta":{"stop_reason":reason}}),
                    &mut text
                )
                .is_err());
        }
        let mut state = AnthropicState::default();
        let mut text = String::new();
        state.dispatch(&start(), &mut text).unwrap();
        state.dispatch(&block(), &mut text).unwrap();
        assert!(state
            .dispatch(&json!({"type":"message_stop"}), &mut text)
            .is_err());
        let mut state = AnthropicState::default();
        state.dispatch(&start(), &mut text).unwrap();
        assert!(state.dispatch(&json!({"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"tool_fixture"}}), &mut text).is_err());
    }
}
