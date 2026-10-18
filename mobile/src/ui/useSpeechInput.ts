import type { SpeechInput, SpeechInputOptions } from "./useSpeechInput.types";
const cancel = () => {};

export function useSpeechInput({ onStatus }: SpeechInputOptions): SpeechInput {
  return {
    supported: false,
    state: "off",
    toggle: () =>
      onStatus?.("当前原生客户端尚未接入语音识别，请使用系统键盘听写。"),
    cancel,
  };
}
