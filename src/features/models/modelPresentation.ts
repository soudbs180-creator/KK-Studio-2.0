import type { ModelSelection } from "../../domain/modelSelection.ts";
import { readProviderConnections } from "../creation/providerRegistry.ts";
import { catalogForConnection } from "./modelCatalog.ts";
import { modelDisplay } from "./modelFamilies.ts";
export function selectedModelLabel(selection?: ModelSelection, fallback = "") {
  if (selection?.source !== "api")
    return fallback || selection?.model || "模型";
  const connection = readProviderConnections().find(
    (connection) => connection.id === selection.connectionId,
  );
  const model =
    connection &&
    catalogForConnection(connection).find(
      (model) => model.id === selection.model,
    );
  return (
    modelDisplay(model || { id: selection.model, kind: "unknown" }).family ||
    fallback ||
    "模型"
  );
}
