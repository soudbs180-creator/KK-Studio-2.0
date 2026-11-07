import type { CSSProperties } from "react";
import { isTauri } from "@tauri-apps/api/core";

const cardStyle: CSSProperties = {
  backgroundColor: "var(--kk-bg-card)",
  border: "1px solid var(--kk-border-subtle)",
  padding: "16px 20px",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

export default function SecuritySettings() {
  const isDesktop = isTauri();

  return (
    <div className="settings-detail-stack" style={{ gap: "16px" }}>
      <div className="kk-card-box" style={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--kk-text-primary)",
            }}
          >
            模型密钥存储
          </span>
          <span
            className="kk-pill-box"
            style={{
              fontSize: "12px",
              padding: "2px 8px",
              backgroundColor: "var(--kk-bg-soft)",
              color: "var(--kk-text-accent)",
              border: "1px solid var(--kk-border-subtle)",
            }}
          >
            {isDesktop ? "系统安全凭据库" : "本地会话加密沙盒"}
          </span>
        </div>
        <p
          style={{
            fontSize: "12px",
            color: "var(--kk-text-secondary)",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          模型连接与 API Key 在「核心功能 -
          模型接入」中管理。所有密钥均在操作系统物理凭据库或会话内存中隔离保护，绝不随项目导出，亦不会上传任何非指定接口。
        </p>
      </div>

      <div className="kk-card-box" style={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--kk-text-primary)",
            }}
          >
            账号与数据安全
          </span>
          <span
            className="kk-pill-box"
            style={{
              fontSize: "12px",
              padding: "2px 8px",
              backgroundColor: "var(--kk-bg-soft)",
              color: "var(--kk-success)",
              border: "1px solid var(--kk-border-subtle)",
            }}
          >
            本地离线安全运行
          </span>
        </div>
        <p
          style={{
            fontSize: "12px",
            color: "var(--kk-text-secondary)",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          当前以本地离线模式运行，所有工作区资产、创作画布和提示词均保存在当前设备磁盘中。云端端到端加密同步服务开放后，需经二次安全确认方可启用。
        </p>
      </div>

      <div className="kk-card-box" style={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--kk-text-primary)",
            }}
          >
            扩展与运行时权限
          </span>
          <span
            className="kk-pill-box"
            style={{
              fontSize: "12px",
              padding: "2px 8px",
              backgroundColor: "var(--kk-bg-soft)",
              color: "var(--kk-text-primary)",
              border: "1px solid var(--kk-border-subtle)",
            }}
          >
            细粒度逐项授权
          </span>
        </div>
        <p
          style={{
            fontSize: "12px",
            color: "var(--kk-text-secondary)",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          外部 MCP Server、Skill 扩展与本地原生 CLI
          执行均受安全沙盒监管，涉及读写本地磁盘或系统命令的操作在执行前会明确提示权限确认。
        </p>
      </div>
    </div>
  );
}
