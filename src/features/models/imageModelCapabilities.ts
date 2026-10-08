import {
  imageModelOperations,
  type ImageModelOperation,
} from "../../domain/imageModelCapabilities.ts";
import type { ProviderConnection } from "../../domain/providerConnections.ts";
import type { ModelSelection } from "../../domain/modelSelection.ts";
import { imageReferenceCount } from "../../domain/imageReferences.ts";
import {
  maxReferenceCount,
  type CanvasCollectionItem,
} from "../../domain/canvasItems.ts";
import {
  catalogForConnection,
  readModelCatalogs,
  type CatalogModel,
  type ModelCatalog,
} from "./modelCatalog.ts";

export type CapabilitySupport = "unknown" | "supported" | "unsupported";
export interface ResolvedImageModelCapabilities {
  connectionId?: string;
  declaration?: CatalogModel;
  operations: Record<ImageModelOperation, CapabilitySupport>;
  maxReferences?: number;
  maxGenerationCount?: number;
}

/** Explicit identities take priority; ambiguous legacy selections stay unknown. */
export function imageCapabilitiesForSelection(
  selection: ModelSelection,
  connections: ProviderConnection[],
  catalogs: ModelCatalog[] = readModelCatalogs(),
): ResolvedImageModelCapabilities {
  const candidates = connections.filter((connection) =>
    catalogForConnection(connection, catalogs).some(
      (entry) => entry.id === selection.model,
    ),
  );
  const connection =
    selection.source === "codex"
      ? undefined
      : selection.connectionId
        ? connections.find((entry) => entry.id === selection.connectionId)
        : candidates.length === 1
          ? candidates[0]
          : undefined;
  return resolveImageModelCapabilities(connection, selection.model, catalogs);
}

/** Total submitted images, including the source original for an edit. */
export function canvasImageTotalReferenceLimit(
  item: CanvasCollectionItem,
  connections: ProviderConnection[],
  defaultSelection?: ModelSelection,
  catalogs?: ModelCatalog[],
): number {
  if (item.kind !== "image") return maxReferenceCount(item);
  const capabilities = imageCapabilitiesForSelection(
    {
      source: item.generationSource === "codex" ? "codex" : "api",
      model: item.model ?? defaultSelection?.model ?? "",
      connectionId: item.providerConnectionId ?? defaultSelection?.connectionId,
    },
    connections,
    catalogs,
  );
  return (
    capabilities.maxReferences ??
    maxReferenceCount(item) + imageReferenceCount(item)
  );
}

/** Remaining distinct images; edges sharing the source asset use no extra slot. */
export function canvasImageReferenceLimit(
  item: CanvasCollectionItem,
  connections: ProviderConnection[],
  defaultSelection?: ModelSelection,
  catalogs?: ModelCatalog[],
): number {
  if (item.kind !== "image") return maxReferenceCount(item);
  return Math.max(
    0,
    canvasImageTotalReferenceLimit(
      item,
      connections,
      defaultSelection,
      catalogs,
    ) - imageReferenceCount(item),
  );
}

/** A model can narrow a connection's permissions, never enlarge them. */
export function resolveImageModelCapabilities(
  connection: ProviderConnection | undefined,
  model: string,
  catalogs: ModelCatalog[] = readModelCatalogs(),
): ResolvedImageModelCapabilities {
  const declaration =
    connection &&
    catalogForConnection(connection, catalogs).find(
      (entry) => entry.id === model,
    );
  const operations = Object.fromEntries(
    imageModelOperations.map((operation) => {
      const allowed = connection?.capabilities.operations.includes(operation);
      const stated = declaration?.image?.[operation];
      const support: CapabilitySupport =
        allowed === false || stated === false
          ? "unsupported"
          : allowed && stated === true
            ? "supported"
            : "unknown";
      return [operation, support];
    }),
  ) as Record<ImageModelOperation, CapabilitySupport>;
  const limits = [
    connection?.capabilities.maxReferences,
    declaration?.image?.maxReferences,
  ].filter((value): value is number => value !== undefined);
  return {
    connectionId: connection?.id,
    declaration,
    operations,
    maxReferences:
      operations.edit === "unsupported"
        ? 0
        : limits.length
          ? Math.min(...limits)
          : undefined,
    maxGenerationCount: declaration?.image?.maxGenerationCount,
  };
}
