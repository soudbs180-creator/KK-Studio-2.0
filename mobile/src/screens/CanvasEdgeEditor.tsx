import { useState } from "react";
import { useApplication } from "../application/AppProvider.tsx";
import type {
  MobileCanvasNode,
  MobileCanvasOperation,
} from "../core/mobileModel.ts";
import { Action, Label } from "../ui/primitives.tsx";
import { Sheet } from "../ui/Sheet.tsx";
import { LocalOptionPicker } from "../ui/LocalOptionPicker.tsx";
import { canvasKindLabels } from "../ui/canvasLabels.ts";
import { useUnsavedExit } from "../ui/useUnsavedExit.tsx";
export function CanvasEdgeEditor({
  nodes,
  onApply,
  onClose,
}: {
  nodes: MobileCanvasNode[];
  onApply: (ops: MobileCanvasOperation[]) => void;
  onClose: () => void;
}) {
  const { app, state } = useApplication(),
    scope = state.accountId!;
  const [source, setSource] = useState(nodes[0]?.id),
    [target, setTarget] = useState(nodes[1]?.id),
    [picking, setPicking] = useState<"source" | "target">();
  const options = nodes.map((n, i) => ({
    id: n.id,
    label: `${i + 1} · ${canvasKindLabels[n.kind]} · ${n.text?.slice(0, 80) ?? n.id}`,
  }));
  const exit = useUnsavedExit(
    source !== nodes[0]?.id || target !== nodes[1]?.id,
    scope,
  );
  return (
    <>
      <Sheet
        title="连接节点"
        open={!picking && !exit.confirming}
        onClose={() => exit.requestClose(onClose)}
      >
        <Action
          label={`来源：${options.find((o) => o.id === source)?.label ?? "未选择"}`}
          onPress={() => setPicking("source")}
        />
        <Action
          label={`目标：${options.find((o) => o.id === target)?.label ?? "未选择"}`}
          onPress={() => setPicking("target")}
        />
        <Label muted>连接只表达画布关系，不会执行模型或工具。</Label>
        <Action
          primary
          label="加入本次连接编辑"
          disabled={!source || !target || source === target}
          onPress={() => {
            try {
              if (app.context().accountId !== scope)
                throw new Error("会话已变化。");
              onApply([
                {
                  type: "add_edge",
                  edge: { id: app.deps.id(), source: source!, target: target! },
                },
              ]);
              exit.allow();
              onClose();
            } catch (error) {
              app.report(error);
            }
          }}
        />
      </Sheet>
      {picking && (
        <LocalOptionPicker
          open={!exit.confirming}
          title={picking === "source" ? "来源节点" : "目标节点"}
          options={options}
          selected={picking === "source" ? source : target}
          onSelect={(id) => {
            (picking === "source" ? setSource : setTarget)(id);
            setPicking(undefined);
          }}
          onClose={() => setPicking(undefined)}
        />
      )}
      {exit.dialog}
    </>
  );
}
