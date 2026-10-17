import { router } from "expo-router";
import { useApplication } from "../application/AppProvider.tsx";
import { Action, Label } from "../ui/primitives.tsx";
import { Sheet } from "../ui/Sheet.tsx";
import { useAction } from "../ui/useAction.ts";
export function PhoneMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { app, state } = useApplication(),
    { run } = useAction();
  const go = (
    path:
      | "/"
      | "/projects"
      | "/tasks"
      | "/materials"
      | "/history"
      | "/settings"
      | "/connections"
      | "/search"
      | "/library"
      | "/comfy"
      | "/extensions",
  ) => {
    onClose();
    router.push(path);
  };
  return (
    <Sheet title="KK Studio" side open={open} onClose={onClose}>
      <Label muted>
        {state.auth === "local" ? "本机创作" : state.user?.displayName}
      </Label>
      <Action
        primary
        icon="newChat"
        label="新创作"
        onPress={() =>
          void run(async () => {
            await app.createProject("新创作");
            onClose();
            router.replace("/");
          })
        }
      />
      <Action menu icon="folder" label="项目" onPress={() => go("/projects")} />
      <Action
        menu
        icon="clock"
        label="生成历史"
        onPress={() => go("/history")}
      />
      <Action menu icon="image" label="素材" onPress={() => go("/materials")} />
      <Action menu icon="clock" label="任务" onPress={() => go("/tasks")} />
      <Action menu icon="search" label="搜索" onPress={() => go("/search")} />
      <Action
        menu
        icon="folder"
        label="创作库"
        onPress={() => go("/library")}
      />
      <Action
        menu
        icon="sparkles"
        label="扩展与执行"
        onPress={() => go("/extensions")}
      />
      <Action
        menu
        icon="image"
        label="ComfyUI 工作流"
        onPress={() => go("/comfy")}
      />
      <Label muted small>
        最近项目
      </Label>
      {state.snapshot?.projects
        .slice()
        .sort(
          (a, b) =>
            Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) ||
            b.updatedAt - a.updatedAt,
        )
        .slice(0, 6)
        .map((p) => (
          <Action
            menu
            icon="folder"
            selected={p.id === state.snapshot?.activeProjectId}
            key={p.id}
            label={p.name}
            onPress={() =>
              void run(async () => {
                await app.openProject(p.id);
                onClose();
                router.replace("/");
              })
            }
          />
        ))}
      <Action
        menu
        icon="sliders"
        label="模型连接"
        onPress={() => go("/connections")}
      />
      <Action
        menu
        icon="sliders"
        label="设置"
        onPress={() => go("/settings")}
      />
    </Sheet>
  );
}
