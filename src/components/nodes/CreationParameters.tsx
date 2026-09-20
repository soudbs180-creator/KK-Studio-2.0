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
 * 参数设置弹层，对照 Figma 170:8853（参数设置 297×229，位于视频模块 170:8490）。
 * 结构按原稿：顶部"比例"标签 → 清晰度分段行（自适应/1K/2K/4K）→ 比例网格（10 格 51×51）→
 * 底部"清晰度"标签。比例"自适应"为自动态（无网格项选中）；视频时长属工程保留项，
 * 原稿 170:8490 中时长"7S"显示在编辑器底栏参数条（261:514 计时图标），待补证后再迁移。
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
        {[
          "1:1",
          "16:9",
          "9:16",
          "3:4",
          "4:3",
          "3:2",
          "2:3",
          "5:4",
          "4:5",
          "21:9",
        ].map((value) => (
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
        <small>草稿参数 · 当前生成使用供应商默认比例与清晰度</small>
      )}
      {kind === "video" && (
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
      )}
    </div>
  );
}
