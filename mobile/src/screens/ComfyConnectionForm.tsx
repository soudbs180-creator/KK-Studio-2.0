import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { router } from "expo-router";
import type { MobileConnectionMetadata } from "../core/mobileModel.ts";
import { useApplication } from "../application/AppProvider.tsx";
import { Action, Card, Field, Label } from "../ui/primitives.tsx";
import { useComfy } from "../ui/useComfy.ts";
import { useAction } from "../ui/useAction.ts";
import { useUnsavedExit } from "../ui/useUnsavedExit.tsx";
export function ComfyConnectionForm({
  connection,
  onLeave,
}: {
  connection?: MobileConnectionMetadata;
  onLeave?: (request: (proceed: () => void) => void) => void;
}) {
  const { app, state } = useApplication(),
    scope = state.accountId!,
    flow = useComfy(),
    { busy, run } = useAction();
  const [name, setName] = useState(connection?.name ?? ""),
    [baseUrl, setBaseUrl] = useState(connection?.baseUrl ?? ""),
    [secret, setSecret] = useState("");
  const dirty =
    name !== (connection?.name ?? "") ||
    baseUrl !== (connection?.baseUrl ?? "") ||
    Boolean(secret);
  const exit = useUnsavedExit(dirty, scope);
  useEffect(() => {
    onLeave?.(exit.requestClose);
  }, [onLeave, exit.requestClose]);
  return (
    <>
      <Card>
        <Field
          label="连接名称"
          value={name}
          onChangeText={setName}
          maxLength={200}
          editable={!busy}
        />
        <Field
          label={
            app.deps.allowLoopbackHttp
              ? "API 地址（开发允许本机 HTTP）"
              : "HTTPS API 地址"
          }
          value={baseUrl}
          onChangeText={setBaseUrl}
          autoCapitalize="none"
          keyboardType="url"
          editable={!busy}
        />
        <Field
          label={
            connection?.credentialRef
              ? "服务令牌（留空保留；换地址须提供新凭据）"
              : "服务令牌（服务无需认证时可留空）"
          }
          value={secret}
          onChangeText={setSecret}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="off"
          editable={!busy}
        />
        <Label muted small>
          {Platform.OS === "web"
            ? "浏览器凭据仅在内存，刷新后需重新填写。"
            : "凭据保存在设备安全库，不进入工作流、项目或备份。"}
        </Label>
      </Card>
      <Action
        primary
        label="保存 ComfyUI 连接"
        busy={busy}
        disabled={!name.trim() || !baseUrl.trim()}
        onPress={() =>
          void run(async () => {
            const ctx = app.context();
            const id = await flow.saveConnection(
              { id: connection?.id, name, baseUrl },
              secret,
              scope,
            );
            if (app.valid(ctx)) {
              setSecret("");
              exit.allow();
              router.replace(`/comfy/${id}`);
            }
          })
        }
      />
      {exit.dialog}
    </>
  );
}
