import type { useLocalGeneration } from "./useLocalGeneration";
import "../../styles/local-generation.css";
import BrandLogo from "../BrandLogo";

type Generation = Pick<
  ReturnType<typeof useLocalGeneration>,
  "phase" | "message" | "available" | "cancel"
> & { mode?: "provider"; kind?: "image" | "text" };
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
          ? generation.mode === "provider"
            ? `取消${label}生成`
            : "取消本地演示"
          : `生成${label}`
      }
      disabled={!generation.available}
      title={
        generation.mode === "provider"
          ? generation.available
            ? `使用已配置连接生成并保存${label}`
            : generation.message
          : loading
            ? "取消正在加载的本地演示"
            : "加载固定本地测试素材，不消耗积分"
      }
      onClick={loading ? generation.cancel : onRun}
    >
      <span className="cost-logo" aria-hidden="true">
        <BrandLogo variant="credit" />
      </span>
      <b>
        {loading ? "取消" : generation.mode === "provider" ? "生成" : "演示"}
      </b>
      <img
        className="generate-arrow"
        src="/design/figma/generate-arrow.svg"
        alt=""
      />
    </button>
  );
}
export function GenerationStatus({ generation }: { generation: Generation }) {
  // Keep the idle editor visually aligned with the source card. The demo
  // nature is already visible on the action button; reserve this status row
  // for an observable operation or recovery state.
  if (
    generation.phase === "idle" &&
    (generation.mode !== "provider" || generation.available)
  )
    return null;
  return (
    <div
      className="local-generation-status"
      data-phase={generation.phase}
      role="status"
    >
      {generation.message}
    </div>
  );
}
