import UsageSettings from "./UsageSettings";
import type { CreationProject } from "../../features/creation/index.ts";
import type { SaveState } from "../../features/creation/index.ts";

export default function PlansSettings({
  projects,
  saveState,
}: {
  projects: readonly CreationProject[];
  saveState: SaveState;
}) {
  return (
    <div className="settings-detail-stack">
      <div className="settings-info-row">
        <span>套餐与积分</span>
        <strong>服务未接入</strong>
      </div>
      <p className="settings-section-intro">
        套餐与积分服务尚未接入，不展示演示余额或订阅状态。
      </p>
      <h3 className="settings-detail-label">使用记录</h3>
      <UsageSettings projects={projects} saveState={saveState} />
    </div>
  );
}
