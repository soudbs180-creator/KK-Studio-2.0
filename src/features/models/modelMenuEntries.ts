import { modelSearchTerms, modelDisplay } from "./modelFamilies.ts";
import { searchModels } from "./modelSearch.ts";
import { catalogForConnection, type ModelKind } from "./modelCatalog.ts";
import { modelSelectionId, type ModelSelection } from "./modelSelection.ts";
import type { readProviderConnections } from "../creation/providerRegistry.ts";
import {
  providerNeedsKey,
  supportsProviderImages,
} from "../../domain/providerProtocol.ts";
export interface Entry {
  id: string;
  label: string;
  detail?: string;
  page?: string;
  selection?: ModelSelection;
  checked?: boolean;
  disabled?: string;
  terms?: string[];
  legacyPinId?: string;
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
  _current: ModelSelection | undefined,
  kind: ModelKind | undefined,
  query: string,
): Entry[] {
  return connections.flatMap((connection) =>
    searchModels(
      catalogForConnection(connection).map((model) => ({
        model,
        label: model.id,
        terms: [connection.displayName, "API", ...modelSearchTerms(model)],
      })),
      query,
    ).map(({ item: { model } }) => {
      const display = modelDisplay(model);
      const detailParts = [
        connection.displayName,
        display.family !== model.id ? display.family : undefined,
        display.variant || undefined,
      ].filter(Boolean);
      return {
        ...entry(
          {
            source: "api",
            model: model.id,
            connectionId: connection.id,
            kind: model.kind,
          },
          model.id,
          detailParts.join(" · "),
          connection.kind !== "user_byok"
            ? "此连接的生成执行器尚未接入"
            : connection.state === "disabled" ||
                connection.state === "quarantined"
              ? "连接已禁用或隔离，请检查设置"
              : model.kind === "unknown"
                ? "请先在设置中声明此模型用途"
                : model.kind === "image" &&
                    (!supportsProviderImages(connection) ||
                      !providerNeedsKey({
                        ...connection,
                        baseUrl: connection.baseUrl ?? "",
                      }))
                  ? "此连接协议的图片执行器尚未接入"
                  : model.kind === "video" || model.kind === "audio"
                    ? "此生成执行器尚未接入"
                    : kind && model.kind !== kind
                      ? `不适用于当前${kind === "image" ? "图片" : kind === "text" ? "文本" : "视频"}节点`
                      : undefined,
        ),
        terms: [connection.displayName, "API", ...modelSearchTerms(model)],
        legacyPinId: modelSelectionId({
          source: "api",
          connectionId: connection.id,
          model: display.family,
        }),
      };
    }),
  );
}
