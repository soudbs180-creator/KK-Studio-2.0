import { useEffect, useState } from "react";
import UsageSettings from "./UsageSettings";
import type { CreationProject } from "../../features/creation/index.ts";
import type { SaveState } from "../../features/creation/index.ts";
import { isEnabled } from "../../app/featureFlags.ts";
import {
  getLocalAccountProvider,
  LOCAL_ACCOUNT_CHANGED_EVENT,
  type LocalUsageBudget,
} from "../../features/account/index.ts";
import { getUsageKpis } from "../../features/usage/index.ts";

export default function PlansSettings({
  projects,
  saveState,
}: {
  projects: readonly CreationProject[];
  saveState: SaveState;
}) {
  const showCloudCredits = isEnabled("creditsCloud");
  const [budget, setBudget] = useState<LocalUsageBudget>(() =>
    getLocalAccountProvider({
      readTokensUsed: () => getUsageKpis().totalTokens,
    }).getUsageBudget(),
  );
  const [draftBudget, setDraftBudget] = useState(
    budget.tokenBudget === null ? "" : String(budget.tokenBudget),
  );

  useEffect(() => {
    const refresh = () => {
      const next = getLocalAccountProvider({
        readTokensUsed: () => getUsageKpis().totalTokens,
      }).getUsageBudget();
      setBudget(next);
      setDraftBudget(
        next.tokenBudget === null ? "" : String(next.tokenBudget),
      );
    };
    refresh();
    window.addEventListener(LOCAL_ACCOUNT_CHANGED_EVENT, refresh);
    window.addEventListener("kk:token-usage-changed", refresh);
    return () => {
      window.removeEventListener(LOCAL_ACCOUNT_CHANGED_EVENT, refresh);
      window.removeEventListener("kk:token-usage-changed", refresh);
    };
  }, []);

  function saveBudget(): void {
    const trimmed = draftBudget.trim();
    const value =
      trimmed === ""
        ? null
        : Number.isFinite(Number(trimmed))
          ? Number(trimmed)
          : null;
    const next = getLocalAccountProvider({
      readTokensUsed: () => getUsageKpis().totalTokens,
    }).setTokenBudget(value);
    setBudget(next);
    setDraftBudget(
      next.tokenBudget === null ? "" : String(next.tokenBudget),
    );
  }

  return (
    <div className="settings-detail-stack">
      <div className="settings-info-row">
        <span>套餐与积分</span>
        <strong>本地模式</strong>
      </div>
      <p className="settings-section-intro">
        当前为本地登录：不接入云端套餐与平台积分，也不展示演示余额。用量与预算仅作本机提示，不产生扣费。
      </p>

      <h3 className="settings-detail-label">本机用量与预算占位</h3>
      <div className="settings-detail-card">
        <div>
          <span>已用 Token（本机）</span>
          <strong>{budget.tokensUsed.toLocaleString()}</strong>
        </div>
        <div>
          <span>预算提示</span>
          <strong>{budget.budgetLabel}</strong>
        </div>
      </div>
      <p className="settings-section-intro">{budget.note}</p>
      <label className="settings-field">
        本机 Token 预算（留空表示不限制）
        <input
          inputMode="numeric"
          value={draftBudget}
          placeholder="例如 100000"
          onChange={(event) => setDraftBudget(event.target.value)}
        />
      </label>
      <div className="settings-action-group">
        <button
          type="button"
          className="settings-action secondary"
          onClick={saveBudget}
        >
          保存本机预算
        </button>
      </div>

      {showCloudCredits && (
        <>
          <h3 className="settings-detail-label">云端积分（实验）</h3>
          <p className="settings-section-intro">
            creditsCloud 已打开，但平台积分服务仍未接入，不会扣费。
          </p>
        </>
      )}

      <h3 className="settings-detail-label">使用记录</h3>
      <UsageSettings projects={projects} saveState={saveState} />
    </div>
  );
}
