import { useState } from "react";
import type { CreationDraft } from "@kk-studio/creation-contracts";
import { router } from "expo-router";
import { useApplication } from "../application/AppProvider.tsx";
import { Action, Field, Label, Row } from "../ui/primitives.tsx";
import { Sheet } from "../ui/Sheet.tsx";
import { useAction } from "../ui/useAction.ts";
export function ModelPicker({
  open,
  onClose,
  draft,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  draft: CreationDraft;
  onSelect: (id: string, model: string) => void;
}) {
  const { state, app } = useApplication(),
    { busy, run } = useAction(),
    [search, setSearch] = useState(""),
    [manual, setManual] = useState(""),
    [selected, setSelected] = useState<string>();
  const id = selected ?? draft.providerConnectionId,
    connection = state.snapshot?.connections.find((c) => c.id === id),
    probe = id ? state.health[id] : undefined;
  return (
    <Sheet title="连接与模型" open={open} onClose={onClose}>
      <Label muted small>
        模型列表来自服务端；列表可达不代表某个模型已验证文本或图片生成。
      </Label>
      {state.snapshot?.connections.map((c) => (
        <Action
          key={c.id}
          menu
          selected={c.id === id}
          label={c.name}
          onPress={() => setSelected(c.id)}
        />
      ))}
      {!state.snapshot?.connections.length && <Label muted>还没有连接。</Label>}
      <Action
        label="管理连接"
        onPress={() => {
          onClose();
          router.push("/connections");
        }}
      />
      {connection && (
        <>
          <Row>
            <Action
              label="发现模型"
              busy={busy}
              onPress={() => void run(() => app.probeConnection(connection.id))}
            />
            <Label small muted>
              {probe ? "连接可达 · 生成未验证" : "尚未检查"}
            </Label>
          </Row>
          <Field
            label="搜索模型"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          {probe?.models
            .filter((m) => m.id.toLowerCase().includes(search.toLowerCase()))
            .map((m) => (
              <Action
                key={m.id}
                menu
                selected={
                  connection.id === draft.providerConnectionId &&
                  m.id === draft.model
                }
                label={m.id}
                onPress={() => {
                  onSelect(connection.id, m.id);
                  onClose();
                }}
              />
            ))}
          {probe &&
            !probe.models.some((m) =>
              m.id.toLowerCase().includes(search.toLowerCase()),
            ) && <Label muted>没有匹配的模型。</Label>}
          <Field
            label="或手动填写模型 ID"
            value={manual}
            onChangeText={setManual}
            autoCapitalize="none"
          />
          <Action
            label="使用填写的模型"
            disabled={!manual.trim()}
            onPress={() => {
              onSelect(connection.id, manual.trim());
              onClose();
            }}
          />
        </>
      )}
    </Sheet>
  );
}
