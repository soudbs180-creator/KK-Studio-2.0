import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type {
  SpeechInput,
  SpeechInputOptions,
  SpeechInputState,
} from "./useSpeechInput.types";

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult:
    | ((event: { results: ArrayLike<{ 0?: { transcript: string } }> }) => void)
    | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};
type Session = {
  recognition: Recognition;
  key: string;
  base: string;
  last: string;
  state: Exclude<SpeechInputState, "off">;
  timer?: number;
};

function recognitionConstructor() {
  if (typeof window === "undefined" || window.isSecureContext === false) return;
  const browser = window as SpeechWindow;
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
}

function errorMessage(code: string) {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "麦克风权限被拒绝，请在浏览器设置中允许后重试。";
    case "audio-capture":
      return "没有检测到可用麦克风，请检查输入设备。";
    case "network":
      return "语音识别网络服务不可用，请检查网络后重试。";
    case "no-speech":
      return "没有听到语音，可再次点击尝试。";
    case "language-not-supported":
      return "当前浏览器服务不支持中文语音识别。";
    case "aborted":
      return "语音输入已取消。";
    default:
      return "语音识别失败，请稍后重试。";
  }
}

// Browser owns microphone permission and recognition service; only text enters the draft.
export function useSpeechInput({
  value,
  onChange,
  onStatus,
  enabled = true,
  sessionKey = "default",
}: SpeechInputOptions): SpeechInput {
  const latest = useRef({ value, onChange, onStatus, enabled, sessionKey });
  const active = useRef<Session | null>(null);
  const [state, setState] = useState<SpeechInputState>("off");

  const finish = useCallback(
    (session: Session, message: string, abort = true) => {
      if (active.current !== session) return;
      const notify = Boolean(message);
      active.current = null;
      window.clearTimeout(session.timer);
      const recognition = session.recognition;
      recognition.onstart = recognition.onend = null;
      recognition.onresult = recognition.onerror = null;
      if (abort) {
        try {
          recognition.abort();
        } catch {
          message = "浏览器未能确认麦克风停止，请检查浏览器录音状态。";
        }
      }
      if (notify) {
        setState("off");
        latest.current.onStatus?.(message);
      }
    },
    [],
  );

  const isCurrent = useCallback(
    (session: Session) =>
      active.current === session &&
      latest.current.enabled &&
      latest.current.sessionKey === session.key &&
      latest.current.value === session.last &&
      !document.hidden &&
      navigator.onLine !== false,
    [],
  );

  const cancel = useCallback(() => {
    if (active.current) finish(active.current, "语音输入已取消。");
  }, [finish]);

  const toggle = useCallback(() => {
    const previous = active.current;
    if (previous) {
      if (previous.state !== "on") {
        cancel();
        return;
      }
      previous.state = "stopping";
      setState("stopping");
      latest.current.onStatus?.("正在停止语音输入…");
      previous.timer = window.setTimeout(
        () => finish(previous, "语音识别停止超时，已取消本轮识别，请重试。"),
        3000,
      );
      try {
        previous.recognition.stop();
      } catch {
        finish(previous, "语音输入停止失败，已取消本轮识别，请重试。");
      }
      return;
    }
    const Constructor = recognitionConstructor();
    if (!Constructor) {
      latest.current.onStatus?.(
        typeof window !== "undefined" && window.isSecureContext === false
          ? "语音输入需要 HTTPS 安全连接。"
          : "当前浏览器不支持语音识别，请使用键盘输入。",
      );
      return;
    }
    if (!latest.current.enabled) return;
    if (document.hidden) {
      latest.current.onStatus?.("页面不可见，请返回页面后开启语音输入。");
      return;
    }
    if (navigator.onLine === false) {
      latest.current.onStatus?.("网络已断开，请联网后重试语音输入。");
      return;
    }
    let recognition: Recognition;
    try {
      recognition = new Constructor();
      recognition.lang = "zh-CN";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
    } catch {
      latest.current.onStatus?.("语音输入启动失败，请检查浏览器后重试。");
      return;
    }
    const session: Session = {
      recognition,
      key: latest.current.sessionKey,
      base: latest.current.value,
      last: latest.current.value,
      state: "starting",
    };
    active.current = session;
    setState("starting");
    latest.current.onStatus?.(
      "正在请求麦克风权限；浏览器可能使用联网识别服务…",
    );
    recognition.onstart = () => {
      if (!isCurrent(session) || session.state !== "starting") return;
      window.clearTimeout(session.timer);
      session.state = "on";
      setState("on");
      latest.current.onStatus?.(
        "正在听取语音，点击麦克风停止；文字不会自动发送。",
      );
    };
    recognition.onresult = (event) => {
      if (!isCurrent(session) || session.state === "starting") return;
      let transcript = "";
      for (let i = 0; i < event.results.length; i++)
        transcript += event.results[i][0]?.transcript ?? "";
      transcript = transcript.trim();
      if (!transcript) return;
      const next =
        session.base +
        (session.base && !/\s$/.test(session.base) ? " " : "") +
        transcript;
      session.last = latest.current.value = next;
      latest.current.onChange(next);
    };
    recognition.onerror = (event) => {
      if (isCurrent(session)) finish(session, errorMessage(event.error));
    };
    recognition.onend = () => {
      if (active.current === session)
        finish(session, "语音输入已关闭。", false);
    };
    session.timer = window.setTimeout(
      () => finish(session, "语音识别启动超时，请检查麦克风和网络后重试。"),
      12000,
    );
    try {
      recognition.start();
    } catch {
      finish(session, "语音输入启动失败，请稍后重试。");
    }
  }, [cancel, finish, isCurrent]);

  useLayoutEffect(() => {
    latest.current = { value, onChange, onStatus, enabled, sessionKey };
    const session = active.current;
    if (
      session &&
      (session.key !== sessionKey || !enabled || session.last !== value)
    )
      finish(session, "输入内容或会话已变更，语音输入已关闭。");
  }, [value, onChange, onStatus, enabled, sessionKey, finish]);

  useEffect(() => {
    const interrupt = () => {
      if (active.current)
        finish(active.current, "页面已离开或网络已断开，语音输入已关闭。");
    };
    const visibility = () => {
      if (document.hidden) interrupt();
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", interrupt);
    window.addEventListener("offline", interrupt);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", interrupt);
      window.removeEventListener("offline", interrupt);
      if (active.current) finish(active.current, "");
    };
  }, [finish]);

  return {
    supported: Boolean(recognitionConstructor()),
    state,
    toggle,
    cancel,
  };
}
