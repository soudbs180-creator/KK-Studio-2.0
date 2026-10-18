import { useApplication } from "../application/AppProvider.tsx";
import { Action, Card, Label } from "../ui/primitives.tsx";
import { useAction } from "../ui/useAction.ts";

export function StorageRecovery() {
  const { app, state } = useApplication(),
    { busy, run } = useAction();
  return (
    <Card>
      <Label title>
        {state.auth === "localStorageRecovery"
          ? "本机资料读取失败，原数据保留"
          : "身份已验证，设备存储待恢复"}
      </Label>
      <Label>
        {state.legacyStorageGate
          ? "旧版按用户编号保存的数据没有明确的服务归属。原数据和旧凭据保留，暂不支持自动迁移。启用隔离存储会使用当前身份服务与账号专属的空间。"
          : state.auth === "localStorageRecovery"
            ? "读取或校验失败时不会重置项目；恢复读取前不能创建或生成。请重新读取，或先备份浏览器中的原数据。"
            : "登录会话仍有效。读取或校验失败时不会重置项目；恢复读取前不能创建或生成。"}
      </Label>
      <Action
        primary
        busy={busy}
        label={
          state.legacyStorageGate ? "启用新的隔离存储" : "重新读取设备存储"
        }
        onPress={() =>
          void run(() =>
            state.legacyStorageGate
              ? app.enableIsolatedStorage()
              : app.reloadStorage(),
          )
        }
      />
      {state.auth !== "localStorageRecovery" && (
        <Action
          label="退出当前账号"
          busy={busy}
          onPress={() => void run(() => app.logout())}
        />
      )}
    </Card>
  );
}
