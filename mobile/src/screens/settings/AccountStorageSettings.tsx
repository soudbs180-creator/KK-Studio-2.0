import { useState } from "react";
import { Linking, Platform } from "react-native";
import { router } from "expo-router";
import { useApplication } from "../../application/AppProvider.tsx";
import { Action, Card, Label } from "../../ui/primitives.tsx";
import { Sheet } from "../../ui/Sheet.tsx";
import { useAction } from "../../ui/useAction.ts";
export function AccountStorageSettings() {
  const { app, state } = useApplication(),
    { busy, run } = useAction(),
    [logout, setLogout] = useState(false);
  const bytes = state.snapshot?.assets.reduce((sum, a) => sum + a.size, 0) ?? 0;
  const local = state.auth === "local";
  return (
    <>
      <Card>
        <Label title>账号</Label>
        <Label>
          {local ? "本机创作" : state.user?.displayName}
          {"\n"}
          {local ? "仅此浏览器，无需登录" : state.user?.email}
        </Label>
        <Label muted small>
          身份登录与模型连接分开。项目与原件保存在设备，尚未云端同步。
        </Label>
        {local ? (
          <Action
            label="连接账号（可选）"
            busy={busy}
            onPress={() => void run(() => app.enterAccountMode())}
          />
        ) : (
          <>
            <Action
              label="刷新并核对会话"
              busy={busy}
              onPress={() => void run(() => app.refreshSession())}
            />
            <Action danger label="退出登录" onPress={() => setLogout(true)} />
          </>
        )}
      </Card>
      <Card>
        <Label title>存储</Label>
        <Label>
          {state.snapshot?.projects.length ?? 0} 个项目 ·{" "}
          {state.snapshot?.assets.length ?? 0} 件索引原件{"\n"}已索引原件容量{" "}
          {(bytes / 1024 / 1024).toFixed(2)} MB · 快照版本{" "}
          {state.snapshot?.revision ?? 0}
        </Label>
        <Label muted small>
          {Platform.OS === "web"
            ? "项目和原件保存在此浏览器。本机与账号空间分别保存；清理站点数据前先备份。"
            : "SQLite 保存项目，应用文件保存原件，凭据单独使用设备安全存储。"}
        </Label>
        <Action
          label="项目包备份 / 独立恢复"
          onPress={() => router.push("/projects")}
        />
        <Action
          label="重新读取设备存储"
          busy={busy}
          onPress={() => void run(() => app.reloadStorage())}
        />
        <Label muted small>
          出现版本冲突或读写故障时先重新读取，不自动创建空项目覆盖原内容。
        </Label>
        {Platform.OS === "web" && (
          <>
            <Label muted small>
              手机与桌面网页的资料分别保存。原桌面资料仍可在桌面页面访问。
            </Label>
            <Action
              label="打开桌面网页与原资料"
              onPress={() => void run(() => Linking.openURL("/?view=desktop"))}
            />
          </>
        )}
      </Card>
      <Sheet title="退出登录" open={logout} onClose={() => setLogout(false)}>
        <Label>
          设备项目与原件保留。正在进行的请求会停止连接，供应商受理状态仍须核对。
        </Label>
        <Action
          danger
          label="退出此设备"
          busy={busy}
          onPress={() =>
            void run(async () => {
              setLogout(false);
              await app.logout();
            })
          }
        />
      </Sheet>
    </>
  );
}
