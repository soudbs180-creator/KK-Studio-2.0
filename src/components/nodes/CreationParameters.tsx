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

/**
 * 参数设置弹层，严格对照 Figma 3287:40291 / 3310:40746 官方 15 档画幅规格母版。
 * 结构：顶部"比例"标签 → 清晰度分段行（自适应/1K/2K/4K）→ 15 档画幅比例网格（3×5 矩阵）→
 * 底部提示信息与视频扩展配置。
 */
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
      aria-label={kind === "image" ? "图片参数选项" : "视频参数选项"}
    >
      <small>比例</small>
      <div className="quality-row" role="group" aria-label="清晰度">
        {["自适应", "1K", "2K", "4K"].map((value) => (
          <button
            key={value}
            className={"quality-btn " + (quality === value ? "active" : "")}
            onClick={() => onQuality(value)}
            aria-pressed={quality === value}
          >
            {value}
          </button>
        ))}
      </div>
      <div className="ratio-grid" role="group" aria-label="画面比例">
        {STANDARDIZED_ASPECT_RATIOS.map((value) => (
          <button
            key={value}
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
          <small>视频生成尚未接入，比例/清晰度/时长暂不发送。</small>
          <label className="video-duration">
            时长
            <select
              aria-label="视频时长"
              value={duration}
              onChange={(e) => onDuration(e.target.value)}
            >
              {["5", "7", "10"].map((value) => (
                <option key={value} value={value}>
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
