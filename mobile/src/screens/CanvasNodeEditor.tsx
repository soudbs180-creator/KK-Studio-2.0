import { useState } from "react";
import { useApplication } from "../application/AppProvider.tsx";
import type {
  MobileCanvasNode,
  MobileCanvasOperation,
} from "../core/mobileModel.ts";
import { canvasInputNumber } from "../application/canvasInput.ts";
import { Action, Field, Label, Row } from "../ui/primitives.tsx";
import { Sheet } from "../ui/Sheet.tsx";
import { LocalOptionPicker } from "../ui/LocalOptionPicker.tsx";
import { canvasKindLabels } from "../ui/canvasLabels.ts";
import { useAction } from "../ui/useAction.ts";
import { useUnsavedExit } from "../ui/useUnsavedExit.tsx";
export function CanvasNodeEditor({
  node,
  onApply,
  onClose,
}: {
  node?: MobileCanvasNode;
  onApply: (ops: MobileCanvasOperation[]) => void;
  onClose: () => void;
}) {
  const { app, state } = useApplication(),
    scope = state.accountId!,
    { busy, run } = useAction();
  const [kind, setKind] = useState<MobileCanvasNode["kind"]>(
      node?.kind ?? "text",
    ),
    [x, setX] = useState(String(node?.x ?? 0)),
    [y, setY] = useState(String(node?.y ?? 0));
  const [text, setText] = useState(node?.text ?? ""),
    [assetId, setAssetId] = useState(node?.assetId),
    [picking, setPicking] = useState(false);
  const [baseline] = useState(() =>
    JSON.stringify([kind, x, y, text, assetId]),
  );
  const exit = useUnsavedExit(
    baseline !== JSON.stringify([kind, x, y, text, assetId]),
    scope,
  );
  const assets =
    state.snapshot?.assets.filter(
      (a) =>
        !a.hidden &&
        !a.deleting &&
        (kind === "file" || a.mime.startsWith(`${kind}/`)),
    ) ?? [];
  return (
    <>
      <Sheet
        title={node ? "编辑节点" : "添加节点"}
        open={!picking && !exit.confirming}
        onClose={() => exit.requestClose(onClose)}
      >
        {node ? (
          <Label>
            节点 {node.id} · {canvasKindLabels[node.kind]}
          </Label>
        ) : (
          <Row>
            {(Object.keys(canvasKindLabels) as MobileCanvasNode["kind"][]).map(
              (k) => (
                <Action
                  compact
                  key={k}
                  selected={kind === k}
                  label={canvasKindLabels[k]}
                  onPress={() => {
                    setKind(k);
                    setAssetId(undefined);
                  }}
                />
              ),
            )}
          </Row>
        )}
        <Field label="X 坐标" value={x} onChangeText={setX} maxLength={32} />
        <Field label="Y 坐标" value={y} onChangeText={setY} maxLength={32} />
        {kind === "text" ? (
          <Field
            label="节点文字"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={200000}
            style={{ minHeight: 140, textAlignVertical: "top" }}
          />
        ) : node ? (
          <Label muted>
            此节点保持原素材引用；可移动节点，修改素材请添加新节点。
          </Label>
        ) : (
          <Action
            label={
              assets.find((a) => a.id === assetId)?.name ?? "选择设备素材原件"
            }
            onPress={() => setPicking(true)}
          />
        )}
        <Label muted small>
          这里只加入本次编辑。还须创建提案、预览并批准，才会改变已保存画布。新坐标绝对值须不超过
          10000000。
        </Label>
        <Action
          primary
          label="加入本次画布编辑"
          busy={busy}
          disabled={kind !== "text" && !node && !assetId}
          onPress={() =>
            void run(async () => {
              if (app.context().accountId !== scope)
                throw new Error("会话已变化。");
              const coords = {
                x: canvasInputNumber(x),
                y: canvasInputNumber(y),
              };
              const ops: MobileCanvasOperation[] = node
                ? [
                    { type: "move_node", nodeId: node.id, ...coords },
                    ...(kind === "text"
                      ? [{ type: "edit_text" as const, nodeId: node.id, text }]
                      : []),
                  ]
                : [
                    {
                      type: "add_node",
                      node: {
                        id: app.deps.id(),
                        kind,
                        ...coords,
                        ...(kind === "text" ? { text } : { assetId }),
                      },
                    },
                  ];
              onApply(ops);
              exit.allow();
              onClose();
            })
          }
        />
      </Sheet>
      {picking && (
        <LocalOptionPicker
          open={!exit.confirming}
          title="选择节点原件"
          options={assets.map((a) => ({
            id: a.id,
            label: `${a.name} · ${a.mime}`,
          }))}
          selected={assetId}
          onSelect={(id) => {
            setAssetId(id);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      )}
      {exit.dialog}
    </>
  );
}
