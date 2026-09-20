import { useSpeechInput } from "../features/creation/useSpeechInput";

export default function VoiceInputButton({
  value,
  onChange,
  onStatus,
  className,
  enabled = true,
  sessionKey = "default",
  maxLength = 0,
}: {
  value: string;
  onChange: (value: string) => void;
  onStatus?: (message: string) => void;
  className?: string;
  enabled?: boolean;
  sessionKey?: string;
  maxLength?: number;
}) {
  const { supported, state, toggle } = useSpeechInput({
    value,
    onChange,
    onStatus,
    enabled,
    sessionKey,
    maxLength,
  });
  const label = !supported
    ? "语音输入（当前运行环境不支持）"
    : !enabled
      ? "语音输入（当前不可用）"
      : state === "off"
        ? "开启语音输入"
        : "关闭语音输入";
  const active = enabled && state !== "off";
  const title = !supported
    ? "当前运行环境不支持语音识别"
    : !enabled
      ? "当前页面未处于可编辑的语音输入状态"
      : state === "starting"
        ? "正在启动语音输入，点击取消"
        : state === "stopping"
          ? "正在停止语音输入，点击取消"
          : active
            ? "停止语音输入"
            : "开始语音输入";
  return (
    <button
      type="button"
      className={className}
      disabled={!supported || !enabled}
      title={title}
      aria-label={label}
      aria-pressed={supported && enabled ? active : undefined}
      aria-busy={
        supported && enabled && (state === "starting" || state === "stopping")
          ? true
          : undefined
      }
      data-voice-state={
        !supported ? "unsupported" : !enabled ? "disabled" : state
      }
      onClick={toggle}
    >
      <img
        src={
          active
            ? "/design/figma/composer-mic.svg"
            : "/design/figma/mic-off.svg"
        }
        alt=""
      />
    </button>
  );
}
