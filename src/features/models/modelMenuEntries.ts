import {
  groupCatalogModels,
  modelSearchTerms,
  modelDisplay,
} from "./modelFamilies.ts";
import { searchModels } from "./modelSearch.ts";
import { catalogForConnection, type ModelKind } from "./modelCatalog.ts";
import { modelSelectionId, type ModelSelection } from "./modelSelection.ts";
import type { readProviderConnections } from "../creation/providerRegistry.ts";
export interface Entry {
  id: string;
  label: string;
  detail?: string;
  page?: string;
  selection?: ModelSelection;
  disabled?: string;
  terms?: string[];
}

export const entry = (
  selection: ModelSelection,
  label: string,
  detail?: string,
  disabled?: string,
): Entry => ({
  id: modelSelectionId(selection),
  selection,
  label,
  detail,
  disabled,
});

export function apiMenuEntries(
  connections: ReturnType<typeof readProviderConnections>,
  current: ModelSelection | undefined,
  kind: ModelKind | undefined,
  query: string,
): Entry[] {
  return connections.flatMap((connection) =>
    groupCatalogModels(catalogForConnection(connection)).flatMap((group) => {
      const matches = searchModels(
        group.models.map((model) => ({
          model,
          label: group.name,
          terms: [connection.displayName, "API", ...modelSearchTerms(model)],
        })),
        query,
      );
      if (!matches.length) return [];
      const model =
        matches.find(
          (match) =>
            match.item.model.id === current?.model &&
            current.connectionId === connection.id,
        )?.item.model ?? matches[0].item.model;
      return [
        {
          ...entry(
            {
              source: "api",
              model: model.id,
              connectionId: connection.id,
              kind: model.kind,
            },
            group.name,
            connection.displayName +
              (group.models.length > 1
                ? ` · ${group.models.length} 种型号参数`
                : "") +
              (modelDisplay(model).variant
                ? " · " + modelDisplay(model).variant
                : ""),
            connection.state === "disabled" ||
              connection.state === "quarantined"
              ? "连接已禁用或隔离，请检查设置"
              : model.kind === "unknown"
                ? "请先在设置中声明此模型用途"
                : model.kind === "video" || model.kind === "audio"
                  ? "此生成执行器尚未接入"
                  : kind && model.kind !== kind
                    ? `不适用于当前${kind === "image" ? "图片" : kind === "text" ? "文本" : "视频"}节点`
                    : undefined,
          ),
          id: modelSelectionId({
            source: "api",
            connectionId: connection.id,
            model: group.name,
          }),
          terms: [connection.displayName, "API", ...modelSearchTerms(model)],
        },
      ];
    }),
  );
}
