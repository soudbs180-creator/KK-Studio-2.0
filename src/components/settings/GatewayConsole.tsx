import { useMemo, useState, useSyncExternalStore } from "react";
import { PrivacyMask } from "../../domain/privacyMask.ts";
import {
  isRoutingMode,
  rankAccounts,
  readGatewayPreferences,
  routeIntent,
  writeGatewayPreferences,
  type RoutedAccount,
  type RoutingMode,
} from "../../features/ai-gateway/index.ts";
import { readProviderConnections } from "../../integrations/providers/providerStore.ts";
import { Badge, Button, Input, Select } from "../ui";
import { Textarea } from "../ui/Input.tsx";

const MODES: Array<{ value: RoutingMode; label: string }> = [
  { value: "smart", label: "临期优先" },
  { value: "order", label: "主备顺序" },
  { value: "rotate", label: "轮询" },
  { value: "usage", label: "低用量" },
  { value: "pace", label: "均摊" },
];

interface GatewayAccount extends RoutedAccount {
  name: string;
  model: string;
  channel: string;
  state: string;
}

function readGatewaySnapshot(): string {
  const prefs = readGatewayPreferences();
  const cli =
    typeof localStorage === "undefined"
      ? ""
      : (localStorage.getItem("canvas-agent-url") ?? "");
  const accounts: GatewayAccount[] = readProviderConnections().map(
    (connection, index) => ({
      id: connection.id,
      name: connection.displayName,
      model: connection.model ?? "",
      channel: connection.channel ?? connection.kind,
      state: connection.state,
      priority: connection.priority ?? index,
      remaining:
        connection.state === "disabled" || connection.state === "quarantined"
          ? 0
          : Math.max(
              1,
              connection.concurrencyLimit - (connection.activeJobs ?? 0),
            ),
      used: connection.activeJobs ?? 0,
      resetAt: connection.cooldownUntil ?? 0,
      healthy: connection.state === "active" || connection.state === "degraded",
      periodHours: 1,
    }),
  );
  if (cli)
    accounts.push({
      id: "cli-local",
      name: "本地 CLI",
      model: "",
      channel: "cli",
      state: "configured",
      priority: accounts.length,
      remaining: 1,
      used: 0,
      resetAt: 0,
      healthy: true,
      periodHours: 1,
    });
  return JSON.stringify({
    accounts,
    cli,
    mode: prefs?.mode ?? "order",
    mask: prefs ? prefs.maskOutbound : true,
    cursor: prefs?.cursor ?? 0,
  });
}

function subscribeGateway(onStoreChange: () => void): () => void {
  window.addEventListener("kk:provider-connections", onStoreChange);
  window.addEventListener("kk:gateway-preferences", onStoreChange);
  window.addEventListener("focus", onStoreChange);
  return () => {
    window.removeEventListener("kk:provider-connections", onStoreChange);
    window.removeEventListener("kk:gateway-preferences", onStoreChange);
    window.removeEventListener("focus", onStoreChange);
  };
}

export default function GatewayConsole() {
  const snapshot = useSyncExternalStore(
    subscribeGateway,
    readGatewaySnapshot,
    readGatewaySnapshot,
  );
  const parsed = JSON.parse(snapshot) as {
    accounts: GatewayAccount[];
    mode: RoutingMode;
    mask: boolean;
    cursor: number;
  };
  const [prompt, setPrompt] = useState("把这场戏排成分镜并生成画面");
  const [sample, setSample] = useState("");
  const ranked = useMemo(
    () => rankAccounts(parsed.mode, parsed.accounts, Date.now(), parsed.cursor),
    [parsed.mode, parsed.accounts, parsed.cursor],
  );
  const masked = useMemo(() => {
    const privacy = new PrivacyMask();
    return { text: privacy.mask(sample), audit: privacy.audit() };
  }, [sample]);
  function save(next: { mode?: RoutingMode; mask?: boolean }) {
    const mode = next.mode ?? parsed.mode;
    if (!isRoutingMode(mode)) return;
    writeGatewayPreferences({
      mode,
      maskOutbound: next.mask ?? parsed.mask,
      cursor: parsed.cursor,
    });
  }
  return (
    <section className="gateway-console" aria-label="本地网关">
      <h2>本地网关</h2>
      <div className="settings-detail-card">
        <div>
          <span>已配置账号</span>
          <strong>{parsed.accounts.length}</strong>
        </div>
        <div>
          <span>出站脱敏</span>
          <strong>{parsed.mask ? "开" : "关"}</strong>
        </div>
      </div>
      {parsed.accounts.length === 0 ? (
        <p>还没有已配置的官方、中转、OAuth 或本地 CLI 账号。</p>
      ) : (
        parsed.accounts.map((account) => (
          <div key={account.id} className="settings-network-row">
            <div>
              <h3 title={account.name}>{account.name}</h3>
              <p>
                {account.model || account.channel} · 剩余 {account.remaining} ·
                已用 {account.used}
              </p>
            </div>
            <Badge variant={account.healthy ? "success" : "warning"}>
              {account.healthy ? "可调度" : account.state}
            </Badge>
          </div>
        ))
      )}
      <Select
        aria-label="路由策略"
        value={parsed.mode}
        options={MODES}
        onChange={(mode) => save({ mode })}
      />
      <p>意图：{routeIntent(prompt) === "complex" ? "复杂生成" : "简单问答"}</p>
      <Input
        aria-label="本轮意图"
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
      />
      {ranked.map((id, index) => (
        <div key={id} className="settings-network-row">
          <div>
            <h3
              title={parsed.accounts.find((item) => item.id === id)?.name ?? id}
            >
              {index + 1}.{" "}
              {parsed.accounts.find((item) => item.id === id)?.name ?? id}
            </h3>
            <p>当前策略下的出站顺序</p>
          </div>
        </div>
      ))}
      <Button
        aria-pressed={parsed.mask}
        onClick={() => save({ mask: !parsed.mask })}
      >
        出站脱敏
      </Button>
      <Textarea
        aria-label="脱敏预览"
        value={sample}
        onChange={(event) => setSample(event.target.value)}
      />
      <p>脱敏后：{masked.text || "（空）"}</p>
      <p>内存审计 {masked.audit.replacements} 处，不写入磁盘。</p>
    </section>
  );
}
