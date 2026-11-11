import { useMemo, useSyncExternalStore } from "react";
import type { PolicyMode, TicketPhase } from "../domain/superagent/engine.ts";
import {
  commitEngine,
  engineEpoch,
  projectEngine,
  subscribeEngine,
} from "../features/agent/index.ts";
import { Select } from "./ui";

const MODES: Array<{ value: PolicyMode; label: string }> = [
  { value: "off", label: "关闭" },
  { value: "observe", label: "观察" },
  { value: "auto", label: "自动" },
];

const ATTENTION: TicketPhase[] = [
  "person/delivery",
  "person/answer",
  "person/review",
  "person/blocked",
];

export default function StageWorkbenchModal({
  projectId,
}: {
  projectId: string;
}) {
  const version = useSyncExternalStore(subscribeEngine, engineEpoch, () => 0);
  const snapshot = useMemo(
    () => projectEngine(projectId).snapshot(),
    [projectId, version],
  );
  const attention = snapshot.tickets.filter((ticket) =>
    ATTENTION.includes(ticket.phase),
  );
  const working = snapshot.tickets.filter(
    (ticket) => ticket.phase === "working" || ticket.phase === "working/queued",
  );
  const idle = snapshot.tickets.filter((ticket) => ticket.phase === "idle");
  return (
    <section className="stage-supervision" aria-label="阶段监督">
      <div className="settings-detail-card">
        <div>
          <span>准入策略</span>
          <strong>
            {MODES.find((item) => item.value === snapshot.policy.mode)?.label}
          </strong>
        </div>
        <Select
          aria-label="准入策略"
          value={snapshot.policy.mode}
          options={MODES}
          onChange={(mode) => {
            const engine = projectEngine(projectId);
            engine.setPolicy({
              version: engine.policy().version + 1,
              mode,
            });
            if (mode === "observe")
              engine.intake({
                id: `shadow:${projectId}:${Date.now()}`,
                threadId: `${projectId}:shadow`,
                text: "推断任务",
                source: "canvas",
                explicit: false,
              });
            commitEngine(projectId);
          }}
        />
        {snapshot.policy.mode === "observe" && (
          <div>
            <span>影子评估</span>
            <strong>
              {snapshot.observations.length
                ? snapshot.observations.map((item) => `${item.note}`).join("、")
                : "尚无 would accept 记录"}
            </strong>
          </div>
        )}
        {snapshot.pendingNotices > 0 && (
          <div>
            <span>重验通知</span>
            <strong>{snapshot.pendingNotices} 张活跃工单</strong>
          </div>
        )}
      </div>
      <div className="settings-network-row">
        <div>
          <h3>待人介入</h3>
          <p>
            {attention.length
              ? attention.map((ticket) => ticket.phase).join("、")
              : "没有 person/delivery、person/answer、person/review、person/blocked"}
          </p>
        </div>
      </div>
      <div className="settings-network-row">
        <div>
          <h3>活跃执行</h3>
          <p>
            working{" "}
            {working.filter((ticket) => ticket.phase === "working").length}
            {" · "}working/queued{" "}
            {
              working.filter((ticket) => ticket.phase === "working/queued")
                .length
            }
            {" · "}idle {idle.length}
            {" · "}槽位 {snapshot.busy}/{snapshot.slots}
          </p>
        </div>
      </div>
    </section>
  );
}
