import { router } from "expo-router";
import { useApplication } from "../../application/AppProvider.tsx";
import { Action, Card, Label } from "../../ui/primitives.tsx";
export function AccessSettings() {
  const { state } = useApplication();
  return (
    <>
      <Card>
        <Label title>网络</Label>
        <Label muted>
          正式服务连接使用无凭据 URL 的
          HTTPS。凭据留在设备凭据库，查询参数和重定向不能承载 Key。
        </Label>
        <Action
          label="服务连接地址与访问检查"
          onPress={() => router.push("/connections")}
        />
        <Action
          label="自定义代理 / 证书"
          disabled
          reason="手机端尚无可保存并核验的代理或自定义证书适配器，现有连接使用设备网络。"
        />
      </Card>
      <Card>
        <Label title>记忆</Label>
        <Action
          label="开启手机记忆"
          disabled
          reason="尚无手机端记忆存储与检索适配器；不会把桌面共享文件视为已同步。"
        />
      </Card>
      <Card>
        <Label title>模型访问</Label>
        <Label muted>
          {state.snapshot?.connections.length ?? 0}{" "}
          个设备连接。模型发现表示可达，不证明生成或计费已完成。
        </Label>
        <Action
          label="模型与端点能力"
          onPress={() => router.push("/connections")}
        />
        <Action
          label="提示词 / 模板 / 角色库"
          onPress={() => router.push("/library")}
        />
      </Card>
      <Card>
        <Label title>扩展</Label>
        <Label muted>
          本地有限工具与提案可用。角色、Skill 指令、MCP 工具和远程 Agent
          权限分别管理。
        </Label>
        <Action
          label="扩展、执行来源与批准"
          onPress={() => router.push("/extensions")}
        />
      </Card>
      <Card>
        <Label title>ComfyUI</Label>
        <Action
          label="ComfyUI 工作流"
          onPress={() => router.push("/comfy")}
          reason="服务需提供经过验证的标准 ComfyUI API，模型文件保留在服务设备。"
        />
      </Card>
    </>
  );
}
