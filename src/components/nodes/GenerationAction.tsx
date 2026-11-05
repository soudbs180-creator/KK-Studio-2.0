import BrandLogo from "../BrandLogo";
import UiIcon from "../UiIcon";

type Generation = {
  phase: "idle" | "loading" | "success" | "error" | "cancelled" | "offline";
  message: string;
  available: boolean;
  cancel: () => void;
  mode?: "provider";
  kind?: "image" | "text" | "video" | "audio";
  configure?: () => void;
  queryOnly?: boolean;
};
export function GenerationAction({
  generation,
  label,
  onRun,
}: {
  generation: Generation;
  label: string;
  onRun: () => void;
}) {
  const loading = generation.phase === "loading";
  return (
    <button
      className="generate-button"
      aria-label={
        loading
          ? `取消${label}生成`
          : generation.queryOnly
            ? `查询${label}任务`
            : `生成${label}`
      }
      disabled={!generation.available}
      title={
        generation.available
          ? generation.queryOnly
            ? "只查询已受理任务，不会重新生成"
            : `使用已配置连接生成并保存${label}`
          : generation.message
      }
      onClick={loading ? generation.cancel : onRun}
    >
      <span className="cost-logo" aria-hidden="true">
        <BrandLogo variant="credit" />
      </span>
      <b>{loading ? "取消" : generation.queryOnly ? "查询" : "生成"}</b>
      <UiIcon name="arrow-up" size={16} />
    </button>
  );
}
export function GenerationStatus({ generation }: { generation: Generation }) {
  if (generation.phase === "idle" && generation.available) return null;
  return (
    <div
      className="local-generation-status"
      data-phase={generation.phase}
      role="status"
    >
      {generation.message}
      {generation.configure && (
        <button type="button" onClick={generation.configure}>
          前往模型设置
        </button>
      )}
    </div>
  );
}
