import { useMemo, useState } from "react";
import { Button } from "../ui/Button.tsx";
import { Input } from "../ui/Input.tsx";
import { ModalDialog } from "../ui/ModalDialog.tsx";
import BlueprintImport from "./BlueprintImport.tsx";
import {
  askTheMap,
  blueprintHealth,
  moduleCopy,
  toggleModule,
  visibleModules,
  type BlueprintAudience,
  type BlueprintFinding,
  type BlueprintModule,
} from "../../features/canvas/index.ts";
import { appendToActiveAgentDraft } from "../../features/agent/index.ts";
import { useCanvasOperations } from "../../runtime/canvasCommandRuntime.tsx";

function modulesFromCanvas(): BlueprintModule[] {
  return [];
}

export default function BlueprintWorkbench({
  onClose,
}: {
  onClose: () => void;
}) {
  const operations = useCanvasOperations();
  const [audience, setAudience] = useState<BlueprintAudience>("plain");
  const [question, setQuestion] = useState("");
  const [repairNote, setRepairNote] = useState("");
  const [modules, setModules] = useState<BlueprintModule[]>(() => {
    const state = operations?.getState();
    const cards = state?.items ?? [];
    if (!cards.length) return modulesFromCanvas();
    return cards.slice(0, 80).map((item) => ({
      id: item.id,
      title: item.title || item.kind,
      summary: item.description || "这块画布卡片承担的业务作用",
      developer: `${item.kind} · ${item.id}`,
      parentId: item.parentAssetId,
      exposesSecret: /sk-|api[_-]?key|私钥/i.test(
        `${item.title} ${item.description ?? ""}`,
      ),
      connected: true,
    }));
  });
  const visible = useMemo(() => visibleModules(modules), [modules]);
  const findings = useMemo(() => blueprintHealth(modules), [modules]);
  const steps = useMemo(
    () => askTheMap(visible, question),
    [visible, question],
  );
  function focusModule(id: string) {
    window.dispatchEvent(new CustomEvent("kk:focus-node", { detail: id }));
  }
  async function repair(finding: BlueprintFinding) {
    await navigator.clipboard
      ?.writeText(finding.repairPrompt)
      .catch(() => undefined);
    const sent = appendToActiveAgentDraft("*", finding.repairPrompt);
    await operations?.executeOperation({
      op: "update_card",
      payload: {
        id: finding.moduleId,
        patch: { description: finding.repairPrompt.slice(0, 500) },
      },
    });
    focusModule(finding.moduleId);
    setRepairNote(
      sent.applied ? "修复指令已发送到 Agent 草稿" : "修复指令已写入画布节点",
    );
  }
  return (
    <ModalDialog
      isOpen
      className="blueprint-workbench"
      title="架构蓝图映射"
      onClose={onClose}
    >
      <div className="blueprint-toolbar">
        <BlueprintImport />
        <div role="group" aria-label="蓝图视图">
          <Button
            aria-pressed={audience === "plain"}
            onClick={() => setAudience("plain")}
          >
            人话视图
          </Button>
          <Button
            aria-pressed={audience === "developer"}
            onClick={() => setAudience("developer")}
          >
            开发者视图
          </Button>
        </div>
      </div>
      <div className="blueprint-modules">
        {visible.map((module) => (
          <div key={module.id} className="settings-detail-card">
            <Button
              onClick={() => focusModule(module.id)}
              onDoubleClick={() =>
                setModules((current) => toggleModule(current, module.id))
              }
            >
              <strong>{module.title}</strong>
              <span>{moduleCopy(module, audience)}</span>
            </Button>
            {module.recentReason && (
              <em className="blueprint-recent">{module.recentReason}</em>
            )}
          </div>
        ))}
        {!visible.length && (
          <p className="director-caption">当前画布还没有可下钻的蓝图模块。</p>
        )}
      </div>
      <section aria-label="向蓝图提问">
        <p className="director-title">向蓝图提问</p>
        <Input
          aria-label="追踪链路"
          value={question}
          placeholder="输入模块、连线或问题"
          onChange={(event) => setQuestion(event.target.value)}
        />
        {steps.map((step) => (
          <Button key={step.id} onClick={() => focusModule(step.id)}>
            {step.index}. {step.title}
          </Button>
        ))}
      </section>
      <section aria-label="蓝图健康检查">
        <p className="director-title">健康检查</p>
        {findings.length === 0 && <p>没有发现密钥、缺鉴权或孤立模块。</p>}
        {findings.map((finding) => (
          <p key={finding.id}>
            {finding.message}
            <Button onClick={() => void repair(finding)}>一键修复</Button>
          </p>
        ))}
        {repairNote && <p role="status">{repairNote}</p>}
      </section>
    </ModalDialog>
  );
}
