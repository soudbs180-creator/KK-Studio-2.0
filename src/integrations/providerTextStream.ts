import {
  providerProtocol,
  type ProviderProtocol,
} from "../domain/providerProtocol.ts";
import {
  consumeTextEvent,
  type TextProtocolState,
} from "../features/creation/textProtocolEvent.ts";
export const invalidTextStream = () =>
  new Error("文本响应不完整或格式无效，请先核对供应商；不会自动重复提交。");
export function createTextStreamDecoder(protocol: ProviderProtocol) {
  protocol = providerProtocol({ protocol });
  const state: TextProtocolState = {
    text: "",
    complete: false,
    endTurn: false,
  };
  return {
    decode(value: string): string {
      if (state.complete) throw invalidTextStream();
      if (value === "[DONE]") {
        if (!["openai-chat", "azure-openai", "ollama"].includes(protocol))
          throw invalidTextStream();
        state.complete = true;
        return "";
      }
      const previous = state.text.length;
      let payload: unknown;
      try {
        payload = JSON.parse(value);
      } catch {
        throw invalidTextStream();
      }
      consumeTextEvent(payload, state, protocol);
      return state.text.slice(previous);
    },
    isFinished: () => state.complete,
  };
}
