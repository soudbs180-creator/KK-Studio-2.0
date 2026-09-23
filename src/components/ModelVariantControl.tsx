import { useEffect, useState } from "react";
import type { ModelSelection } from "../domain/modelSelection";
import { readProviderConnections } from "../features/creation/providerRegistry";
import { catalogForConnection } from "../features/models/modelCatalog";
import {
  groupCatalogModels,
  modelDisplay,
} from "../features/models/modelFamilies";

export default function ModelVariantControl({
  selection,
  onSelect,
}: {
  selection?: ModelSelection;
  onSelect: (selection: ModelSelection) => void;
}) {
  const [, update] = useState(0);
  useEffect(() => {
    const listener = () => update((n) => n + 1);
    window.addEventListener("kk:model-provider-changed", listener);
    return () =>
      window.removeEventListener("kk:model-provider-changed", listener);
  }, []);
  if (selection?.source !== "api" || !selection.connectionId) return null;
  const connection = readProviderConnections().find(
    (item) => item.id === selection.connectionId,
  );
  const models = connection ? catalogForConnection(connection) : [];
  const group = groupCatalogModels(models).find((group) =>
    group.models.some((model) => model.id === selection.model),
  );
  if (
    !group ||
    (group.models.length < 2 && !modelDisplay(group.models[0]).variant)
  )
    return null;
  return (
    <label className="kk-model-variants">
      型号参数
      <select
        aria-label="型号参数"
        className="ui-input"
        value={selection.model}
        onChange={(event) => {
          const model = group.models.find(
            (model) => model.id === event.target.value,
          );
          if (model)
            onSelect({ ...selection, model: model.id, kind: model.kind });
        }}
      >
        {group.models.map((model) => (
          <option key={model.id} value={model.id}>
            {modelDisplay(model).variant || "默认型号"}
          </option>
        ))}
      </select>
      <small title="按供应商的完整型号发送；不额外推测参数。">
        厂商型号：{selection.model}
      </small>
    </label>
  );
}
