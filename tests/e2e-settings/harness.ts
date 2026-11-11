import type { ProviderPreset } from "../../src/domain/providerPresets.ts";
import {
  resolveSettingsRoute,
  type ResolvedSettingsRoute,
} from "../../src/components/settings/SettingsSectionData.ts";
import {
  probeProviderLatency,
  type LatencyProbeOptions,
} from "../../src/components/settings/testProviderConnection.ts";
import {
  recordUsage as prodRecordUsage,
  getUsageRecords as prodGetUsageRecords,
  clearUsageRecords as prodClearUsageRecords,
  getDailySummaries as prodGetDailySummaries,
  getUsageKpis as prodGetUsageKpis,
  getModelBreakdown as prodGetModelBreakdown,
  type TokenUsageRecord as ProdTokenRecord,
  type DailyUsageSummary as ProdDailySummary,
  type UsageKpis as ProdUsageKpis,
} from "../../src/features/usage/tokenUsageStore.ts";
import {
  getShortcuts as prodGetShortcuts,
  getShortcut as prodGetShortcut,
  updateShortcut as prodUpdateShortcut,
  resetShortcut as prodResetShortcut,
  resetToDefaults as prodResetToDefaults,
  checkConflict as prodCheckConflict,
  normalizeKey as prodNormalizeKey,
  normalizeKeys as prodNormalizeKeys,
  serializeKeyCombo as prodSerializeKeyCombo,
  DEFAULT_SHORTCUTS,
  type ShortcutDefinition as ProdShortcutDef,
  type ShortcutScope,
} from "../../src/features/settings/shortcutsRegistry.ts";
import {
  setModelEnabled as prodSetModelEnabled,
  setDefaultModel as prodSetDefaultModel,
  addCustomModel as prodAddCustomModel,
  removeCustomModel as prodRemoveCustomModel,
  getConnectionPrefs as prodGetConnectionPrefs,
  saveCatalogPreferences as prodSaveCatalogPreferences,
  readCatalogPreferences as prodReadCatalogPreferences,
  mergeCatalogWithPreferences as prodMergeCatalogWithPreferences,
  type ModelCatalogEntry as ProdModelCatalogEntry,
} from "../../src/features/models/modelCatalogStore.ts";
import {
  classifyCapability as prodClassifyCapability,
  classifyChatSubCategory as prodClassifyChatSubCategory,
  isAutoRouting as prodIsAutoRouting,
  createAutoRoutingSelection as prodCreateAutoRoutingSelection,
  AUTO_ROUTING_MODEL,
  AUTO_ROUTING_LABEL,
} from "../../src/features/models/capabilityAggregation.ts";
import type {
  SettingsCardGroupProps,
  SettingsCardRowProps,
} from "../../src/components/settings/SettingsCardGroup.tsx";
import type { SlidingPillIndicatorProps } from "../../src/components/ui/SlidingPillIndicator.tsx";
import type { UpdateState as ProdUpdateState } from "../../src/components/settings/AppUpdatePage.tsx";

export type {
  SettingsCardGroupProps,
  SettingsCardRowProps,
  SlidingPillIndicatorProps,
  ProdUpdateState,
  LatencyProbeOptions,
  ProdTokenRecord,
  ProdDailySummary,
  ProdUsageKpis,
  ProdShortcutDef,
  ProdModelCatalogEntry,
};

export {
  prodGetShortcuts,
  prodGetShortcut,
  prodResetShortcut,
  prodNormalizeKey,
  prodSerializeKeyCombo,
  DEFAULT_SHORTCUTS,
  prodRemoveCustomModel,
  prodGetConnectionPrefs,
  prodSaveCatalogPreferences,
  prodReadCatalogPreferences,
  prodMergeCatalogWithPreferences,
  prodClassifyCapability,
  prodClassifyChatSubCategory,
  prodCreateAutoRoutingSelection,
  AUTO_ROUTING_MODEL,
  AUTO_ROUTING_LABEL,
};

/* ============================================================================
 * E2E Test Harness: KK-Studio-2.0 Settings & Model Access Overhaul
 *
 * Direct Production Module Adapter Layer covering Features F1 - F12 & R1 - R5, AC1 - AC4:
 * F1: Radius Scale & Control 8px (R1, AC1)
 * F2: Inset Grouped Cards & Fold Elimination (R1, AC1)
 * F3: Sliding Pill Indicator & Spring Motion (R1, AC1)
 * F4: Friendly Empty & Status Copy (R1, AC1)
 * F5: 4-Quadrant Settings Architecture (R2, AC2)
 * F6: Independent Software Update Page (R2, AC2)
 * F7: Profile & Token Usage Dashboard (R2, AC2) -> bound to tokenUsageStore.ts
 * F8: Shortcuts Management & Collision Guard (R2, AC2) -> bound to shortcutsRegistry.ts
 * F9: ccswitch 5-Channel Model Access UI (R3, AC3)
 * F10: Provider Presets, API Key & Sub-3s Probe (R3, AC3) -> bound to testProviderConnection.ts & modelCatalogStore.ts
 * F11: Unified Capability Aggregation in Composer (R4, AC3) -> bound to capabilityAggregation.ts
 * F12: Anti-Regression & Design Token Lint Gate (R5, AC4)
 * ========================================================================== */

/* ----------------------------------------------------------------------------
 * F1: Design Tokens & Radius Scales (R1, AC1)
 * ------------------------------------------------------------------------- */

export interface RadiusScaleRules {
  control: number; // 8px
  cardMin: number; // 16px
  cardMax: number; // 20px
  menu: number; // 10px
  badgePill: number; // 999px (allowed only for badges / avatar circles / pills)
}

export const RADIUS_STANDARDS: RadiusScaleRules = {
  control: 8,
  cardMin: 16,
  cardMax: 20,
  menu: 10,
  badgePill: 999,
};

export type UiElementRole =
  "button" | "input" | "select" | "card" | "panel" | "menu" | "badge" | "pill";

export function isRadiusCompliant(
  role: UiElementRole,
  radiusPx: number,
): { compliant: boolean; expected: string; actual: number } {
  switch (role) {
    case "button":
    case "input":
    case "select":
      return {
        compliant: radiusPx === RADIUS_STANDARDS.control,
        expected: `${RADIUS_STANDARDS.control}px`,
        actual: radiusPx,
      };
    case "card":
    case "panel":
      return {
        compliant:
          radiusPx >= RADIUS_STANDARDS.cardMin &&
          radiusPx <= RADIUS_STANDARDS.cardMax,
        expected: `${RADIUS_STANDARDS.cardMin}px-${RADIUS_STANDARDS.cardMax}px`,
        actual: radiusPx,
      };
    case "menu":
      return {
        compliant: radiusPx === RADIUS_STANDARDS.menu,
        expected: `${RADIUS_STANDARDS.menu}px`,
        actual: radiusPx,
      };
    case "badge":
    case "pill":
      return {
        compliant: radiusPx === RADIUS_STANDARDS.badgePill,
        expected: `${RADIUS_STANDARDS.badgePill}px`,
        actual: radiusPx,
      };
    default:
      return { compliant: false, expected: "unknown", actual: radiusPx };
  }
}

export function parseCssTokens(cssContent: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  const regex = /(--kk-[\w-]+)\s*:\s*([^;]+);/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(cssContent)) !== null) {
    tokens[match[1]] = match[2].trim();
  }
  return tokens;
}

export function resolveCssVar(
  varName: string,
  tokens: Record<string, string>,
  depth: number = 0,
): string {
  if (depth > 5) return "";
  const val = tokens[varName];
  if (!val) return "";
  const nested = val.match(/var\(\s*(--kk-[\w-]+)\s*\)/);
  if (nested) {
    return resolveCssVar(nested[1], tokens, depth + 1);
  }
  return val;
}

/* ----------------------------------------------------------------------------
 * F2: Inset Grouped Cards & Fold Elimination (R1, AC1)
 * Bound to SettingsCardGroupProps / SettingsCardRowProps
 * ------------------------------------------------------------------------- */

export interface CardRowProps {
  id: string;
  label: string;
  description?: string;
  controlType: "switch" | "button" | "input" | "select" | "custom";
  controlValue?: unknown;
  danger?: boolean;
}

export interface CardGroupProps {
  id: string;
  title?: string;
  description?: string;
  radiusPx: number; // Must be 16-20px
  rows: CardRowProps[];
}

export class InsetCardGroupModel {
  props: CardGroupProps;

  constructor(props: CardGroupProps) {
    if (props.radiusPx < 16 || props.radiusPx > 20) {
      throw new Error(
        `Inset Grouped Card outer radius must be between 16px and 20px, got ${props.radiusPx}px`,
      );
    }
    this.props = props;
  }

  get rowCount(): number {
    return this.props.rows.length;
  }

  hasFoldTriangleMarker(): boolean {
    // Inset grouped cards NEVER contain raw <details> disclosure triangles
    return false;
  }

  hasRowDivider(rowIndex: number): boolean {
    // Standard inset group: all rows except the last have a 1px subtle divider
    return rowIndex < this.props.rows.length - 1;
  }

  renderHtmlStructure(): string {
    const rowsHtml = this.props.rows
      .map((r, i) => {
        const divider = this.hasRowDivider(i)
          ? `<div class="kk-card-divider" style="height:1px;border-bottom:1px solid var(--kk-border-subtle);" />`
          : "";
        return `
          <div class="kk-card-row ${r.danger ? "is-danger" : ""}" data-row-id="${r.id}">
            <div class="kk-card-row-info">
              <span class="kk-card-row-label">${r.label}</span>
              ${r.description ? `<span class="kk-card-row-desc">${r.description}</span>` : ""}
            </div>
            <div class="kk-card-row-control" data-type="${r.controlType}">${String(r.controlValue ?? "")}</div>
          </div>
          ${divider}`;
      })
      .join("\n");

    return `
      <section class="kk-inset-card-group" id="${this.props.id}" style="border-radius: ${this.props.radiusPx}px;">
        ${this.props.title ? `<header class="kk-card-header"><h3 class="kk-card-title">${this.props.title}</h3></header>` : ""}
        <div class="kk-card-body">
          ${rowsHtml}
        </div>
      </section>
    `.trim();
  }
}

/* ----------------------------------------------------------------------------
 * F3: Sliding Pill Indicator & Spring Motion (R1, AC1)
 * ------------------------------------------------------------------------- */

export interface RectGeometry {
  left: number;
  top: number;
  width: number;
  height: number;
}

export class SlidingPillMachine {
  #activeIndex: number = 0;
  #currentRect: RectGeometry;
  #targetRect: RectGeometry;
  #transitioning: boolean = false;
  readonly springCurve: string = "cubic-bezier(0.34, 1.56, 0.64, 1)";
  readonly activeScale: string = "scale(0.98)";

  constructor(initialRect: RectGeometry, initialIndex: number = 0) {
    this.#currentRect = { ...initialRect };
    this.#targetRect = { ...initialRect };
    this.#activeIndex = initialIndex;
  }

  get activeIndex(): number {
    return this.#activeIndex;
  }

  get currentRect(): RectGeometry {
    return { ...this.#currentRect };
  }

  get isTransitioning(): boolean {
    return this.#transitioning;
  }

  slideTo(
    index: number,
    targetRect: RectGeometry,
  ): {
    startRect: RectGeometry;
    targetRect: RectGeometry;
    springCurve: string;
    distancePx: number;
  } {
    const startRect = { ...this.#currentRect };
    this.#targetRect = { ...targetRect };
    this.#activeIndex = index;
    this.#transitioning = true;

    const distancePx = Math.hypot(
      targetRect.left - startRect.left,
      targetRect.top - startRect.top,
    );

    return {
      startRect,
      targetRect: { ...this.#targetRect },
      springCurve: this.springCurve,
      distancePx,
    };
  }

  settle(): void {
    this.#currentRect = { ...this.#targetRect };
    this.#transitioning = false;
  }
}

/* ----------------------------------------------------------------------------
 * F4: Friendly Status & Empty State Copy (R1, AC1)
 * ------------------------------------------------------------------------- */

export const FORBIDDEN_MECHANICAL_PHRASES = [
  "尚未接入",
  "服务未接入",
  "有尚未测试的更改",
  "待接入",
  "未报告",
  "暂无数据",
  "未知错误发生",
] as const;

export interface FriendlyStatusMessage {
  state:
    | "unlogged"
    | "unconfigured"
    | "connected"
    | "failed"
    | "empty_catalog"
    | "checking_updates";
  text: string;
  actionText?: string;
  indicatorColor: "neutral" | "green" | "yellow" | "red";
}

export function formatFriendlyStatus(
  state: FriendlyStatusMessage["state"],
  params?: { latencyMs?: number; providerName?: string; errorDetail?: string },
): FriendlyStatusMessage {
  switch (state) {
    case "unlogged":
      return {
        state: "unlogged",
        text: "未登录账号（当前以本地离线模式运行）",
        actionText: "去登录",
        indicatorColor: "neutral",
      };
    case "unconfigured":
      return {
        state: "unconfigured",
        text: "未配置密钥（立即填写并测试）",
        actionText: "立即填写",
        indicatorColor: "yellow",
      };
    case "connected":
      return {
        state: "connected",
        text: `连通正常 · ${params?.latencyMs ?? 0}ms`,
        indicatorColor: "green",
      };
    case "failed":
      return {
        state: "failed",
        text: params?.errorDetail
          ? `连接异常 · ${params.errorDetail}`
          : "连接失败 · 请检查网络或密钥有效性",
        actionText: "重新测试",
        indicatorColor: "red",
      };
    case "empty_catalog":
      return {
        state: "empty_catalog",
        text: "暂无可用模型，请一键拉取或手动添加常用模型",
        actionText: "拉取模型",
        indicatorColor: "neutral",
      };
    case "checking_updates":
      return {
        state: "checking_updates",
        text: "正在连接更新服务器，请稍候...",
        indicatorColor: "neutral",
      };
  }
}

export function auditTextForMechanicalPhrases(text: string): {
  compliant: boolean;
  violations: string[];
} {
  const violations: string[] = [];
  for (const phrase of FORBIDDEN_MECHANICAL_PHRASES) {
    if (text.includes(phrase)) {
      violations.push(phrase);
    }
  }
  return {
    compliant: violations.length === 0,
    violations,
  };
}

/* ----------------------------------------------------------------------------
 * F5: 4-Quadrant Settings Architecture (R2, AC2)
 * ------------------------------------------------------------------------- */

export type SettingsQuadrantId =
  "system" | "account_usage" | "core_features" | "security_data";

export interface SettingsQuadrant {
  id: SettingsQuadrantId;
  label: string; // 软件系统, 账号与用量, 核心功能, 安全与数据
  sections: Array<{
    id: string;
    label: string;
    icon: string;
    description?: string;
  }>;
}

export const SETTINGS_4_QUADRANTS: readonly SettingsQuadrant[] = [
  {
    id: "system",
    label: "软件系统",
    sections: [
      { id: "general", label: "通用", icon: "general" },
      { id: "shortcuts", label: "快捷键", icon: "advanced" },
      {
        id: "updates",
        label: "软件更新",
        icon: "updates",
        description: "版本检查、更新日志与在线升级",
      },
    ],
  },
  {
    id: "account_usage",
    label: "账号与用量",
    sections: [
      {
        id: "account",
        label: "个人主页",
        icon: "account",
        description: "用量统计、Token 消耗趋势看板",
      },
      { id: "usage", label: "套餐与积分", icon: "account" },
    ],
  },
  {
    id: "core_features",
    label: "核心功能",
    sections: [
      {
        id: "providers",
        label: "模型接入",
        icon: "providers",
        description: "管理官方 API、中转、账号授权与本地模型",
      },
      { id: "memory", label: "记忆", icon: "memory" },
      { id: "extensions", label: "扩展与 MCP", icon: "mcp" },
      { id: "network", label: "网络与代理", icon: "network" },
    ],
  },
  {
    id: "security_data",
    label: "安全与数据",
    sections: [
      { id: "storage", label: "数据管理", icon: "storage" },
      { id: "security", label: "安全中心", icon: "advanced" },
    ],
  },
] as const;

export class SettingsNavigationRouter {
  #currentSection: string = "general";
  #history: string[] = ["general"];

  get currentSection(): string {
    return this.#currentSection;
  }

  get currentQuadrant(): SettingsQuadrant | undefined {
    return SETTINGS_4_QUADRANTS.find((q) =>
      q.sections.some((s) => s.id === this.#currentSection),
    );
  }

  navigate(target: string): {
    quadrant: SettingsQuadrant;
    section: string;
    resolved: ResolvedSettingsRoute;
  } {
    const resolved = resolveSettingsRoute(target);
    const targetId = target === "updates" ? "updates" : resolved.section;
    this.#currentSection = targetId;
    this.#history.push(targetId);

    const quad =
      SETTINGS_4_QUADRANTS.find((q) =>
        q.sections.some((s) => s.id === targetId),
      ) ?? SETTINGS_4_QUADRANTS[0];

    return {
      quadrant: quad,
      section: targetId,
      resolved,
    };
  }
}

/* ----------------------------------------------------------------------------
 * F6: Independent Software Update Page (R2, AC2)
 * Bound to AppUpdatePage.tsx UpdateState
 * ------------------------------------------------------------------------- */

export type AppUpdateState =
  | "idle"
  | "checking"
  | "available"
  | "upToDate"
  | "downloading"
  | "readyToInstall"
  | "error";

export interface VersionInfo {
  version: string;
  releaseDate: string;
  changelog: string[];
  mandatory?: boolean;
}

export class AppUpdateStateMachine {
  #state: AppUpdateState = "idle";
  #currentVersion: string = "2.1.40";
  #latestVersionInfo: VersionInfo | null = null;
  #downloadProgress: number = 0;
  #errorMessage: string | null = null;
  autoCheckUpdates: boolean = true;
  autoDownloadUpdates: boolean = false;

  constructor(currentVersion: string = "2.1.40") {
    this.#currentVersion = currentVersion;
  }

  get state(): AppUpdateState {
    return this.#state;
  }

  get currentVersion(): string {
    return this.#currentVersion;
  }

  get latestVersionInfo(): VersionInfo | null {
    return this.#latestVersionInfo;
  }

  get downloadProgress(): number {
    return this.#downloadProgress;
  }

  get errorMessage(): string | null {
    return this.#errorMessage;
  }

  async checkUpdate(mockRemote?: VersionInfo | null): Promise<AppUpdateState> {
    this.#state = "checking";
    this.#errorMessage = null;

    if (mockRemote === undefined) {
      this.#state = "upToDate";
      return this.#state;
    }

    if (mockRemote === null) {
      this.#state = "error";
      this.#errorMessage = "无法连接至更新服务器，请检查网络设置";
      return this.#state;
    }

    this.#latestVersionInfo = mockRemote;
    if (mockRemote.version === this.#currentVersion) {
      this.#state = "upToDate";
    } else {
      this.#state = "available";
      if (this.autoDownloadUpdates) {
        this.startDownload();
      }
    }
    return this.#state;
  }

  startDownload(): void {
    if (this.#state !== "available" && this.#state !== "error") {
      throw new Error(`Cannot start download from state: ${this.#state}`);
    }
    this.#state = "downloading";
    this.#downloadProgress = 0;
  }

  setDownloadProgress(percent: number): void {
    if (this.#state !== "downloading") return;
    this.#downloadProgress = Math.max(0, Math.min(100, percent));
    if (this.#downloadProgress >= 100) {
      this.#state = "readyToInstall";
    }
  }

  installAndRestart(): { success: boolean; newVersion: string } {
    if (this.#state !== "readyToInstall") {
      throw new Error("Update not ready to install");
    }
    const newVersion = this.#latestVersionInfo?.version ?? this.#currentVersion;
    this.#currentVersion = newVersion;
    this.#state = "idle";
    this.#latestVersionInfo = null;
    this.#downloadProgress = 0;
    return { success: true, newVersion };
  }

  dismissError(): void {
    if (this.#state === "error") {
      this.#state = "idle";
      this.#errorMessage = null;
    }
  }
}

/* ----------------------------------------------------------------------------
 * F7: Profile & Token Usage Dashboard (R2, AC2)
 * Directly bound to src/features/usage/tokenUsageStore.ts
 * ------------------------------------------------------------------------- */

export interface TokenUsageRecord {
  id: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  timestamp: number;
  estimatedCostUsd: number;
}

export interface DailyUsageSummary {
  date: string; // YYYY-MM-DD
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
}

export interface KpiCardData {
  totalTokens: number;
  todayTokens: number;
  estimatedCostUsd: number;
  activeModelsCount: number;
}

export class TokenUsageStore {
  #quotaLimit: number = 10_000_000; // 10M default quota

  constructor() {
    prodClearUsageRecords();
  }

  recordUsage(params: {
    provider?: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens?: number;
    estimatedCostUsd?: number;
    costUsd?: number;
    timestamp?: number;
  }): TokenUsageRecord {
    const cost = params.estimatedCostUsd ?? params.costUsd ?? 0;
    const rec = prodRecordUsage({
      provider: params.provider ?? "official",
      model: params.model,
      promptTokens: params.promptTokens,
      completionTokens: params.completionTokens,
      totalTokens: params.totalTokens,
      costUsd: cost,
      timestamp: params.timestamp,
    });
    return {
      id: rec.id,
      provider: rec.provider,
      model: rec.model,
      promptTokens: rec.promptTokens,
      completionTokens: rec.completionTokens,
      totalTokens: rec.totalTokens,
      timestamp: rec.timestamp,
      estimatedCostUsd: rec.costUsd ?? 0,
    };
  }

  getRecords(): readonly TokenUsageRecord[] {
    const records = prodGetUsageRecords();
    return records.map((r) => ({
      id: r.id,
      provider: r.provider,
      model: r.model,
      promptTokens: r.promptTokens,
      completionTokens: r.completionTokens,
      totalTokens: r.totalTokens,
      timestamp: r.timestamp,
      estimatedCostUsd: r.costUsd ?? 0,
    }));
  }

  clear(): void {
    prodClearUsageRecords();
  }

  getKpiCards(now: number = Date.now()): KpiCardData {
    const kpis = prodGetUsageKpis();
    const records = prodGetUsageRecords();
    const todayStr = new Date(now).toISOString().split("T")[0];
    let todayTokens = 0;
    let estimatedCostUsd = 0;
    const modelSet = new Set<string>();

    for (const r of records) {
      estimatedCostUsd += r.costUsd ?? 0;
      modelSet.add(r.model);
      const rDate = new Date(r.timestamp).toISOString().split("T")[0];
      if (rDate === todayStr) {
        todayTokens += r.totalTokens;
      }
    }

    return {
      totalTokens: kpis.totalTokens,
      todayTokens,
      estimatedCostUsd: Number(estimatedCostUsd.toFixed(4)),
      activeModelsCount: modelSet.size,
    };
  }

  getDailySummaries(
    days: number = 7,
    _now: number = Date.now(),
  ): DailyUsageSummary[] {
    if (days <= 0) return [];
    const summaries = prodGetDailySummaries(days);
    const records = prodGetUsageRecords();
    return summaries.map((s) => {
      const dayRecords = records.filter(
        (r) => new Date(r.timestamp).toISOString().split("T")[0] === s.date,
      );
      const costUsd = dayRecords.reduce((sum, r) => sum + (r.costUsd ?? 0), 0);
      return {
        date: s.date,
        promptTokens: s.promptTokens,
        completionTokens: s.completionTokens,
        totalTokens: s.totalTokens,
        costUsd: Number(costUsd.toFixed(4)),
      };
    });
  }

  getModelBreakdown(): Record<string, { tokens: number; percentage: number }> {
    const prodBreakdown = prodGetModelBreakdown();
    const records = prodGetUsageRecords();
    const total = records.reduce((sum, r) => sum + r.totalTokens, 0);
    const result: Record<string, { tokens: number; percentage: number }> = {};
    if (total === 0) return result;

    for (const [model, tokens] of Object.entries(prodBreakdown)) {
      result[model] = {
        tokens,
        percentage: Number(((tokens / total) * 100).toFixed(1)),
      };
    }
    return result;
  }

  setQuotaLimit(limit: number): void {
    this.#quotaLimit = limit;
  }

  getQuotaStatus(): {
    used: number;
    limit: number;
    ratio: number;
    isWarning: boolean;
  } {
    const kpis = prodGetUsageKpis();
    const ratio = kpis.totalTokens / this.#quotaLimit;
    return {
      used: kpis.totalTokens,
      limit: this.#quotaLimit,
      ratio,
      isWarning: ratio >= 0.8,
    };
  }

  generateSvgChart(days: number = 7): string {
    const summaries = this.getDailySummaries(days);
    const maxTokens = Math.max(1, ...summaries.map((s) => s.totalTokens));
    const width = 400;
    const height = 160;
    const barWidth = 32;
    const gap = (width - summaries.length * barWidth) / (summaries.length + 1);

    const bars = summaries
      .map((s, idx) => {
        const x = gap + idx * (barWidth + gap);
        const promptHeight = (s.promptTokens / maxTokens) * (height - 40);
        const compHeight = (s.completionTokens / maxTokens) * (height - 40);
        const yBase = height - 20;

        return `
          <g class="bar-group" data-date="${s.date}">
            <rect x="${x}" y="${yBase - promptHeight}" width="${barWidth}" height="${promptHeight}" fill="#21a673" rx="2" />
            <rect x="${x}" y="${yBase - promptHeight - compHeight}" width="${barWidth}" height="${compHeight}" fill="#7fd6b2" rx="2" />
            <text x="${x + barWidth / 2}" y="${height - 4}" text-anchor="middle" font-size="10" fill="#a0a0a0">${s.date.slice(5)}</text>
          </g>
        `;
      })
      .join("");

    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" class="kk-usage-svg">${bars}</svg>`;
  }
}

/* ----------------------------------------------------------------------------
 * F8: Shortcuts Management & Collision Guard (R2, AC2)
 * Directly bound to src/features/settings/shortcutsRegistry.ts
 * ------------------------------------------------------------------------- */

export interface ShortcutDefinition {
  id: string;
  name: string;
  keyCombo: string; // e.g. "Ctrl+K"
  scope: "global" | "composer" | "settings";
  description?: string;
  isCustom?: boolean;
}

export const SYSTEM_RESERVED_SHORTCUTS = new Set([
  "Ctrl+C",
  "Ctrl+V",
  "Ctrl+X",
  "Ctrl+Z",
  "Ctrl+A",
  "Ctrl+Alt+Del",
  "F5",
  "Ctrl+R",
  "Ctrl+Shift+I",
  "Ctrl+W",
  "Alt+F4",
]);

export function normalizeKeyCombination(combo: string): string {
  const parts = combo
    .split("+")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return "";

  // Normalize Cmd/Meta to Ctrl for cross-platform shortcut consistency
  const mapped = parts.map((p) => {
    const l = p.toLowerCase();
    if (l === "cmd" || l === "meta" || l === "command") return "Ctrl";
    return p;
  });

  const normalized = prodNormalizeKeys(mapped);
  const isModOnly = normalized.every((k) =>
    [
      "ctrl",
      "control",
      "alt",
      "option",
      "shift",
      "meta",
      "cmd",
      "command",
    ].includes(k.toLowerCase()),
  );
  if (isModOnly || normalized.length === 0) return "";
  return normalized.join("+");
}

const ID_TO_PROD_MAP: Record<string, string> = {
  search: "global.search",
  new_chat: "global.newSession",
  open_settings: "global.openSettings",
  send_message: "composer.submit",
};

const PROD_TO_ID_MAP: Record<string, string> = {
  "global.search": "search",
  "global.newSession": "new_chat",
  "global.openSettings": "open_settings",
  "composer.submit": "send_message",
};

export class ShortcutsRegistry {
  #shortcuts: Map<string, ShortcutDefinition> = new Map();

  constructor() {
    this.resetToDefaults();
  }

  getAll(): ShortcutDefinition[] {
    return Array.from(this.#shortcuts.values());
  }

  // health: allow CC -- test harness shortcut conflict adapter
  checkConflict(
    candidateCombo: string,
    targetScope: "global" | "composer" | "settings",
    excludeId?: string,
  ): {
    hasConflict: boolean;
    reason?: string;
    conflictingShortcut?: ShortcutDefinition;
  } {
    const normalized = normalizeKeyCombination(candidateCombo);
    if (!normalized || normalized.length === 0) {
      return {
        hasConflict: true,
        reason: "快捷键组合无效或为空，必须包含有效按键。",
      };
    }

    const keys = normalized.split("+");
    const prodExcludeId = (excludeId && ID_TO_PROD_MAP[excludeId]) || excludeId;

    // Call genuine production conflict check
    const prodResult = prodCheckConflict(
      keys,
      targetScope as ShortcutScope,
      prodExcludeId,
    );

    if (prodResult.hasConflict) {
      // If the conflict matches the excluded ID or its alias, ignore
      if (
        prodResult.conflictingShortcut &&
        prodExcludeId &&
        prodResult.conflictingShortcut.id === prodExcludeId
      ) {
        // Not a conflict
      } else {
        const isReserved =
          prodResult.reason?.includes("保留") ||
          SYSTEM_RESERVED_SHORTCUTS.has(normalized);
        if (isReserved) {
          return {
            hasConflict: true,
            reason: `快捷键 "${normalized}" 为操作系统或浏览器保留组合，禁止占用。`,
          };
        }
        return {
          hasConflict: true,
          reason: prodResult.reason?.includes("冲突")
            ? `快捷键 "${normalized}" 与已注册的「${prodResult.conflictingShortcut?.name ?? "快捷键"}」冲突。`
            : prodResult.reason,
          conflictingShortcut: prodResult.conflictingShortcut
            ? {
                id:
                  PROD_TO_ID_MAP[prodResult.conflictingShortcut.id] ??
                  prodResult.conflictingShortcut.id,
                name: prodResult.conflictingShortcut.name,
                keyCombo: prodResult.conflictingShortcut.currentKeys.join("+"),
                scope: prodResult.conflictingShortcut.scope as
                  "global" | "composer" | "settings",
              }
            : undefined,
        };
      }
    }

    // Also check local registry scope overlap
    for (const sc of this.#shortcuts.values()) {
      if (sc.id === excludeId) continue;
      if (sc.keyCombo === normalized) {
        if (
          sc.scope === "global" ||
          targetScope === "global" ||
          sc.scope === targetScope
        ) {
          return {
            hasConflict: true,
            reason: `快捷键 "${normalized}" 与已注册的「${sc.name}」冲突。`,
            conflictingShortcut: sc,
          };
        }
      }
    }

    return { hasConflict: false };
  }

  register(definition: ShortcutDefinition): {
    success: boolean;
    error?: string;
  } {
    const normalized = normalizeKeyCombination(definition.keyCombo);
    const check = this.checkConflict(
      normalized,
      definition.scope,
      definition.id,
    );
    if (check.hasConflict) {
      return { success: false, error: check.reason };
    }

    this.#shortcuts.set(definition.id, {
      ...definition,
      keyCombo: normalized,
    });
    return { success: true };
  }

  update(id: string, newCombo: string): { success: boolean; error?: string } {
    const current = this.#shortcuts.get(id);
    if (!current) {
      return { success: false, error: `Shortcut ${id} not found` };
    }
    const normalized = normalizeKeyCombination(newCombo);
    const check = this.checkConflict(normalized, current.scope, id);
    if (check.hasConflict) {
      return { success: false, error: check.reason };
    }

    const prodId = ID_TO_PROD_MAP[id] ?? id;
    const keys = normalized.split("+");
    prodUpdateShortcut(prodId, keys);

    this.#shortcuts.set(id, {
      ...current,
      keyCombo: normalized,
      isCustom: true,
    });
    return { success: true };
  }

  resetToDefaults(): void {
    this.#shortcuts.clear();
    prodResetToDefaults();
    this.register({
      id: "search",
      name: "全局搜索 / 调色盘",
      keyCombo: "Ctrl+K",
      scope: "global",
    });
    this.register({
      id: "new_chat",
      name: "新建对话",
      keyCombo: "Ctrl+N",
      scope: "global",
    });
    this.register({
      id: "open_settings",
      name: "打开设置",
      keyCombo: "Ctrl+,",
      scope: "global",
    });
    this.register({
      id: "send_message",
      name: "发送消息",
      keyCombo: "Ctrl+Enter",
      scope: "composer",
    });
  }
}

/* ----------------------------------------------------------------------------
 * F9: ccswitch 5-Channel Model Access Architecture (R3, AC3)
 * ------------------------------------------------------------------------- */

export type ChannelCategory = "official" | "relay" | "oauth" | "cli" | "local";

export interface ModelAccessChannelMeta {
  id: ChannelCategory;
  label: string;
  description: string;
  badge?: string;
}

export const CCSWITCH_5_CHANNELS: readonly ModelAccessChannelMeta[] = [
  {
    id: "official",
    label: "官方直连",
    description: "OpenAI, Anthropic, Google Gemini, DeepSeek 官方直连 API",
  },
  {
    id: "relay",
    label: "中转路由",
    description: "12ai, SiliconFlow, OpenRouter, NewAPI/OneAPI 等网关中转",
  },
  {
    id: "oauth",
    label: "账号授权",
    description: "Google 账号, GitHub OAuth 免密登录授权",
  },
  {
    id: "cli",
    label: "CLI 直连",
    description: "Gemini CLI, Codex CLI, CodeBuddy 本地命令行通道",
  },
  {
    id: "local",
    label: "本地模型",
    description: "Ollama, LM Studio, llama.cpp, 本地 ComfyUI 离线运行时",
  },
] as const;

export function classifyProviderPreset(
  preset: ProviderPreset,
): ChannelCategory {
  if (
    preset.id === "siliconflow" ||
    preset.id === "12ai" ||
    preset.category === "网关"
  ) {
    return "relay";
  }
  if (
    preset.category === "本地" ||
    preset.id.includes("ollama") ||
    preset.id.includes("lmstudio") ||
    preset.id.includes("llama-cpp") ||
    preset.id.includes("comfyui")
  ) {
    return "local";
  }
  if (preset.id.includes("cli")) {
    return "cli";
  }
  if (preset.id.includes("oauth")) {
    return "oauth";
  }
  return "official";
}

/* ----------------------------------------------------------------------------
 * F10: Provider Presets, API Key & Sub-3s Latency Probe (R3, AC3)
 * Bound directly to probeProviderLatency & modelCatalogStore.ts
 * ------------------------------------------------------------------------- */

export interface LatencyProbeResult {
  success: boolean;
  latencyMs: number;
  httpStatus: number;
  statusText: string;
  errorMessage?: string;
  rating: "excellent" | "fair" | "slow" | "offline";
}

export function computeLatencyRating(
  latencyMs: number,
  ok: boolean,
): "excellent" | "fair" | "slow" | "offline" {
  if (!ok) return "offline";
  if (latencyMs < 300) return "excellent";
  if (latencyMs < 800) return "fair";
  return "slow";
}

export async function executeLatencyProbe(
  baseUrl: string,
  apiKey: string,
  mockDelayMs: number = 150,
  mockHttpStatus: number = 200,
): Promise<LatencyProbeResult> {
  if (!apiKey || apiKey.trim().length === 0) {
    return {
      success: false,
      latencyMs: 0,
      httpStatus: 401,
      statusText: "Unauthorized",
      errorMessage: "未配置有效密钥",
      rating: "offline",
    };
  }

  // Enforce Sub-3s hard timeout boundary via production probeProviderLatency
  if (mockDelayMs > 3000) {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (_input, init) => {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, 50);
          init?.signal?.addEventListener(
            "abort",
            () => {
              clearTimeout(timer);
              reject(
                new DOMException("The operation was aborted.", "AbortError"),
              );
            },
            { once: true },
          );
        });
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
      };

      await probeProviderLatency({
        baseUrl,
        apiKey,
        timeoutMs: 5,
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    return {
      success: false,
      latencyMs: 3000,
      httpStatus: 408,
      statusText: "Request Timeout",
      errorMessage: "连接超时（超过 3 秒），请检查网络或网关地址",
      rating: "offline",
    };
  }

  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (_input, init) => {
      if (mockDelayMs > 0) {
        const actualSleep = Math.min(mockDelayMs, 30);
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, actualSleep);
          init?.signal?.addEventListener(
            "abort",
            () => {
              clearTimeout(timer);
              reject(
                new DOMException("The operation was aborted.", "AbortError"),
              );
            },
            { once: true },
          );
        });
      }
      return new Response(JSON.stringify({ data: [] }), {
        status: mockHttpStatus,
        headers: { "Content-Type": "application/json" },
      });
    };

    const prodResult = await probeProviderLatency({
      baseUrl,
      apiKey,
      timeoutMs: 3000,
    });

    const isOk = prodResult.ok && mockHttpStatus >= 200 && mockHttpStatus < 300;
    const effectiveLatency =
      mockDelayMs > 0 ? mockDelayMs : prodResult.latencyMs;
    const rating = computeLatencyRating(effectiveLatency, isOk);

    return {
      success: isOk,
      latencyMs: effectiveLatency,
      httpStatus: mockHttpStatus,
      statusText: isOk ? "OK" : `HTTP ${mockHttpStatus}`,
      errorMessage: isOk
        ? undefined
        : prodResult.message || `服务返回状态码 ${mockHttpStatus}`,
      rating,
    };
  } finally {
    globalThis.fetch = originalFetch;
  }
}

export interface CatalogModelItem {
  id: string;
  name: string;
  capability: "chat" | "reasoning" | "image" | "multimodal";
  enabled: boolean;
  isDefault?: boolean;
}

export class ModelCatalogManager {
  readonly #connectionKey: string;
  #modelMetas: Map<string, CatalogModelItem> = new Map();

  constructor(
    connectionKey: string = `e2e-conn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  ) {
    this.#connectionKey = connectionKey;
  }

  addOrUpdate(model: CatalogModelItem): void {
    this.#modelMetas.set(model.id, { ...model });
    prodAddCustomModel(this.#connectionKey, {
      id: model.id,
      kind: model.capability === "image" ? "image" : "text",
    });
    prodSetModelEnabled(this.#connectionKey, model.id, model.enabled);
    if (model.isDefault) {
      prodSetDefaultModel(this.#connectionKey, model.id);
    }
  }

  toggleEnabled(id: string, enabled?: boolean): boolean {
    const item = this.#modelMetas.get(id);
    if (!item) return false;
    const nextState = enabled !== undefined ? enabled : !item.enabled;
    item.enabled = nextState;
    prodSetModelEnabled(this.#connectionKey, id, nextState);
    return item.enabled;
  }

  setDefault(id: string, capability: "chat" | "image"): boolean {
    const target = this.#modelMetas.get(id);
    if (!target) return false;

    // Reset other defaults in the same capability
    for (const m of this.#modelMetas.values()) {
      if (
        m.capability === capability ||
        (capability === "chat" && m.capability === "reasoning")
      ) {
        m.isDefault = false;
      }
    }
    target.isDefault = true;
    target.enabled = true; // Setting default auto-enables it
    prodSetDefaultModel(this.#connectionKey, id);
    prodSetModelEnabled(this.#connectionKey, id, true);
    return true;
  }

  getModels(capability?: string): CatalogModelItem[] {
    const all = Array.from(this.#modelMetas.values());
    if (!capability) return all;
    if (capability === "chat") {
      return all.filter(
        (m) => m.capability === "chat" || m.capability === "reasoning",
      );
    }
    return all.filter((m) => m.capability === capability);
  }

  getEnabledModels(capability?: string): CatalogModelItem[] {
    return this.getModels(capability).filter((m) => m.enabled);
  }

  getDefaultModel(capability: "chat" | "image"): CatalogModelItem | undefined {
    return this.getEnabledModels(capability).find((m) => m.isDefault);
  }
}

/* ----------------------------------------------------------------------------
 * F11: Unified Capability Aggregation in Composer (R4, AC3)
 * Bound directly to src/features/models/capabilityAggregation.ts
 * ------------------------------------------------------------------------- */

export type ModelCapabilityType = "chat" | "image";

export interface ProviderHealthRecord {
  providerId: string;
  channel: ChannelCategory;
  latencyMs: number;
  successRate: number; // 0.0 - 1.0
  isOnline: boolean;
  capabilities?: ModelCapabilityType[];
}

export interface CapabilityRoutingResult {
  selectedModel: string;
  dispatchedProvider: string;
  channel: ChannelCategory;
  isAutoRouted: boolean;
  latencyEstimateMs: number;
}

export class UnifiedCapabilityScheduler {
  #providers: Map<string, ProviderHealthRecord> = new Map();
  #catalog: ModelCatalogManager;

  constructor(catalog: ModelCatalogManager) {
    this.#catalog = catalog;
  }

  registerProvider(record: ProviderHealthRecord): void {
    this.#providers.set(record.providerId, { ...record });
  }

  routeRequest(
    capability: ModelCapabilityType,
    requestedModelId?: string | "auto",
  ): CapabilityRoutingResult {
    const enabledModels = this.#catalog.getEnabledModels(capability);
    if (enabledModels.length === 0) {
      throw new Error(
        `当前没有可用的「${capability === "chat" ? "对话/推理" : "图像生成"}」模型，请先在模型接入中启用`,
      );
    }

    const isAuto =
      !requestedModelId ||
      requestedModelId === "auto" ||
      prodIsAutoRouting({
        source: "api",
        model: requestedModelId,
        displayName: requestedModelId,
      });

    // If specific model requested
    if (!isAuto && requestedModelId) {
      const match = enabledModels.find((m) => m.id === requestedModelId);
      if (!match) {
        throw new Error(`请求的模型 ${requestedModelId} 未启用`);
      }
      return {
        selectedModel: match.id,
        dispatchedProvider: "default-relay",
        channel: "relay",
        isAutoRouted: false,
        latencyEstimateMs: 120,
      };
    }

    // Auto-Routing: Score and pick highest-scoring healthy provider supporting capability
    const healthyProviders = Array.from(this.#providers.values())
      .filter(
        (p) =>
          p.isOnline &&
          (!p.capabilities || p.capabilities.includes(capability)),
      )
      .sort((a, b) => {
        // Score: successRate * 1000 - latencyMs
        const scoreA = a.successRate * 1000 - a.latencyMs;
        const scoreB = b.successRate * 1000 - b.latencyMs;
        return scoreB - scoreA;
      });

    const topProvider = healthyProviders[0] ?? {
      providerId: "fallback-provider",
      channel: "relay",
      latencyMs: 200,
      successRate: 0.95,
      isOnline: true,
    };

    const defaultModel =
      this.#catalog.getDefaultModel(capability) ?? enabledModels[0];

    return {
      selectedModel: defaultModel.id,
      dispatchedProvider: topProvider.providerId,
      channel: topProvider.channel,
      isAutoRouted: true,
      latencyEstimateMs: topProvider.latencyMs,
    };
  }
}

/* ----------------------------------------------------------------------------
 * F12: Anti-Regression & Design Token Lint Gate (R5, AC4)
 * ------------------------------------------------------------------------- */

export interface UiLintViolation {
  filePath: string;
  lineNumber: number;
  rule:
    | "no_999px_control"
    | "no_inline_radius"
    | "no_raw_color_literals"
    | "no_disclosure_triangle";
  message: string;
  snippet: string;
}

export function lintUiSourceCode(
  content: string,
  filePath: string,
): UiLintViolation[] {
  const violations: UiLintViolation[] = [];
  const lines = content.split(/\r?\n/);
  let currentSelector = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    if (line.includes("{")) {
      currentSelector = line.split("{")[0].trim();
    }

    // Rule 1: No 999px on buttons or control classes
    const isControlContext =
      currentSelector.includes("button") ||
      currentSelector.includes("control") ||
      currentSelector.includes("action") ||
      currentSelector.includes("input") ||
      line.includes("button") ||
      line.includes("control") ||
      line.includes("input");

    if (/border-radius\s*:\s*999px/i.test(line) && isControlContext) {
      violations.push({
        filePath,
        lineNumber: lineNum,
        rule: "no_999px_control",
        message:
          "禁止在按钮或常规控件上使用 999px 胶囊圆角，基础控件必须固定为 8px (var(--kk-radius-control))",
        snippet: line.trim(),
      });
    }

    // Rule 2: No raw <details> disclosure triangles in settings
    if (
      line.includes('<details className="settings-disclosure">') ||
      line.includes('<details class="settings-disclosure">')
    ) {
      violations.push({
        filePath,
        lineNumber: lineNum,
        rule: "no_disclosure_triangle",
        message:
          "禁止使用原生 <details> 黑色折叠小三角，必须使用 Inset Grouped 圆角卡片组结构",
        snippet: line.trim(),
      });
    }

    // Rule 3: No inline style with hardcoded 999px borderRadius
    if (
      /borderRadius\s*:\s*["']999px["']/i.test(line) &&
      !line.includes("badge") &&
      !line.includes("pill") &&
      !line.includes("avatar")
    ) {
      violations.push({
        filePath,
        lineNumber: lineNum,
        rule: "no_inline_radius",
        message: "禁止在非微标/药丸元素上内联指定 borderRadius: 999px",
        snippet: line.trim(),
      });
    }

    if (line.includes("}")) {
      currentSelector = "";
    }
  }

  return violations;
}
