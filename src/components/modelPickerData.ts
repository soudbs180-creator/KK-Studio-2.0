import type { agentConnection } from "../features/agent/agentConnection";
import { entry, type Entry } from "../features/models/modelMenuEntries.ts";
import type { ModelKind } from "../features/models/modelCatalog";
import type { ModelSelection } from "../features/models/modelSelection";

/** Account-reported Codex choices keep the same modality and connection gates. */
export function codexPickerEntries(
  agent: ReturnType<typeof agentConnection.getState>,
  apiOnly: boolean,
  kind: ModelKind | undefined,
  current: ModelSelection | undefined,
): { codex: Entry[]; codexImage: Entry[] } {
  const codex =
    !apiOnly && (!kind || kind === "text")
      ? agent.models.map((model) =>
          entry(
            { source: "codex", model: model.model || model.id, kind: "text" },
            model.displayName || model.model,
            "Codex · 已登录账号",
            agent.status !== "connected" ? "请先连接 Codex" : undefined,
          ),
        )
      : [];
  const imageLabel =
    current?.source === "codex" && current.kind === "image"
      ? current.effectiveModel || current.displayName || "图片模型未报告"
      : "图片模型未报告";
  const codexImage =
    !apiOnly && (!kind || kind === "image")
      ? [
          entry(
            {
              source: "codex",
              model: "",
              kind: "image",
              displayName: imageLabel,
              effectiveModel:
                current?.source === "codex" && current.kind === "image"
                  ? current.effectiveModel
                  : undefined,
            },
            imageLabel,
            "Codex 内置生图 · 型号以上游回执为准",
            agent.status !== "connected" ? "请先连接 Codex" : undefined,
          ),
        ]
      : [];
  return { codex, codexImage };
}

export function pickerPage(apiOnly: boolean, savedPage: string): string {
  return savedPage === "api" || savedPage.startsWith("api/")
    ? savedPage
    : !apiOnly && savedPage === "codex"
      ? "codex"
      : apiOnly
        ? "api"
        : "root";
}
