import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  [index: number]: { transcript: string } | undefined;
};

type SpeechRecognitionEventLike = Event & {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionErrorEventLike = Event & {
  error: string;
};

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface SpeechRecognitionWindow extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

export type SpeechInputState = "off" | "starting" | "on" | "stopping";

interface SpeechSession {
  recognition: SpeechRecognitionLike;
  baseValue: string;
  lastValue: string;
  state: Exclude<SpeechInputState, "off">;
  startTimer?: number;
  stopTimer?: number;
}

function recognitionConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const speechWindow = window as SpeechRecognitionWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

function joinTranscript(base: string, transcript: string): string {
  const cleanBase = base.trimEnd();
  const cleanTranscript = transcript.trim();
  if (!cleanBase) return cleanTranscript;
  if (!cleanTranscript) return cleanBase;
  return cleanBase + " " + cleanTranscript;
}

function limitText(value: string, maxLength: number): string {
  if (maxLength <= 0) return value;
  let limited = "";
  for (const character of value) {
    if (limited.length + character.length > maxLength) break;
    limited += character;
  }
  return limited;
}

function speechErrorMessage(error: string): string {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "麦克风权限被拒绝，请在浏览器设置中允许。";
    case "audio-capture":
      return "没有检测到可用麦克风，请检查系统输入设备。";
    case "network":
      return "语音识别需要网络服务，当前网络不可用。";
    case "no-speech":
      return "没有听到语音，可再次点击尝试。";
    case "language-not-supported":
      return "当前环境不支持中文语音识别。";
    case "aborted":
      return "";
    default:
      return "语音识别失败，请稍后重试。";
  }
}

/**
 * Browser speech recognition adapter. The browser owns microphone permission
 * and recognition service; this hook returns transcript text only and never
 * stores audio or claims offline support.
 */
export function useSpeechInput({
  value,
  onChange,
  onStatus,
  enabled = true,
  sessionKey = "default",
  maxLength = 0,
}: {
  value: string;
  onChange: (value: string) => void;
  onStatus?: (message: string) => void;
  enabled?: boolean;
  sessionKey?: string;
  maxLength?: number;
}): {
  supported: boolean;
  state: SpeechInputState;
  toggle: () => void;
} {
  const constructor = recognitionConstructor();
  const constructorRef = useRef<SpeechRecognitionConstructor>();
  const sessionRef = useRef<SpeechSession | null>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const onStatusRef = useRef(onStatus);
  const enabledRef = useRef(enabled);
  const sessionKeyRef = useRef(sessionKey);
  const maxLengthRef = useRef(maxLength);
  const [state, setState] = useState<SpeechInputState>("off");

  constructorRef.current = constructor;
  valueRef.current = value;
  onChangeRef.current = onChange;
  onStatusRef.current = onStatus;
  enabledRef.current = enabled;
  sessionKeyRef.current = sessionKey;
  maxLengthRef.current = maxLength;

  const clearSession = useCallback(
    (session: SpeechSession, abort: boolean): void => {
      if (session.startTimer !== undefined)
        window.clearTimeout(session.startTimer);
      if (session.stopTimer !== undefined)
        window.clearTimeout(session.stopTimer);
      session.recognition.onstart = null;
      session.recognition.onresult = null;
      session.recognition.onerror = null;
      session.recognition.onend = null;
      if (abort) {
        try {
          session.recognition.abort();
        } catch {
          // The browser may have already ended the recognition service.
        }
      }
      if (sessionRef.current === session) sessionRef.current = null;
    },
    [],
  );

  const finish = useCallback(
    (session: SpeechSession, message?: string): void => {
      if (sessionRef.current !== session) return;
      clearSession(session, true);
      setState("off");
      if (message) onStatusRef.current?.(message);
    },
    [clearSession],
  );

  const isCurrent = useCallback(
    (session: SpeechSession): boolean =>
      sessionRef.current === session &&
      enabledRef.current &&
      sessionKeyRef.current === sessionKey,
    [sessionKey],
  );

  const begin = useCallback((): void => {
    const Constructor = constructorRef.current;
    if (!Constructor || !enabledRef.current || sessionRef.current) return;

    let recognition: SpeechRecognitionLike;
    try {
      recognition = new Constructor();
    } catch {
      onStatusRef.current?.("当前运行环境无法启动语音识别。");
      return;
    }
    const session: SpeechSession = {
      recognition,
      baseValue: valueRef.current,
      lastValue: valueRef.current,
      state: "starting",
    };
    sessionRef.current = session;
    setState("starting");
    onStatusRef.current?.("正在请求麦克风权限…");

    recognition.lang = "zh-CN";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      if (!isCurrent(session)) return;
      if (session.startTimer !== undefined)
        window.clearTimeout(session.startTimer);
      session.state = "on";
      setState("on");
      onStatusRef.current?.("正在听取语音，点击麦克风停止。");
    };
    recognition.onresult = (event) => {
      if (!isCurrent(session)) return;
      if (valueRef.current !== session.lastValue) {
        finish(session, "文字内容已修改，语音输入已关闭。");
        return;
      }
      let transcript = "";
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0]?.transcript ?? "";
      }
      const recognizedValue = joinTranscript(session.baseValue, transcript);
      const nextValue = limitText(recognizedValue, maxLengthRef.current);
      session.lastValue = nextValue;
      valueRef.current = nextValue;
      onChangeRef.current(nextValue);
      if (
        maxLengthRef.current > 0 &&
        recognizedValue.length >= maxLengthRef.current
      ) {
        finish(session, "已达到提示词字数上限，语音输入已关闭。");
      }
    };
    recognition.onerror = (event) => {
      if (!isCurrent(session)) return;
      const message = speechErrorMessage(event.error);
      clearSession(session, true);
      setState("off");
      if (message) onStatusRef.current?.(message);
    };
    recognition.onend = () => {
      if (!isCurrent(session)) return;
      clearSession(session, false);
      setState("off");
      onStatusRef.current?.("语音输入已关闭。");
    };
    session.startTimer = window.setTimeout(() => {
      if (isCurrent(session) && session.state === "starting")
        finish(session, "语音识别启动超时，请检查麦克风和网络后重试。");
    }, 12000);
    try {
      recognition.start();
    } catch {
      clearSession(session, true);
      setState("off");
      onStatusRef.current?.("语音输入启动失败，请稍后重试。");
    }
  }, [clearSession, finish, isCurrent]);

  const stop = useCallback((): void => {
    const session = sessionRef.current;
    if (!session) return;
    if (session.state === "starting") {
      clearSession(session, true);
      setState("off");
      onStatusRef.current?.("语音输入已取消。");
      return;
    }
    if (session.state === "stopping") {
      finish(session, "语音输入已取消。");
      return;
    }
    session.state = "stopping";
    setState("stopping");
    if (session.startTimer !== undefined)
      window.clearTimeout(session.startTimer);
    session.stopTimer = window.setTimeout(() => {
      if (sessionRef.current === session) finish(session, "语音输入已关闭。");
    }, 3000);
    try {
      session.recognition.stop();
    } catch {
      finish(session, "语音输入已关闭。");
      return;
    }
  }, [clearSession, finish]);

  useEffect(() => {
    const session = sessionRef.current;
    if (session) finish(session, "语音输入已关闭。");
  }, [enabled, sessionKey, finish]);

  useEffect(
    () => () => {
      const current = sessionRef.current;
      if (current) clearSession(current, true);
    },
    [clearSession],
  );

  useEffect(() => {
    const session = sessionRef.current;
    if (session && session.lastValue !== value) {
      clearSession(session, true);
      setState("off");
      onStatusRef.current?.("文字内容已修改，语音输入已关闭。");
    }
  }, [clearSession, value]);

  useEffect(() => {
    if (!enabled) return;
    const onOffline = () => {
      const session = sessionRef.current;
      if (session) finish(session, "网络已断开，语音输入已关闭。");
    };
    window.addEventListener("offline", onOffline);
    return () => window.removeEventListener("offline", onOffline);
  }, [enabled, finish]);

  const toggle = useCallback(() => {
    if (!constructorRef.current) {
      onStatusRef.current?.("当前运行环境不支持语音识别。");
      return;
    }
    if (!enabledRef.current) return;
    if (sessionRef.current) stop();
    else begin();
  }, [begin, stop]);

  return {
    supported: Boolean(constructor),
    state,
    toggle,
  };
}
