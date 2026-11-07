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

import {
  cardBox,
  ProfileModelBreakdownCard,
  ProfileRecentRecordsCard,
} from "./ProfileUsageCards";
import ProfileUsageChart from "./ProfileUsageCharts";

export default function ProfileUsagePage() {
  const [daysRange, setDaysRange] = useState<7 | 14>(7);
  const [hoveredDay, setHoveredDay] = useState<DailyUsageSummary | null>(null);
  const [kpis, setKpis] = useState<UsageKpis>(getUsageKpis);
  const [dailyData, setDailyData] = useState<DailyUsageSummary[]>(() =>
    getDailySummaries(7),
  );
  const [modelBreakdown, setModelBreakdown] =
    useState<Record<string, number>>(getModelBreakdown);

  useEffect(() => {
    seedSampleUsageIfEmpty();
    const refresh = () => {
      setKpis(getUsageKpis());
      setDailyData(getDailySummaries(daysRange));
      setModelBreakdown(getModelBreakdown());
    };
    refresh();
    window.addEventListener("kk:token-usage-changed", refresh);
    return () => window.removeEventListener("kk:token-usage-changed", refresh);
  }, [daysRange]);

  const modelEntries = Object.entries(modelBreakdown).sort(
    (a, b) => b[1] - a[1],
  );
  const totalModelTokens = modelEntries.reduce((sum, [, val]) => sum + val, 0);
  const recentRecords = getUsageRecords().slice(-5).reverse();

  return (
    <div className="settings-detail-stack" style={{ gap: "20px" }}>
      <h2 className="settings-page-title" id="settings-section-title">
        个人主页
      </h2>
      {/* Profile Header */}
      <div
        className="kk-card-box"
        style={{
          ...cardBox,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
            }}
          >
            KK
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "var(--kk-text-primary)",
                }}
              >
                本地创作者
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
                本地离线模式
              </span>
            </div>
            <p
              style={{
                fontSize: "12px",
                color: "var(--kk-text-secondary)",
                margin: "3px 0 0",
              }}
            >
              数据完全保存在本机沙盒中；模型密钥与用量记录由系统本地加密保管。
            </p>
          </div>
        </div>
        <button
          type="button"
          className="settings-action secondary"
          style={{ height: "var(--kk-control-h-md)" }}
          onClick={() =>
            alert("当前处于本地无限制安全运行模式。云端协作将于后续版本开放。")
          }
        >
          连接云端账号
        </button>
      </div>

      {/* 4 KPI Cards */}
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
            sub: "连通成功率 100%",
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
