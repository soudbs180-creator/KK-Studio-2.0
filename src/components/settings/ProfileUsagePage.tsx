import { useEffect, useState } from "react";
import type {
  DailyUsageSummary,
  UsageKpis,
} from "../../features/usage/index.ts";
import {
  getDailySummaries,
  getModelBreakdown,
  getUsageKpis,
  getUsageRecords,
  seedSampleUsageIfEmpty,
} from "../../features/usage/index.ts";
import { isEnabled } from "../../app/featureFlags.ts";
import {
  getLocalAccountProvider,
  LOCAL_ACCOUNT_CHANGED_EVENT,
  type AccountProfile,
} from "../../features/account/index.ts";

import {
  cardBox,
  ProfileModelBreakdownCard,
  ProfileRecentRecordsCard,
} from "./ProfileUsageCards";
import ProfileUsageChart from "./ProfileUsageCharts";

export default function ProfileUsagePage() {
  const account = getLocalAccountProvider();
  const [profile, setProfile] = useState<AccountProfile>(() =>
    account.getProfile(),
  );
  const [draftName, setDraftName] = useState(profile.displayName);
  const [draftBio, setDraftBio] = useState(profile.bio);
  const [savedHint, setSavedHint] = useState<string | null>(null);
  const [daysRange, setDaysRange] = useState<7 | 14>(7);
  const [hoveredDay, setHoveredDay] = useState<DailyUsageSummary | null>(null);
  const [kpis, setKpis] = useState<UsageKpis>(getUsageKpis);
  const [dailyData, setDailyData] = useState<DailyUsageSummary[]>(() =>
    getDailySummaries(7),
  );
  const [modelBreakdown, setModelBreakdown] =
    useState<Record<string, number>>(getModelBreakdown);
  const showCloud = isEnabled("accountCloud");

  useEffect(() => {
    seedSampleUsageIfEmpty();
    const refreshUsage = () => {
      setKpis(getUsageKpis());
      setDailyData(getDailySummaries(daysRange));
      setModelBreakdown(getModelBreakdown());
    };
    const refreshProfile = () => {
      const next = getLocalAccountProvider().getProfile();
      setProfile(next);
      setDraftName(next.displayName);
      setDraftBio(next.bio);
    };
    refreshUsage();
    refreshProfile();
    window.addEventListener("kk:token-usage-changed", refreshUsage);
    window.addEventListener(LOCAL_ACCOUNT_CHANGED_EVENT, refreshProfile);
    return () => {
      window.removeEventListener("kk:token-usage-changed", refreshUsage);
      window.removeEventListener(LOCAL_ACCOUNT_CHANGED_EVENT, refreshProfile);
    };
  }, [daysRange]);

  const modelEntries = Object.entries(modelBreakdown).sort(
    (a, b) => b[1] - a[1],
  );
  const totalModelTokens = modelEntries.reduce((sum, [, val]) => sum + val, 0);
  const recentRecords = getUsageRecords().slice(-5).reverse();
  const dirty =
    draftName.trim() !== profile.displayName || draftBio.trim() !== profile.bio;

  function saveProfile(): void {
    const next = getLocalAccountProvider().updateProfile({
      displayName: draftName,
      bio: draftBio,
    });
    setProfile(next);
    setDraftName(next.displayName);
    setDraftBio(next.bio);
    setSavedHint("已保存到本机");
  }

  return (
    <div className="settings-detail-stack" style={{ gap: "20px" }}>
      <h2 className="settings-page-title" id="settings-section-title">
        个人主页
      </h2>
      <div
        className="kk-card-box"
        style={{
          ...cardBox,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <div
            className="kk-pill-box"
            style={{
              width: "40px",
              height: "40px",
              backgroundColor: "var(--kk-bg-soft)",
              border: "1px solid var(--kk-border-control)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 600,
              fontSize: "15px",
              color: "var(--kk-text-accent)",
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            {profile.avatarInitials}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "var(--kk-text-primary)",
                }}
              >
                {profile.displayName}
              </span>
              <span
                className="kk-pill-box"
                style={{
                  fontSize: "12px",
                  padding: "1px 6px",
                  backgroundColor: "var(--kk-bg-soft)",
                  color: "var(--kk-text-accent)",
                }}
              >
                本地登录
              </span>
            </div>
            <p
              style={{
                fontSize: "12px",
                color: "var(--kk-text-secondary)",
                margin: "3px 0 12px",
              }}
            >
              资料保存在本机；可随时改显示名。云端账号后续版本再接。
            </p>
            <label className="settings-field">
              显示名
              <input
                value={draftName}
                maxLength={40}
                onChange={(event) => {
                  setDraftName(event.target.value);
                  setSavedHint(null);
                }}
              />
            </label>
            <label className="settings-field">
              简介（可选）
              <input
                value={draftBio}
                maxLength={280}
                placeholder="写一句本机备注"
                onChange={(event) => {
                  setDraftBio(event.target.value);
                  setSavedHint(null);
                }}
              />
            </label>
            <div className="settings-action-group">
              <button
                type="button"
                className="settings-action secondary"
                disabled={!dirty}
                onClick={saveProfile}
              >
                保存到本机
              </button>
              {savedHint && (
                <span role="status" className="settings-section-intro">
                  {savedHint}
                </span>
              )}
            </div>
          </div>
        </div>
        {showCloud && (
          <button
            type="button"
            className="settings-action secondary"
            style={{ height: "var(--kk-control-h-md)" }}
            onClick={() =>
              alert("云端协作将于后续版本开放；当前请继续使用本地登录。")
            }
          >
            连接云端账号
          </button>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "10px",
        }}
      >
        {[
          {
            label: "累计消耗 Token",
            val: kpis.totalTokens.toLocaleString(),
            sub: `今日: ${kpis.todayTokens.toLocaleString()}`,
            color: "var(--kk-text-accent)",
          },
          {
            label: "输入 Prompt Tokens",
            val: kpis.promptTokens.toLocaleString(),
            sub: `占比 ${kpis.totalTokens ? Math.round((kpis.promptTokens / kpis.totalTokens) * 100) : 0}%`,
            color: "var(--kk-text-secondary)",
          },
          {
            label: "输出 Completion Tokens",
            val: kpis.completionTokens.toLocaleString(),
            sub: `占比 ${kpis.totalTokens ? Math.round((kpis.completionTokens / kpis.totalTokens) * 100) : 0}%`,
            color: "var(--kk-text-secondary)",
          },
          {
            label: "模型请求总频次",
            val: `${kpis.totalRequests.toLocaleString()} 次`,
            sub: "本机记录",
            color: "var(--kk-success)",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="kk-card-box"
            style={{
              padding: "12px 14px",
              backgroundColor: "var(--kk-bg-card)",
              border: "1px solid var(--kk-border-subtle)",
            }}
          >
            <span
              style={{ fontSize: "12px", color: "var(--kk-text-secondary)" }}
            >
              {item.label}
            </span>
            <div
              style={{
                fontSize: "20px",
                fontWeight: 700,
                color: "var(--kk-text-primary)",
                marginTop: "4px",
              }}
            >
              {item.val}
            </div>
            <span
              style={{
                fontSize: "12px",
                color: item.color,
                marginTop: "2px",
                display: "block",
              }}
            >
              {item.sub}
            </span>
          </div>
        ))}
      </div>

      <ProfileUsageChart
        dailyData={dailyData}
        hoveredDay={hoveredDay}
        setHoveredDay={setHoveredDay}
        daysRange={daysRange}
        setDaysRange={setDaysRange}
      />

      <ProfileModelBreakdownCard
        modelEntries={modelEntries}
        totalModelTokens={totalModelTokens}
      />
      <ProfileRecentRecordsCard recentRecords={recentRecords} />
    </div>
  );
}
