export const STANDARDIZED_ASPECT_RATIOS = [
  "16:9",
  "21:9",
  "4:5",
  "5:4",
  "2:3",
  "3:2",
  "4:3",
  "9:16",
  "1:1",
  "3:4",
  "自适应",
  "1:4",
  "4:1",
  "1:8",
  "8:1",
] as const;

export type StandardizedAspectRatio =
  (typeof STANDARDIZED_ASPECT_RATIOS)[number];

interface CreationParametersProps {
  kind: "image" | "video";
  ratio: string;
  quality: string;
  duration: string;
  onRatio: (value: string) => void;
  onQuality: (value: string) => void;
  onDuration: (value: string) => void;
}

/** Functional options follow current Figma Veo variant 630:7196 and the configured adapter. */
export default function CreationParameters({
  kind,
  ratio,
  quality,
  duration,
  onRatio,
  onQuality,
  onDuration,
}: CreationParametersProps) {
  return (
    <div
      className="node-popover parameter-menu"
      role="dialog"
      aria-label={kind === "image" ? "图片参数选项" : "视频参数选项"}
    >
      <small>比例</small>
      <div className="quality-row" role="group" aria-label="清晰度">
        {(kind === "video"
          ? [
              ...new Set([
                "720p",
                "1080p",
                "4K",
                ...(!["720p", "1080p", "4K"].includes(quality)
                  ? [quality]
                  : []),
              ]),
            ]
          : ["自适应", "1K", "2K", "4K"]
        ).map((value) => (
          <button
            type="button"
            key={value}
            disabled={kind === "video" && !["720p", "1080p"].includes(value)}
            title={
              kind === "video" && !["720p", "1080p"].includes(value)
                ? "当前连接不支持此分辨率，请选择 720p 或 1080p"
                : undefined
            }
            className={"quality-btn " + (quality === value ? "active" : "")}
            onClick={() => onQuality(value)}
            aria-pressed={quality === value}
          >
            {value}
          </button>
        ))}
      </div>
      <div className="ratio-grid" role="group" aria-label="画面比例">
        {(kind === "video"
          ? [
              ...new Set([
                "16:9",
                "9:16",
                ...(!["16:9", "9:16"].includes(ratio) ? [ratio] : []),
              ]),
            ]
          : STANDARDIZED_ASPECT_RATIOS
        ).map((value) => (
          <button
            type="button"
            key={value}
            disabled={kind === "video" && !["16:9", "9:16"].includes(value)}
            title={
              kind === "video" && !["16:9", "9:16"].includes(value)
                ? "当前连接仅支持 16:9 或 9:16"
                : undefined
            }
            className={"ratio-btn " + (ratio === value ? "active" : "")}
            onClick={() => onRatio(value)}
            aria-pressed={ratio === value}
          >
            <span className="ratio-box" data-ratio={value} />
            <small>{value}</small>
          </button>
        ))}
      </div>
      <small>清晰度</small>
      {kind === "image" && (
        <small>
          比例与清晰度会随本次生成发送；选“自适应”时使用供应商默认尺寸。
        </small>
      )}
      {kind === "video" && (
        <>
          <small>
            参数随本次视频任务发送；不支持的旧参数保留显示，请重新选择。
          </small>
          <label className="video-duration">
            时长
            <select
              aria-label="视频时长"
              value={duration}
              onChange={(e) => onDuration(e.target.value)}
            >
              {[...new Set(["4", "6", "8", duration])].map((value) => (
                <option
                  key={value}
                  value={value}
                  disabled={!["4", "6", "8"].includes(value)}
                >
                  {value} 秒
                </option>
              ))}
            </select>
          </label>
        </>
      )}
    </div>
  );
}
