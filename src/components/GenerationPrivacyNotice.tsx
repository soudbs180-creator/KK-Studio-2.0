import type { CreationDraft } from "../features/creation/index.ts";

// 等 A 的 featureFlags.platformQuotaMode；该入口未开放，先不渲染隐私条
const SHOW_UNFINISHED: boolean = false;

export default function GenerationPrivacyNotice({
  mode,
}: {
  mode: CreationDraft["privacyMode"];
}) {
  if (mode === "byok_local") return null;
  if (mode === "platform_backed" && !SHOW_UNFINISHED) return null;
  return (
    <p className="generation-privacy-notice" role="status">
      仅本地 · 自带 Key（BYOK）模式，提示词与参考素材只在本机处理。
    </p>
  );
}
