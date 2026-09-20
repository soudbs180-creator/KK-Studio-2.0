import type { Asset } from "../../domain/assets";

export default function AssetProvenanceDetail({
  asset,
  inCollection,
  onToggleCollection,
  childIds = [],
}: {
  asset: Asset;
  inCollection: boolean;
  onToggleCollection: () => void;
  childIds?: string[];
}) {
  return (
    <div className="asset-provenance">
      <div className="asset-provenance-badges">
        <span>
          {asset.isAiGenerated
            ? "AI 生成"
            : asset.source === "upload"
              ? "本地导入"
              : "设计示例"}
        </span>
        <button
          type="button"
          aria-pressed={inCollection}
          onClick={onToggleCollection}
        >
          {inCollection ? "已加入集合" : "加入本地集合"}
        </button>
      </div>
      <dl>
        <dt>Provider</dt>
        <dd>{asset.provider ?? "未记录"}</dd>
        <dt>Model</dt>
        <dd>{asset.model ?? "未记录"}</dd>
        <dt>连接</dt>
        <dd title={asset.providerConnectionId}>
          {asset.providerConnectionId ?? "未记录"}
        </dd>
        <dt>任务</dt>
        <dd title={asset.sourceTaskId}>
          {asset.sourceTaskId ?? "本地导入 / 示例"}
        </dd>
        <dt>Prompt Hash</dt>
        <dd title={asset.promptHash}>
          {asset.promptHash ? `${asset.promptHash.slice(0, 24)}…` : "未记录"}
        </dd>
        <dt>assetId</dt>
        <dd title={asset.id}>{asset.id}</dd>
        <dt>SHA-256</dt>
        <dd title={asset.sha256}>
          {asset.sha256 ? `${asset.sha256.slice(0, 24)}…` : "本地导入待归档"}
        </dd>
        <dt>父版本</dt>
        <dd>{asset.parentId ?? "无父素材"}</dd>
        <dt>子版本</dt>
        <dd title={childIds.join(", ")}>
          {childIds.length ? `${childIds.length} 个派生素材` : "暂无派生素材"}
        </dd>
        <dt>来源记录</dt>
        <dd>{asset.originCount ?? 1} 条 · 相同内容保留原始 AI 来源</dd>
        <dt>AI 生成标签</dt>
        <dd>{asset.isAiGenerated ? "AI 生成" : "本地素材"}</dd>
        <dt>C2PA</dt>
        <dd>
          {asset.c2paPresent === true
            ? "已检测"
            : asset.c2paPresent === false
              ? "未检测"
              : "未知 · 未回传"}
        </dd>
        <dt>SynthID</dt>
        <dd>
          {asset.synthIdSignal === true
            ? "已检测"
            : asset.synthIdSignal === false
              ? "未检测"
              : "未知 · 未回传"}
        </dd>
        <dt>生成时间</dt>
        <dd>{new Date(asset.createdAt).toLocaleString()}</dd>
        <dt>来源</dt>
        <dd>
          {asset.source === "provider"
            ? "供应商结果 · 已归档"
            : asset.source === "upload"
              ? "本地文件"
              : "Figma / 本地示例"}
        </dd>
      </dl>
      <p>内容按 SHA-256 去重；C2PA / SynthID 信号未回传时显示未知。</p>
    </div>
  );
}
