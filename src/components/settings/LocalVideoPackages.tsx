import type { recommendLocalModels } from "../../domain/localModelRecommendations";
import SettingsExternalLink from "./SettingsExternalLink";

const warningLabels: Record<string, string> = {
  "busy-gpu": "当前显存有其他占用，启动前需重新检测",
  "busy-ram": "当前内存有其他占用，启动前需重新检测",
  "unknown-current-vram": "当前可用显存未报告",
  "unknown-current-ram": "当前可用内存未报告",
  "runtime-and-node-validation-required": "运行环境与加速节点尚需验证",
  "derivative-license-review-required": "派生模型包许可尚需核对",
};

export default function LocalVideoPackages({
  packages,
}: {
  packages: ReturnType<typeof recommendLocalModels>["videoPackages"];
}) {
  return (
    <details className="settings-disclosure">
      <summary>H3 视频模型候选</summary>
      <p className="settings-section-intro">
        16G 是作者的显存配置建议。完整模型包约 64.7
        GB，安装容量与当前空闲资源分别核对；加速节点、运行和 2K
        再生均未在本机验收。
      </p>
      <div className="settings-detail-stack">
        {packages.map((item) => (
          <article key={item.id} className="settings-model-candidate">
            <h4>{item.name}</h4>
            <p>
              {item.capacityStatus === "candidate"
                ? "容量符合作者建议 · 待实测"
                : item.capacityStatus === "below-guidance"
                  ? "低于作者容量建议"
                  : "硬件信息不足"}
            </p>
            <dl className="settings-summary-list">
              <div>
                <dt>预留安装空间</dt>
                <dd>{(item.requiredDiskBytes / 1e9).toFixed(2)} GB</dd>
              </div>
              <div>
                <dt>权重下载</dt>
                <dd>{(item.downloadBytes / 1e9).toFixed(2)} GB</dd>
              </div>
              <div>
                <dt>安装空间预检</dt>
                <dd>
                  {item.installationSpace === "sufficient"
                    ? "容量足够"
                    : item.installationSpace === "insufficient"
                      ? "当前不足"
                      : "未确认"}
                </dd>
              </div>
              <div>
                <dt>来源</dt>
                <dd>{item.maintainer} · 社区量化</dd>
              </div>
              <div>
                <dt>版本</dt>
                <dd>{item.revision}</dd>
              </div>
              <div>
                <dt>许可</dt>
                <dd>{item.license}</dd>
              </div>
            </dl>
            {item.warnings.length > 0 && (
              <p>
                {[
                  ...new Set(
                    item.warnings.map(
                      (warning) =>
                        warningLabels[warning] ?? "其他兼容性条件尚需核对",
                    ),
                  ),
                ].join("；")}
              </p>
            )}
            <SettingsExternalLink href={item.sourceUrl}>
              查看模型来源
            </SettingsExternalLink>
          </article>
        ))}
      </div>
      <p className="settings-section-intro">
        两种模式共享编码器与 VAE，不能简单把两份体积相加。本地结果调用付费 2K
        API 需要单独授权、费用核对和输入兼容性验证。
      </p>
    </details>
  );
}
