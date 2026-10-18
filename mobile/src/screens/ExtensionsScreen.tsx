import { router } from "expo-router";
import { useApplication } from "../application/AppProvider.tsx";
import { MOBILE_AGENT_UNAVAILABLE_REASON } from "../services/agentClient.ts";
import {
  Action,
  Card,
  Content,
  Header,
  Label,
  Screen,
} from "../ui/primitives.tsx";
export default function ExtensionsScreen() {
  const { state } = useApplication(),
    project = state.snapshot?.projects.find(
      (p) => p.id === state.snapshot?.activeProjectId,
    );
  return (
    <Screen>
      <Header title="扩展与执行" back />
      <Content>
        <Card>
          <Label title>执行来源</Label>
          <Label>默认主 Agent：Codex</Label>
          <Label muted>
            手机创作使用你明确选择的模型连接。本地工具由 KK
            在设备内执行有限操作，角色和指令不会增加工具权限。
          </Label>
          <Action
            label="启动 Codex Agent"
            disabled
            reason={MOBILE_AGENT_UNAVAILABLE_REASON}
          />
          <Action
            label="管理创作模型连接"
            onPress={() => router.push("/connections")}
          />
        </Card>
        <Card>
          <Label title>本地工具与批准</Label>
          <Label muted>
            {project
              ? `${project.name} · ${project.canvas.nodes.length} 个节点 · ${project.canvas.edges.length} 条连接`
              : "先选择或创建一个设备项目。"}
          </Label>
          <Label>
            添加、移动、编辑或移除节点；管理连接与视口。操作先预览并暂存，批准后才改变画布。
          </Label>
          <Action
            primary
            label="编辑当前项目画布"
            disabled={!project}
            reason={!project ? "在项目页创建或打开项目后可使用。" : undefined}
            onPress={() => router.push(`/canvas/${project!.id}`)}
          />
          <Action
            label="查看提案 / 批准 / 拒绝 / 撤回"
            disabled={!project}
            onPress={() => router.push(`/proposals/${project!.id}`)}
          />
          <Action label="管理项目" onPress={() => router.push("/projects")} />
        </Card>
        <Card>
          <Label title>角色与协作职责</Label>
          <Label muted>
            角色说明是创作库中的文字。应用前预览目标草稿，只改变输入，不创建执行账号或启动其他
            Agent。
          </Label>
          <Action
            label="角色说明与提示词库"
            onPress={() => router.push("/library")}
          />
          <Action
            label="多 Agent 远程协作"
            disabled
            reason="手机端尚无绑定账号、设备与项目权限的协作执行协议。"
          />
        </Card>
        <Card>
          <Label title>Skill 指令</Label>
          <Label muted>
            Skill
            指令可以创建、导入、导出和明确应用到草稿。它们是指令文本，与可执行工具分开管理。
          </Label>
          <Action
            label="管理 Skill 指令条目"
            onPress={() => router.push("/library")}
          />
        </Card>
        <Card>
          <Label title>MCP 工具</Label>
          <Action
            label="连接或运行 MCP 工具"
            disabled
            reason="尚未配置经过手机账号、设备和项目授权的工具端点；桌面本地 MCP 进程不能自动在手机执行。"
          />
          <Label muted small>
            模型选择、身份登录或导入角色说明均不会授予工具执行权限。
          </Label>
        </Card>
      </Content>
    </Screen>
  );
}
