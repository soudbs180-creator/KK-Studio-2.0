import type { CreationDraft } from "../features/creation/model";

export default function GenerationPrivacyNotice({
  mode,
}: {
  mode: CreationDraft["privacyMode"];
}) {
  if (mode === "byok_local") return null;
  return (
    <p className="generation-privacy-notice" role="status">
      {mode === "platform_backed"
        ? "Prototype · 平台模式会把提示词和参考素材传到远程服务，数据会离开本机。Provider：平台路由未接入，尚未分配。数据保留策略：尚未提供，接入并披露后才能提交。目前不会上传或扣费。"
        : "仅本地 · 此入口的 ComfyUI 工作流尚未接入，当前无法执行；不会发送远程请求。"}
    </p>
  );
}
