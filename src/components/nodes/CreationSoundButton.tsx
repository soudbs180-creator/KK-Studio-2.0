import UiIcon from "../UiIcon";

export default function CreationSoundButton({
  video,
  soundEnabled,
  disabled,
  onToggle,
}: {
  video: boolean;
  soundEnabled: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      className="param-button voice-button"
      disabled={disabled || !video}
      title={
        video
          ? `视频声音：${soundEnabled ? "开启" : "关闭"}`
          : "语音输入将在服务接入后开放"
      }
      aria-label={video ? "视频声音" : "语音输入（服务未接入）"}
      aria-pressed={video ? soundEnabled : undefined}
      onClick={video ? onToggle : undefined}
    >
      <UiIcon name={video && !soundEnabled ? "mic-off" : "mic"} size={16} />
    </button>
  );
}
