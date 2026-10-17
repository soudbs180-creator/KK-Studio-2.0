import { useState } from "react";
import { router } from "expo-router";
import { useApplication } from "../application/AppProvider.tsx";
import {
  Action,
  Card,
  Content,
  Empty,
  Header,
  Label,
  Row,
  Screen,
} from "../ui/primitives.tsx";
import { useAction } from "../ui/useAction.ts";
import { Sheet } from "../ui/Sheet.tsx";
export default function ConnectionsScreen() {
  const { app, state } = useApplication(),
    { busy, run } = useAction(),
    [removing, setRemoving] = useState<string>();
  return (
    <Screen>
      <Header
        title="模型连接"
        back
        right={
          <Action
            compact
            label="＋ 添加"
            onPress={() => router.push("/connections/new")}
          />
        }
      />
      <Content>
        <Label muted>
          登录账号与 Provider
          独立。端点能力由你明确配置；模型发现不证明生成已验证。
        </Label>
        {!state.snapshot?.connections.length && (
          <Empty
            title="连接你的模型"
            description="填写兼容 API 地址和自己的 Key，随后检查连接。"
          >
            <Action
              primary
              label="添加连接"
              onPress={() => router.push("/connections/new")}
            />
          </Empty>
        )}
        {state.snapshot?.connections.map((c) => (
          <Card key={c.id}>
            <Label title>{c.name}</Label>
            <Label muted small>
              {c.baseUrl}
            </Label>
            <Label small>
              {c.protocol === "comfyui"
                ? "ComfyUI API 工作流"
                : `${c.capabilities?.text ? "文本端点" : "无文本端点"} · ${c.capabilities?.image ? "图片端点" : "无图片端点"}`}
            </Label>
            <Label muted small>
              {state.health[c.id]
                ? `可达 · ${state.health[c.id].models.length} 个模型 · 生成未验证`
                : "连接尚未检查"}
            </Label>
            <Row>
              <Action
                compact
                label={
                  c.protocol === "comfyui" ? "打开工作流控制台" : "检查连接"
                }
                busy={busy}
                disabled={c.protocol === "kk-image-jobs"}
                reason={
                  c.protocol === "kk-image-jobs"
                    ? "Gateway 使用作业回执，未提供模型列表端点。"
                    : undefined
                }
                onPress={() =>
                  c.protocol === "comfyui"
                    ? router.push(`/comfy/${c.id}`)
                    : void run(() => app.probeConnection(c.id))
                }
              />
              <Action
                compact
                label="编辑"
                onPress={() =>
                  router.push({
                    pathname:
                      c.protocol === "comfyui"
                        ? "/comfy/[id]"
                        : "/connections/[id]",
                    params: { id: c.id },
                  })
                }
              />
              <Action
                compact
                danger
                label="移除"
                onPress={() => setRemoving(c.id)}
              />
            </Row>
          </Card>
        ))}
      </Content>
      <Sheet
        title="移除连接"
        open={Boolean(removing)}
        onClose={() => setRemoving(undefined)}
      >
        <Label>删除此连接元数据与设备凭据？有未核对任务时将禁止移除。</Label>
        <Action
          danger
          label="确认移除"
          busy={busy}
          onPress={() =>
            void run(async () => {
              await app.removeConnection(removing!);
              setRemoving(undefined);
            })
          }
        />
      </Sheet>
    </Screen>
  );
}
