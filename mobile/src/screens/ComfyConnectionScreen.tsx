import { useCallback, useRef, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { useApplication } from "../application/AppProvider.tsx";
import type { MobileConnectionMetadata } from "../core/mobileModel.ts";
import {
  Action,
  Content,
  Empty,
  Header,
  Row,
  Screen,
} from "../ui/primitives.tsx";
import { ComfyConnectionForm } from "./ComfyConnectionForm.tsx";
import { ComfyInspect } from "./ComfyInspect.tsx";
import { ComfyWorkflowEditor } from "./ComfyWorkflowEditor.tsx";
export default function ComfyConnectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { state } = useApplication();
  const connection = state.snapshot?.connections.find(
    (c) => c.id === id && c.protocol === "comfyui",
  );
  if (!connection && id !== "new")
    return (
      <Screen>
        <Header title="ComfyUI" back />
        <Content>
          <Empty title="连接不存在" description="返回工作流目录重新读取。" />
        </Content>
      </Screen>
    );
  return (
    <Console
      key={`${state.accountId}/${id}/${connection?.baseUrl ?? "new"}/${connection?.credentialRef ?? "none"}`}
      connection={connection}
    />
  );
}
function Console({ connection }: { connection?: MobileConnectionMetadata }) {
  const [mode, setMode] = useState<"workflow" | "inspect" | "settings">(
    connection ? "workflow" : "settings",
  );
  const leave = useRef<(proceed: () => void) => void>((proceed) => proceed());
  const rememberLeave = useCallback(
    (request: (proceed: () => void) => void) => {
      leave.current = request;
    },
    [],
  );
  function switchMode(next: typeof mode) {
    if (next === mode) return;
    const proceed = () => {
      leave.current = (action) => action();
      setMode(next);
    };
    if (mode === "inspect") proceed();
    else leave.current(proceed);
  }
  return (
    <Screen keyboard>
      <Header title={connection?.name ?? "添加 ComfyUI"} back />
      <Content>
        {connection && (
          <Row>
            <Action
              selected={mode === "workflow"}
              label="工作流"
              onPress={() => switchMode("workflow")}
            />
            <Action
              selected={mode === "inspect"}
              label="检查服务"
              onPress={() => switchMode("inspect")}
            />
            <Action
              selected={mode === "settings"}
              label="连接设置"
              onPress={() => switchMode("settings")}
            />
          </Row>
        )}
        {mode === "settings" ? (
          <ComfyConnectionForm
            connection={connection}
            onLeave={rememberLeave}
          />
        ) : mode === "inspect" && connection ? (
          <ComfyInspect connection={connection} />
        ) : connection ? (
          <ComfyWorkflowEditor
            connection={connection}
            onLeave={rememberLeave}
          />
        ) : null}
      </Content>
    </Screen>
  );
}
